const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/messages/conversations -- list of everyone the current user has
// exchanged messages with, most recent first, with a last-message preview and
// per-conversation unread count.
router.get('/conversations', requireAuth, (req, res) => {
  const partners = db.prepare(`
    SELECT other_user_id, MAX(rowid) as last_rowid FROM (
      SELECT CASE WHEN sender_id = ? THEN recipient_id ELSE sender_id END as other_user_id, rowid
      FROM messages WHERE sender_id = ? OR recipient_id = ?
    )
    GROUP BY other_user_id
    ORDER BY last_rowid DESC
  `).all(req.user.id, req.user.id, req.user.id);

  const conversations = partners.map((p) => {
    const otherUser = db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(p.other_user_id);
    const lastMessage = db.prepare(`
      SELECT content, sender_id, created_at FROM messages
      WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
      ORDER BY created_at DESC, rowid DESC LIMIT 1
    `).get(req.user.id, p.other_user_id, p.other_user_id, req.user.id);
    const unread_count = db.prepare(`
      SELECT COUNT(*) as c FROM messages WHERE sender_id = ? AND recipient_id = ? AND is_read = 0
    `).get(p.other_user_id, req.user.id).c;
    return { user: otherUser, last_message: lastMessage, unread_count };
  });

  res.json({ conversations });
});

// GET /api/messages/unread-count -- total unread across all conversations, for a nav badge
router.get('/unread-count', requireAuth, (req, res) => {
  const c = db.prepare(
    'SELECT COUNT(*) as c FROM messages WHERE recipient_id = ? AND is_read = 0'
  ).get(req.user.id).c;
  res.json({ unread_count: c });
});

// GET /api/messages/with/:userId -- full thread with one other user. Opening a
// thread marks every message they sent you as read (matches the notification
// bell's "mark read on open" convention).
router.get('/with/:userId', requireAuth, (req, res) => {
  const otherUser = db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(req.params.userId);
  if (!otherUser) return res.status(404).json({ error: 'User not found' });

  const messages = db.prepare(`
    SELECT * FROM messages
    WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
    ORDER BY created_at ASC, rowid ASC
  `).all(req.user.id, req.params.userId, req.params.userId, req.user.id);

  db.prepare(
    `UPDATE messages SET is_read = 1 WHERE sender_id = ? AND recipient_id = ? AND is_read = 0`
  ).run(req.params.userId, req.user.id);

  res.json({ other_user: otherUser, messages });
});

// POST /api/messages -- send a message to any other user (player<->owner or
// player<->player etc -- no role restriction, "let players and owners message
// each other" doesn't imply blocking same-role messaging either).
router.post('/', requireAuth, (req, res) => {
  const { recipient_id, content } = req.body;
  if (!recipient_id || !content || !content.trim()) {
    return res.status(400).json({ error: 'recipient_id and content are required' });
  }
  if (recipient_id === req.user.id) return res.status(400).json({ error: "You can't message yourself" });

  const recipient = db.prepare('SELECT id FROM users WHERE id = ?').get(recipient_id);
  if (!recipient) return res.status(404).json({ error: 'Recipient not found' });

  const id = uuidv4();
  db.prepare(
    `INSERT INTO messages (id, sender_id, recipient_id, content) VALUES (?, ?, ?, ?)`
  ).run(id, req.user.id, recipient_id, content.trim());

  const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
  res.status(201).json({ message });
});

module.exports = router;
