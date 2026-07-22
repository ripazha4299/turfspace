const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { createNotification } = require('./notifications');

const router = express.Router();

function timesOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

function checkSlotFree(turf_id, booking_date, start_time, end_time) {
  const existing = db.prepare(
    `SELECT start_time, end_time FROM bookings
     WHERE turf_id = ? AND booking_date = ? AND status != 'cancelled'`
  ).all(turf_id, booking_date);
  return !existing.some((b) => timesOverlap(start_time, end_time, b.start_time, b.end_time));
}

// Same-turf overlap is always blocked (checkSlotFree above). Cross-turf overlap
// for the SAME player is intentionally allowed -- a player may be booking a
// second turf for a friend at the same time as their own game elsewhere. This
// just detects that situation so the UI can show a "booking for a friend?"
// disclaimer; it no longer blocks anything. Checks every booking this user is
// involved in (as creator OR as a joined participant, across ALL turfs).
function playerHasOverlapElsewhere(userId, booking_date, start_time, end_time) {
  const created = db.prepare(
    `SELECT start_time, end_time FROM bookings
     WHERE created_by = ? AND booking_date = ? AND status != 'cancelled'`
  ).all(userId, booking_date);

  const joined = db.prepare(
    `SELECT b.start_time, b.end_time FROM booking_participants bp
     JOIN bookings b ON bp.booking_id = b.id
     WHERE bp.user_id = ? AND b.booking_date = ? AND b.status != 'cancelled'`
  ).all(userId, booking_date);

  return [...created, ...joined].some((b) => timesOverlap(start_time, end_time, b.start_time, b.end_time));
}

// Parses "HH:MM" into minutes since midnight. Returns NaN if malformed.
function parseTimeToMinutes(t) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(t || '');
  if (!match) return NaN;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return NaN;
  return hours * 60 + minutes;
}

// Enforces: valid HH:MM format, end after start, minimum 1hr slot, 30-min increments.
function validateSlotTimes(start_time, end_time) {
  const startMin = parseTimeToMinutes(start_time);
  const endMin = parseTimeToMinutes(end_time);
  if (isNaN(startMin) || isNaN(endMin)) {
    return { error: 'start_time and end_time must be in HH:MM format' };
  }
  const duration = endMin - startMin;
  if (duration <= 0) {
    return { error: 'End time must be after start time (e.g. 16:00–16:00 is not a valid slot)' };
  }
  if (duration < 60) {
    return { error: 'Minimum booking slot is 1 hour' };
  }
  if (duration % 30 !== 0) {
    return { error: 'Booking slots must be in 30-minute increments after the first hour' };
  }
  return { durationMinutes: duration };
}

// Computes payment amounts for a booking given the turf's payment config and chosen payment_type.
function computePayment(turf, payment_type, durationMinutes) {
  const amount_total = Math.round(turf.rate_per_hour * (durationMinutes / 60));

  if (payment_type === 'free') {
    if (!turf.allow_free_booking) return { error: 'This turf does not offer free bookings' };
    return { amount_total, amount_due: 0, status: 'confirmed', payment_status: 'not_required' };
  }
  if (payment_type === 'partial') {
    if (!turf.allow_partial_booking) return { error: 'This turf does not offer partial (token) bookings' };
    const amount_due = Math.round(amount_total * (turf.partial_token_pct / 100));
    return { amount_total, amount_due, status: 'pending_payment', payment_status: 'pending' };
  }
  if (payment_type === 'full') {
    return { amount_total, amount_due: amount_total, status: 'pending_payment', payment_status: 'pending' };
  }
  return { error: "payment_type must be 'free', 'partial', or 'full'" };
}

// Full-payment bookings must be paid at least 30 minutes before the slot starts.
function minutesUntilSlotStart(booking_date, start_time) {
  const slotStart = new Date(`${booking_date}T${start_time}:00`);
  const now = new Date();
  return (slotStart.getTime() - now.getTime()) / 60000;
}

function completePastBookings() {
  db.prepare(
    `UPDATE bookings SET status = 'completed'
     WHERE status IN ('pending_payment', 'confirmed')
       AND datetime(booking_date || ' ' || end_time) <= datetime('now')`
  ).run();
}

