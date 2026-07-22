const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { publicUser } = require('./auth');

const router = express.Router();

function completePastBookings() {
  db.prepare(
    `UPDATE bookings SET status = 'completed'
     WHERE status IN ('pending_payment', 'confirmed')
       AND datetime(booking_date || ' ' || end_time) <= datetime('now')`
  ).run();
}

// GET /api/users/me
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: publicUser(user) });
});

// PUT /api/users/me  (update sport preferences / city -- basic profile per PRD Epic 6)
router.put('/me', requireAuth, (req, res) => {
  const { name, sport_preferences, city } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  db.prepare(
    `UPDATE users SET name = ?, sport_preferences = ?, city = ? WHERE id = ?`
  ).run(
    name ?? user.name,
    sport_preferences ?? user.sport_preferences,
    city ?? user.city,
    req.user.id
  );

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: publicUser(updated) });
});

// GET /api/users/me/bookings -- past booking history (P1, Solo Joiner)
router.get('/me/bookings', requireAuth, (req, res) => {
  completePastBookings();
  const parseSports = (row) => {
    try { row.turf_sports = JSON.parse(row.turf_sports || '[]'); } catch (e) { row.turf_sports = []; }
    return row;
  };

  const created = db.prepare(
    `SELECT b.*, t.name as turf_name, t.city as turf_city, t.address as turf_address,
       t.cover_image as turf_cover_image, t.sports as turf_sports
     FROM bookings b JOIN turfs t ON b.turf_id = t.id
     WHERE b.created_by = ? ORDER BY b.booking_date DESC, b.start_time DESC`
  ).all(req.user.id).map(parseSports);

  const joined = db.prepare(
    `SELECT b.*, t.name as turf_name, t.city as turf_city, t.address as turf_address,
       t.cover_image as turf_cover_image, t.sports as turf_sports,
       u.name as creator_name, u.email as creator_email
     FROM booking_participants bp
     JOIN bookings b ON bp.booking_id = b.id
     JOIN turfs t ON b.turf_id = t.id
     JOIN users u ON b.created_by = u.id
     WHERE bp.user_id = ? ORDER BY b.booking_date DESC, b.start_time DESC`
  ).all(req.user.id).map(parseSports);

  res.json({ created, joined });
});

// GET /api/users/:id/public-profile -- lets any logged-in user view another
// user's basic profile (item: "let users view each other's profile"). Deliberately
// excludes email -- that's only ever shown to someone already in a shared booking
// context (a ticket popup), not broadcast to anyone who looks someone up.
router.get('/:id/public-profile', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, name, role, city, sport_preferences FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const profile = { id: user.id, name: user.name, role: user.role, city: user.city };
  if (user.role === 'player') {
    profile.sport_preferences = user.sport_preferences;
  } else {
    profile.turfs = db.prepare(
      `SELECT id, name, city, cover_image FROM turfs WHERE owner_id = ? ORDER BY created_at DESC`
    ).all(user.id);
  }

  res.json({ profile });
});

module.exports = router;
