const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

const SPORT_OPTIONS = ['Football', 'Cricket', 'Badminton', 'Tennis', 'Basketball'];

// Turfs are stored with `gallery` and `sports` as JSON string columns; every
// response parses them back into arrays so the frontend never touches raw JSON text.
function serializeTurf(turf) {
  if (!turf) return turf;
  let gallery = [];
  let sports = [];
  try { gallery = JSON.parse(turf.gallery || '[]'); } catch (e) { gallery = []; }
  try { sports = JSON.parse(turf.sports || '[]'); } catch (e) { sports = []; }
  return { ...turf, gallery, sports };
}

// Normalizes sports input (array or comma-separated string) into a JSON string,
// restricted to the fixed SPORT_OPTIONS list so a turf can never claim a sport
// that doesn't exist anywhere in the PLP's filter sidebar.
function serializeSportsInput(sports) {
  const arr = Array.isArray(sports)
    ? sports
    : String(sports || '').split(',').map((s) => s.trim()).filter(Boolean);
  const valid = arr.filter((s) => SPORT_OPTIONS.includes(s));
  return { json: JSON.stringify(valid), valid };
}

// GET /api/turfs?city=&sports=&sort=price_asc|price_desc -- Epic 1: Search & Discovery (P0/P1)
// Also powers the PLP (Product Listing Page): price sort, multi-sport filtering.
// Sport filtering happens in JS after the DB fetch since `sports` is stored as a
// JSON array column -- fine at this dataset scale, and avoids SQLite JSON1 dependency.
router.get('/', (req, res) => {
  const { city, sports, sort } = req.query;
  let query = 'SELECT * FROM turfs WHERE 1=1';
  const params = [];
  if (city) {
    query += ' AND city LIKE ?';
    params.push(`%${city}%`);
  }
  if (sort === 'price_asc') query += ' ORDER BY rate_per_hour ASC';
  else if (sort === 'price_desc') query += ' ORDER BY rate_per_hour DESC';
  else query += ' ORDER BY created_at DESC';

  let turfs = db.prepare(query).all(...params).map(serializeTurf);

  if (sports) {
    const wanted = sports.split(',').map((s) => s.trim()).filter(Boolean);
    if (wanted.length > 0) {
      turfs = turfs.filter((t) => t.sports.some((s) => wanted.includes(s)));
    }
  }

  res.json({ turfs });
});

// GET /api/turfs/:id
router.get('/:id', (req, res) => {
  const turf = db.prepare('SELECT * FROM turfs WHERE id = ?').get(req.params.id);
  if (!turf) return res.status(404).json({ error: 'Turf not found' });
  const owner = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(turf.owner_id);
  res.json({ turf: serializeTurf(turf), owner });
});

// GET /api/turfs/:id/availability?date=YYYY-MM-DD -- real-time availability (P0)
router.get('/:id/availability', (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'date query param required (YYYY-MM-DD)' });

  const turf = db.prepare('SELECT * FROM turfs WHERE id = ?').get(req.params.id);
  if (!turf) return res.status(404).json({ error: 'Turf not found' });

  const bookings = db.prepare(
    `SELECT id, booking_type, start_time, end_time, status, max_players,
       (SELECT COUNT(*) FROM booking_participants bp WHERE bp.booking_id = bookings.id) as joined_count
     FROM bookings
     WHERE turf_id = ? AND booking_date = ? AND status != 'cancelled'
     ORDER BY start_time ASC`
  ).all(req.params.id, date);

  res.json({ turf: { id: turf.id, open_time: turf.open_time, close_time: turf.close_time }, date, bookings });
});

function validatePaymentConfig(body) {
  const allow_free_booking = body.allow_free_booking ? 1 : 0;
  const allow_partial_booking = body.allow_partial_booking ? 1 : 0;
  let partial_token_pct = body.partial_token_pct != null ? Number(body.partial_token_pct) : 15;
  const cancellation_fee_pct = body.cancellation_fee_pct != null ? Number(body.cancellation_fee_pct) : 15;

  if (allow_partial_booking && (isNaN(partial_token_pct) || partial_token_pct < 15)) {
    return { error: 'partial_token_pct must be at least 15% when partial booking is allowed' };
  }
  if (!allow_partial_booking) partial_token_pct = 15;

  return { allow_free_booking, allow_partial_booking, partial_token_pct, cancellation_fee_pct };
}

// Normalizes gallery input (array or comma-separated string) into a JSON string for storage.
function serializeGalleryInput(gallery) {
  if (!gallery) return '[]';
  const arr = Array.isArray(gallery)
    ? gallery
    : String(gallery).split(',').map((s) => s.trim()).filter(Boolean);
  return JSON.stringify(arr.filter(Boolean));
}