// POST /api/bookings -- Flow A (private) & Flow B (open) -- Epic 2 & 3, P0
// The creator is the only one who pays (per payment_type); anyone who joins an
// open booking later joins for free -- see /:id/join below.
router.post('/', requireAuth, requireRole('player'), (req, res) => {
  const { turf_id, booking_type, booking_date, start_time, end_time, max_players, payment_type } = req.body;

  if (!turf_id || !booking_type || !booking_date || !start_time || !end_time || !payment_type) {
    return res.status(400).json({
      error: 'turf_id, booking_type, booking_date, start_time, end_time, payment_type are required',
    });
  }
  if (!['private', 'open'].includes(booking_type)) {
    return res.status(400).json({ error: "booking_type must be 'private' or 'open'" });
  }

  const turf = db.prepare('SELECT * FROM turfs WHERE id = ?').get(turf_id);
  if (!turf) return res.status(404).json({ error: 'Turf not found' });

  const slotCheck = validateSlotTimes(start_time, end_time);
  if (slotCheck.error) return res.status(400).json({ error: slotCheck.error });

  // Blocks overlap regardless of type, so the same slot can never be booked as
  // both private and open (or double-booked at all) on this turf.
  if (!checkSlotFree(turf_id, booking_date, start_time, end_time)) {
    return res.status(409).json({ error: 'This slot overlaps with an existing booking' });
  }

  // Cross-turf overlap is allowed (e.g. booking a second turf for a friend at
  // the same time as your own game elsewhere) -- just flagged for the UI to
  // show a "booking for a friend?" disclaimer, never blocked.
  const overlapsElsewhere = playerHasOverlapElsewhere(req.user.id, booking_date, start_time, end_time);

  const payment = computePayment(turf, payment_type, slotCheck.durationMinutes);
  if (payment.error) return res.status(400).json({ error: payment.error });

  if (payment_type === 'full') {
    const minutesLeft = minutesUntilSlotStart(booking_date, start_time);
    if (minutesLeft < 30) {
      return res.status(400).json({
        error: 'Full payment must be completed at least 30 minutes before the slot starts. Choose a different payment option or an earlier slot.',
      });
    }
  }

  const id = uuidv4();
  db.prepare(
    `INSERT INTO bookings (
       id, turf_id, created_by, booking_type, booking_date, start_time, end_time, max_players,
       status, payment_type, amount_total, amount_due, payment_status, cancellation_fee_pct
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id, turf_id, req.user.id, booking_type, booking_date, start_time, end_time, max_players || 10,
    payment.status, payment_type, payment.amount_total, payment.amount_due, payment.payment_status,
    turf.cancellation_fee_pct
  );

  // Creator is automatically the first participant of an open booking
  if (booking_type === 'open') {
    db.prepare(
      `INSERT INTO booking_participants (id, booking_id, user_id) VALUES (?, ?, ?)`
    ).run(uuidv4(), id, req.user.id);
  }

  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
  res.status(201).json({ booking, overlaps_with_other_booking: overlapsElsewhere });
});

// POST /api/bookings/:id/pay -- simulates the "Pay Now" step of the Confirm/Join
// Booking popup. No real payment gateway is wired up yet (per PRD cut list) --
// this just transitions pending_payment -> confirmed and records the payment.
router.post('/:id/pay', requireAuth, (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.created_by !== req.user.id) return res.status(403).json({ error: 'Only the creator can pay for this booking' });
  if (booking.status === 'cancelled') return res.status(400).json({ error: 'This booking has been cancelled' });
  if (booking.payment_status === 'paid' || booking.payment_status === 'not_required') {
    return res.status(400).json({ error: 'Nothing left to pay on this booking' });
  }

  if (booking.payment_type === 'full') {
    const minutesLeft = minutesUntilSlotStart(booking.booking_date, booking.start_time);
    if (minutesLeft < 0) {
      return res.status(400).json({ error: 'This slot has already started' });
    }
  }

  db.prepare(
    `UPDATE bookings SET status = 'confirmed', payment_status = 'paid', amount_paid = amount_due, paid_at = datetime('now')
     WHERE id = ?`
  ).run(req.params.id);

  const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  res.json({ booking: updated });
});

// GET /api/bookings/open?city=&sports=&date=&turf_id= -- Epic 3, P0 (Solo Joiner browses open bookings)
// turf_id scopes this to a single turf's open bookings -- used by the PDP's
// "Available Open Bookings" side panel.
router.get('/open', (req, res) => {
  completePastBookings();

  const { city, sports, date, turf_id } = req.query;
  let query = `
    SELECT b.*, t.name as turf_name, t.city as turf_city, t.sports as turf_sports, t.address, t.cover_image as turf_cover_image,
      (SELECT COUNT(*) FROM booking_participants bp WHERE bp.booking_id = b.id) as joined_count
    FROM bookings b
    JOIN turfs t ON b.turf_id = t.id
    WHERE b.booking_type = 'open' AND b.status IN ('pending_payment', 'confirmed')
  `;
  const params = [];
  if (turf_id) {
    query += ' AND b.turf_id = ?';
    params.push(turf_id);
  }
  if (city) {
    query += ' AND t.city LIKE ?';
    params.push(`%${city}%`);
  }
  if (date) {
    query += ' AND b.booking_date = ?';
    params.push(date);
  }
  query += ' ORDER BY b.booking_date ASC, b.start_time ASC';

  let bookings = db.prepare(query).all(...params).map((b) => {
    let turf_sports = [];
    try { turf_sports = JSON.parse(b.turf_sports || '[]'); } catch (e) { turf_sports = []; }
    return { ...b, turf_sports };
  });

  if (sports) {
    const wanted = sports.split(',').map((s) => s.trim()).filter(Boolean);
    if (wanted.length > 0) bookings = bookings.filter((b) => b.turf_sports.some((s) => wanted.includes(s)));
  }

  // Only surface ones that still have room
  const withRoom = bookings.filter((b) => b.joined_count < b.max_players);
  res.json({ bookings: withRoom });
});

// POST /api/bookings/:id/join -- Epic 3, P0 (Solo Joiner joins)
router.post('/:id/join', requireAuth, requireRole('player'), (req, res) => {
  completePastBookings();
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.booking_type !== 'open') return res.status(400).json({ error: 'This booking is not joinable' });
  if (!['pending_payment', 'confirmed'].includes(booking.status)) {
    return res.status(400).json({ error: 'This booking is no longer open' });
  }

  const joinedCount = db.prepare(
    'SELECT COUNT(*) as c FROM booking_participants WHERE booking_id = ?'
  ).get(req.params.id).c;
  if (joinedCount >= booking.max_players) return res.status(409).json({ error: 'Booking is full' });

  const already = db.prepare(
    'SELECT id FROM booking_participants WHERE booking_id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id);
  if (already) return res.status(409).json({ error: 'Already joined this booking' });

  // Cross-turf overlap is allowed (booking/joining for a friend) -- just
  // flagged, never blocked. See playerHasOverlapElsewhere's comment above.
  const overlapsElsewhere = playerHasOverlapElsewhere(req.user.id, booking.booking_date, booking.start_time, booking.end_time);

  db.prepare(
    `INSERT INTO booking_participants (id, booking_id, user_id) VALUES (?, ?, ?)`
  ).run(uuidv4(), req.params.id, req.user.id);

  const turf = db.prepare('SELECT name FROM turfs WHERE id = ?').get(booking.turf_id);
  createNotification(
    booking.created_by,
    'joined_your_game',
    `${req.user.name} joined your open game at ${turf ? turf.name : 'your turf'} on ${booking.booking_date} (${booking.start_time}–${booking.end_time}).`,
    booking.id
  );

  const participants = db.prepare(
    `SELECT u.id, u.name FROM booking_participants bp JOIN users u ON bp.user_id = u.id WHERE bp.booking_id = ?`
  ).all(req.params.id);

  res.json({ booking, participants, overlaps_with_other_booking: overlapsElsewhere });
});

// POST /api/bookings/:id/leave -- a participant (not the creator) backs out of
// an open booking they joined. No payment was involved for joiners, so this is
// just a participation removal -- the creator's own booking/payment is untouched.
// Notifies the creator, mirroring the join notification.
router.post('/:id/leave', requireAuth, requireRole('player'), (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.created_by === req.user.id) {
    return res.status(400).json({ error: 'You created this booking -- use cancel instead of leave' });
  }

  const participant = db.prepare(
    'SELECT id FROM booking_participants WHERE booking_id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id);
  if (!participant) return res.status(404).json({ error: "You haven't joined this booking" });

  db.prepare('DELETE FROM booking_participants WHERE id = ?').run(participant.id);

  const turf = db.prepare('SELECT name FROM turfs WHERE id = ?').get(booking.turf_id);
  createNotification(
    booking.created_by,
    'left_your_game',
    `${req.user.name} left your open game at ${turf ? turf.name : 'your turf'} on ${booking.booking_date} (${booking.start_time}–${booking.end_time}).`,
    booking.id
  );

  res.json({ ok: true });
});

// GET /api/bookings/:id -- detail with participants
router.get('/:id', (req, res) => {
  const booking = db.prepare(
    `SELECT b.*, t.name as turf_name, t.city as turf_city, t.sports as turf_sports, t.address, t.cover_image as turf_cover_image, t.owner_id
     FROM bookings b JOIN turfs t ON b.turf_id = t.id WHERE b.id = ?`
  ).get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  try { booking.turf_sports = JSON.parse(booking.turf_sports || '[]'); } catch (e) { booking.turf_sports = []; }

  const participants = db.prepare(
    `SELECT u.id, u.name FROM booking_participants bp JOIN users u ON bp.user_id = u.id WHERE bp.booking_id = ?`
  ).all(req.params.id);

  res.json({ booking, participants });
});

// POST /api/bookings/:id/cancel -- creator cancels.
// If money was already collected (payment_status = 'paid'), a cancellation fee
// (turf's cancellation_fee_pct, default 15%) is deducted from the total; the rest
// is recorded as refundable. No real refund is processed (no payment gateway yet).
router.post('/:id/cancel', requireAuth, (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.created_by !== req.user.id) return res.status(403).json({ error: 'Only the creator can cancel' });
  if (booking.status === 'cancelled') return res.status(400).json({ error: 'Booking is already cancelled' });

  let refund_amount = null;
  if (booking.payment_status === 'paid') {
    const fee = Math.round(booking.amount_total * (booking.cancellation_fee_pct / 100));
    refund_amount = Math.max(0, booking.amount_paid - fee);
  }

  db.prepare(
    `UPDATE bookings SET status = 'cancelled', refund_amount = ?, cancelled_at = datetime('now') WHERE id = ?`
  ).run(refund_amount, req.params.id);

  const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
  res.json({ booking: updated });
});

// --- Owner-facing endpoints ---

// GET /api/bookings/owner/calendar -- Epic 5, P0 (booking calendar for turf owner)
router.get('/owner/calendar', requireAuth, requireRole('owner'), (req, res) => {
  const bookings = db.prepare(
    `SELECT b.*, t.name as turf_name, t.city as turf_city, t.address as turf_address, t.cover_image as turf_cover_image,
       (SELECT COUNT(*) FROM booking_participants bp WHERE bp.booking_id = b.id) as joined_count,
       u.name as created_by_name, u.email as created_by_email
     FROM bookings b
     JOIN turfs t ON b.turf_id = t.id
     JOIN users u ON b.created_by = u.id
     WHERE t.owner_id = ?
     ORDER BY b.booking_date ASC, b.start_time ASC`
  ).all(req.user.id);
  res.json({ bookings });
});

// GET /api/bookings/:id/owner-detail -- full detail + participant list for the
// owner's dedicated booking-management page. Only the turf's owner can see this.
router.get('/:id/owner-detail', requireAuth, requireRole('owner'), (req, res) => {
  const booking = db.prepare(
    `SELECT b.*, t.name as turf_name, t.city as turf_city, t.address as turf_address,
       t.cover_image as turf_cover_image, t.owner_id, u.name as created_by_name, u.email as created_by_email
     FROM bookings b
     JOIN turfs t ON b.turf_id = t.id
     JOIN users u ON b.created_by = u.id
     WHERE b.id = ?`
  ).get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.owner_id !== req.user.id) return res.status(403).json({ error: 'Not your turf booking' });

  const participants = db.prepare(
    `SELECT u.id, u.name, u.email, bp.joined_at FROM booking_participants bp
     JOIN users u ON bp.user_id = u.id WHERE bp.booking_id = ? ORDER BY bp.joined_at ASC`
  ).all(req.params.id);

  res.json({ booking, participants });
});

// PUT /api/bookings/:id/max-players -- owner increases (or otherwise sets) capacity
// on an open booking. Can never be set below the number of players already joined.
router.put('/:id/max-players', requireAuth, requireRole('owner'), (req, res) => {
  const { max_players } = req.body;
  const booking = db.prepare(
    `SELECT b.*, t.owner_id FROM bookings b JOIN turfs t ON b.turf_id = t.id WHERE b.id = ?`
  ).get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.owner_id !== req.user.id) return res.status(403).json({ error: 'Not your turf booking' });
  if (booking.booking_type !== 'open') return res.status(400).json({ error: 'Only open bookings have a player cap' });

  const newMax = Number(max_players);
  if (!Number.isInteger(newMax) || newMax < 2) {
    return res.status(400).json({ error: 'max_players must be a whole number of at least 2' });
  }
  const joinedCount = db.prepare(
    'SELECT COUNT(*) as c FROM booking_participants WHERE booking_id = ?'
  ).get(req.params.id).c;
  if (newMax < joinedCount) {
    return res.status(400).json({ error: `Can't set max players below the ${joinedCount} already joined` });
  }

  db.prepare('UPDATE bookings SET max_players = ? WHERE id = ?').run(newMax, req.params.id);
  res.json({ ok: true, max_players: newMax });
});

