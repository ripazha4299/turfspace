const { DatabaseSync } = require('node:sqlite');
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'turfspace.db');
const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('player','owner')),
  sport_preferences TEXT DEFAULT '',
  city TEXT DEFAULT '',
  no_show_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS turfs (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT DEFAULT '',
  sport_type TEXT NOT NULL,
  rate_per_hour REAL NOT NULL,
  open_time TEXT DEFAULT '06:00',
  close_time TEXT DEFAULT '23:00',
  description TEXT DEFAULT '',
  cover_image TEXT DEFAULT '',
  gallery TEXT DEFAULT '[]',
  old_price REAL,
  allow_free_booking INTEGER NOT NULL DEFAULT 0,
  allow_partial_booking INTEGER NOT NULL DEFAULT 0,
  partial_token_pct INTEGER NOT NULL DEFAULT 15,
  cancellation_fee_pct INTEGER NOT NULL DEFAULT 15,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  turf_id TEXT NOT NULL REFERENCES turfs(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_type TEXT NOT NULL CHECK(booking_type IN ('private','open')),
  booking_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  max_players INTEGER DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK(status IN ('pending_payment','confirmed','cancelled','no_show','completed')),
  no_show_discount_pct INTEGER DEFAULT 0,
  payment_type TEXT NOT NULL DEFAULT 'full' CHECK(payment_type IN ('free','partial','full')),
  amount_total REAL NOT NULL DEFAULT 0,
  amount_due REAL NOT NULL DEFAULT 0,
  amount_paid REAL NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK(payment_status IN ('not_required','pending','paid')),
  paid_at TEXT,
  cancellation_fee_pct INTEGER DEFAULT 15,
  refund_amount REAL,
  cancelled_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS booking_participants (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TEXT DEFAULT (datetime('now')),
  UNIQUE(booking_id, user_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  booking_id TEXT REFERENCES bookings(id) ON DELETE CASCADE,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_turfs_city ON turfs(city);
CREATE INDEX IF NOT EXISTS idx_bookings_turf ON bookings(turf_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
`);

module.exports = db;