// POST /api/turfs -- owner registers a venue (P0, Manual-Ops Owner / Underbooked Owner)
router.post('/', requireAuth, requireRole('owner'), (req, res) => {
  const {
    name, city, address, sports, rate_per_hour, open_time, close_time, description,
    cover_image, gallery, old_price,
  } = req.body;
  if (!name || !city || rate_per_hour == null) {
    return res.status(400).json({ error: 'name, city, rate_per_hour are required' });
  }

  const { json: sportsJson, valid: validSports } = serializeSportsInput(sports);
  if (validSports.length === 0) {
    return res.status(400).json({ error: `sports must include at least one of: ${SPORT_OPTIONS.join(', ')}` });
  }

  const paymentConfig = validatePaymentConfig(req.body);
  if (paymentConfig.error) return res.status(400).json({ error: paymentConfig.error });

  const id = uuidv4();
  db.prepare(
    `INSERT INTO turfs (
       id, owner_id, name, city, address, sports, rate_per_hour, open_time, close_time, description,
       cover_image, gallery, old_price,
       allow_free_booking, allow_partial_booking, partial_token_pct, cancellation_fee_pct
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id, req.user.id, name, city, address || '', sportsJson, rate_per_hour,
    open_time || '06:00', close_time || '23:00', description || '',
    cover_image || '', serializeGalleryInput(gallery), old_price != null ? Number(old_price) : null,
    paymentConfig.allow_free_booking, paymentConfig.allow_partial_booking,
    paymentConfig.partial_token_pct, paymentConfig.cancellation_fee_pct
  );

  const turf = db.prepare('SELECT * FROM turfs WHERE id = ?').get(id);
  res.status(201).json({ turf: serializeTurf(turf) });
});

// PUT /api/turfs/:id -- owner updates availability/rates/images/sports (P0)
// Business rule: changing price here never touches already-created bookings --
// amount_total/amount_due are computed and frozen at booking creation time.
router.put('/:id', requireAuth, requireRole('owner'), (req, res) => {
  const turf = db.prepare('SELECT * FROM turfs WHERE id = ?').get(req.params.id);
  if (!turf) return res.status(404).json({ error: 'Turf not found' });
  if (turf.owner_id !== req.user.id) return res.status(403).json({ error: 'Not your turf' });

  const {
    name, city, address, sports, rate_per_hour, open_time, close_time, description,
    cover_image, gallery, old_price,
  } = req.body;

  let sportsJson = turf.sports;
  if (sports !== undefined) {
    const result = serializeSportsInput(sports);
    if (result.valid.length === 0) {
      return res.status(400).json({ error: `sports must include at least one of: ${SPORT_OPTIONS.join(', ')}` });
    }
    sportsJson = result.json;
  }

  const sentPaymentFields =
    req.body.allow_free_booking !== undefined ||
    req.body.allow_partial_booking !== undefined ||
    req.body.partial_token_pct !== undefined ||
    req.body.cancellation_fee_pct !== undefined;

  let paymentConfig = {
    allow_free_booking: turf.allow_free_booking,
    allow_partial_booking: turf.allow_partial_booking,
    partial_token_pct: turf.partial_token_pct,
    cancellation_fee_pct: turf.cancellation_fee_pct,
  };
  if (sentPaymentFields) {
    const merged = {
      allow_free_booking: req.body.allow_free_booking ?? turf.allow_free_booking,
      allow_partial_booking: req.body.allow_partial_booking ?? turf.allow_partial_booking,
      partial_token_pct: req.body.partial_token_pct ?? turf.partial_token_pct,
      cancellation_fee_pct: req.body.cancellation_fee_pct ?? turf.cancellation_fee_pct,
    };
    const validated = validatePaymentConfig(merged);
    if (validated.error) return res.status(400).json({ error: validated.error });
    paymentConfig = validated;
  }

  db.prepare(
    `UPDATE turfs SET name=?, city=?, address=?, sports=?, rate_per_hour=?, open_time=?, close_time=?, description=?,
       cover_image=?, gallery=?, old_price=?,
       allow_free_booking=?, allow_partial_booking=?, partial_token_pct=?, cancellation_fee_pct=?
     WHERE id = ?`
  ).run(
    name ?? turf.name, city ?? turf.city, address ?? turf.address, sportsJson,
    rate_per_hour ?? turf.rate_per_hour, open_time ?? turf.open_time, close_time ?? turf.close_time,
    description ?? turf.description,
    cover_image ?? turf.cover_image, gallery !== undefined ? serializeGalleryInput(gallery) : turf.gallery,
    old_price !== undefined ? (old_price != null ? Number(old_price) : null) : turf.old_price,
    paymentConfig.allow_free_booking, paymentConfig.allow_partial_booking,
    paymentConfig.partial_token_pct, paymentConfig.cancellation_fee_pct,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM turfs WHERE id = ?').get(req.params.id);
  res.json({ turf: serializeTurf(updated) });
});

// GET /api/turfs/owner/mine -- owner's own listings
router.get('/owner/mine', requireAuth, requireRole('owner'), (req, res) => {
  const turfs = db.prepare('SELECT * FROM turfs WHERE owner_id = ? ORDER BY created_at DESC').all(req.user.id).map(serializeTurf);
  res.json({ turfs });
});

module.exports = router;