// POST /api/bookings/:id/participants -- owner manually adds a player to an open
// booking (e.g. someone who booked over the phone/WhatsApp). Same overlap and
// capacity rules as a normal self-join apply; the added player is notified.
router.post('/:id/participants', requireAuth, requireRole('owner'), (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });

  const booking = db.prepare(
    `SELECT b.*, t.owner_id, t.name as turf_name FROM bookings b JOIN turfs t ON b.turf_id = t.id WHERE b.id = ?`
  ).get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.owner_id !== req.user.id) return res.status(403).json({ error: 'Not your turf booking' });
  if (booking.booking_type !== 'open') return res.status(400).json({ error: 'Only open bookings can have players added' });
  if (booking.status === 'cancelled') return res.status(400).json({ error: 'This booking is cancelled' });

  const player = db.prepare('SELECT * FROM users WHERE email = ? AND role = ?').get(email.toLowerCase(), 'player');
  if (!player) return res.status(404).json({ error: 'No player found with that email' });

  const joinedCount = db.prepare(
    'SELECT COUNT(*) as c FROM booking_participants WHERE booking_id = ?'
  ).get(req.params.id).c;
  if (joinedCount >= booking.max_players) return res.status(409).json({ error: 'Booking is full' });

  const already = db.prepare(
    'SELECT id FROM booking_participants WHERE booking_id = ? AND user_id = ?'
  ).get(req.params.id, player.id);
  if (already) return res.status(409).json({ error: 'This player has already joined' });

  // Cross-turf overlap is allowed platform-wide now (see playerHasOverlapElsewhere) --
  // an owner manually adding a player isn't blocked by it either.

  db.prepare(
    `INSERT INTO booking_participants (id, booking_id, user_id) VALUES (?, ?, ?)`
  ).run(uuidv4(), req.params.id, player.id);

  createNotification(
    player.id,
    'added_to_game',
    `${booking.turf_name}'s owner added you to a game on ${booking.booking_date} (${booking.start_time}–${booking.end_time}).`,
    booking.id
  );

  const participants = db.prepare(
    `SELECT u.id, u.name, u.email, bp.joined_at FROM booking_participants bp
     JOIN users u ON bp.user_id = u.id WHERE bp.booking_id = ? ORDER BY bp.joined_at ASC`
  ).all(req.params.id);
  res.status(201).json({ participants });
});

