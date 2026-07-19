const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { OAuth2Client } = require('google-auth-library');
const db = require('../db');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function publicUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    sport_preferences: u.sport_preferences,
    city: u.city,
    no_show_count: u.no_show_count,
  };
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { name, email, password, role, sport_preferences, city } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'name, email, password, role are required' });
  }
  if (!['player', 'owner'].includes(role)) {
    return res.status(400).json({ error: "role must be 'player' or 'owner'" });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const id = uuidv4();
  const password_hash = bcrypt.hashSync(password, 10);

  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, role, sport_preferences, city)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, name, email.toLowerCase(), password_hash, role, sport_preferences || '', city || '');

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user) });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

// POST /api/auth/google -- sign in (or auto-register) via a Google ID token.
// The frontend gets this token from Google's own sign-in button/SDK and just
// forwards it here; we never see the person's Google password, only a signed
// token we verify against Google's servers.
//
// New accounts created this way default to role 'player' -- Google's one-tap
// flow doesn't have a natural place to ask "player or owner?", so an owner who
// wants to sign up via Google would need a follow-up step (not built yet) to
// change their role after the fact, or just use email/password registration
// instead for now.
router.post('/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'credential is required' });
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(500).json({ error: 'Google sign-in is not configured on this server yet' });
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid Google credential' });
  }

  if (!payload || !payload.email) {
    return res.status(401).json({ error: 'Google account has no email to sign in with' });
  }

  const email = payload.email.toLowerCase();
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!user) {
    const id = uuidv4();
    // Google-authenticated accounts have no password of their own. Store an
    // unusable random hash so the NOT NULL constraint is satisfied and
    // email+password login can never succeed for this account by coincidence.
    const password_hash = bcrypt.hashSync(uuidv4() + uuidv4(), 10);
    db.prepare(
      `INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`
    ).run(id, payload.name || email, email, password_hash, 'player');
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  }

  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

module.exports = { router, publicUser };
