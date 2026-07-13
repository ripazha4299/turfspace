const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Small helper used by other route files (bookings.js) to create a notification
// -- e.g. when someone joins or leaves an open booking, the creator gets one.
function createNotification(userId, type, message, bookingId) {
  db.prepare(
    `INSERT INTO notifications (id, user_id, type, message, booking_id) VALUES (?, ?, ?, ?, ?)`
  ).run(uuidv4(), userId, type, message, bookingId || null);
}

// GET /api/notifications -- most recent first, capped at 50
router.get('/', requireAuth, (req, res) => {
  const notifications = db.prepare(
    `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`
  ).all(req.user.id);
  const unread_count = db.prepare(
    `SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0`
  ).get(req.user.id).c;
  res.json({ notifications, unread_count });
});

// POST /api/notifications/:id/read
router.post('/:id/read', requireAuth, (req, res) => {
  const notif = db.prepare('SELECT * FROM notifications WHERE id = ?').get(req.params.id);
  if (!notif) return res.status(404).json({ error: 'Notification not found' });
  if (notif.user_id !== req.user.id) return res.status(403).json({ error: 'Not your notification' });
  db.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ?`).run(req.params.id);
  res.json({ ok: true });
});

// POST /api/notifications/read-all
router.post('/read-all', requireAuth, (req, res) => {
  db.prepare(`UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`).run(req.user.id);
  res.json({ ok: true });
});

module.exports = { router, createNotification };