// DELETE /api/bookings/:id/participants/:userId -- owner removes a joined player
// (not the creator -- the creator's own booking must be cancelled, not "removed").
router.delete('/:id/participants/:userId', requireAuth, requireRole('owner'), (req, res) => {
  const booking = db.prepare(
    `SELECT b.*, t.owner_id, t.name as turf_name FROM bookings b JOIN turfs t ON b.turf_id = t.id WHERE b.id = ?`
  ).get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.owner_id !== req.user.id) return res.status(403).json({ error: 'Not your turf booking' });
  if (req.params.userId === booking.created_by) {
    return res.status(400).json({ error: "Can't remove the creator -- cancel the booking instead" });
  }

  const participant = db.prepare(
    'SELECT id FROM booking_participants WHERE booking_id = ? AND user_id = ?'
  ).get(req.params.id, req.params.userId);
  if (!participant) return res.status(404).json({ error: 'That player is not part of this booking' });

  db.prepare('DELETE FROM booking_participants WHERE id = ?').run(participant.id);

  createNotification(
    req.params.userId,
    'removed_from_game',
    `${booking.turf_name}'s owner removed you from a game on ${booking.booking_date} (${booking.start_time}–${booking.end_time}).`,
    booking.id
  );

  const participants = db.prepare(
    `SELECT u.id, u.name, u.email, bp.joined_at FROM booking_participants bp
     JOIN users u ON bp.user_id = u.id WHERE bp.booking_id = ? ORDER BY bp.joined_at ASC`
  ).all(req.params.id);
  res.json({ participants });
});

