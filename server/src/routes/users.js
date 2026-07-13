const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { publicUser } = require('./auth');

const router = express.Router();

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
  const created = db.prepare(
    `SELECT b.*, t.name as turf_name, t.city as turf_city, t.sport_type
     FROM bookings b JOIN turfs t ON b.turf_id = t.id
     WHERE b.created_by = ? ORDER BY b.booking_date DESC, b.start_time DESC`
  ).all(req.user.id);

  const joined = db.prepare(
    `SELECT b.*, t.name as turf_name, t.city as turf_city, t.sport_type
     FROM booking_participants bp
     JOIN bookings b ON bp.booking_id = b.id
     JOIN turfs t ON b.turf_id = t.id
     WHERE bp.user_id = ? ORDER BY b.booking_date DESC, b.start_time DESC`
  ).all(req.user.id);

  res.json({ created, joined });
});

module.exports = router;