// POST /api/bookings/:id/no-show -- Epic 4, P1 (owner flags no-show, offers discount re-fill)
router.post('/:id/no-show', requireAuth, requireRole('owner'), (req, res) => {
  const { discount_pct } = req.body;
  const booking = db.prepare(
    `SELECT b.*, t.owner_id FROM bookings b JOIN turfs t ON b.turf_id = t.id WHERE b.id = ?`
  ).get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.owner_id !== req.user.id) return res.status(403).json({ error: 'Not your turf booking' });

  db.prepare(
    `UPDATE bookings SET status = 'no_show', no_show_discount_pct = ? WHERE id = ?`
  ).run(discount_pct || 20, req.params.id);

  // Track repeat no-shows on the creator's profile (P2)
  db.prepare(
    `UPDATE users SET no_show_count = no_show_count + 1 WHERE id = ?`
  ).run(booking.created_by);

  res.json({ ok: true });
});

// GET /api/bookings/no-show-deals?city=&date= -- P1 (Solo Joiner grabs discounted no-show slot)
router.get('/deals/no-show', (req, res) => {
  const { city, date } = req.query;
  let query = `
    SELECT b.*, t.name as turf_name, t.city as turf_city, t.sports as turf_sports, t.rate_per_hour
    FROM bookings b JOIN turfs t ON b.turf_id = t.id
    WHERE b.status = 'no_show'
  `;
  const params = [];
  if (city) {
    query += ' AND t.city LIKE ?';
    params.push(`%${city}%`);
  }
  if (date) {
    query += ' AND b.booking_date = ?';
    params.push(date);
  }
  query += ' ORDER BY b.booking_date ASC';
  const deals = db.prepare(query).all(...params);
  res.json({ deals });
});

// GET /api/bookings/owner/stats -- fill-rate metric support (Section 4 of PRD)
router.get('/owner/stats', requireAuth, requireRole('owner'), (req, res) => {
  const turfs = db.prepare('SELECT id FROM turfs WHERE owner_id = ?').all(req.user.id);
  const turfIds = turfs.map((t) => t.id);
  if (turfIds.length === 0) return res.json({ total_bookings: 0, no_shows: 0, open_bookings: 0, private_bookings: 0 });

  const placeholders = turfIds.map(() => '?').join(',');
  const total = db.prepare(
    `SELECT COUNT(*) as c FROM bookings WHERE turf_id IN (${placeholders}) AND status != 'cancelled'`
  ).get(...turfIds).c;
  const noShows = db.prepare(
    `SELECT COUNT(*) as c FROM bookings WHERE turf_id IN (${placeholders}) AND status = 'no_show'`
  ).get(...turfIds).c;
  const open = db.prepare(
    `SELECT COUNT(*) as c FROM bookings WHERE turf_id IN (${placeholders}) AND booking_type = 'open' AND status != 'cancelled'`
  ).get(...turfIds).c;
  const priv = db.prepare(
    `SELECT COUNT(*) as c FROM bookings WHERE turf_id IN (${placeholders}) AND booking_type = 'private' AND status != 'cancelled'`
  ).get(...turfIds).c;

  res.json({ total_bookings: total, no_shows: noShows, open_bookings: open, private_bookings: priv });
});

module.exports = router;
