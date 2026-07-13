import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import TimeSlotPicker from '../components/TimeSlotPicker';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function durationHours(start, end) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em - (sh * 60 + sm)) / 60;
}

function formatDateNice(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export default function TurfDetail() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [turf, setTurf] = useState(null);
  const [date, setDate] = useState(todayISO());
  const [availability, setAvailability] = useState([]);
  const [openForTurf, setOpenForTurf] = useState([]);

  const [bookingType, setBookingType] = useState('private');
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('19:00');
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [paymentType, setPaymentType] = useState('full');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [activeImg, setActiveImg] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);

  // Confirm/Pay popup for creating a new booking
  const [pendingBooking, setPendingBooking] = useState(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');

  // Join popup for an existing open booking in the right-hand panel
  const [joiningBooking, setJoiningBooking] = useState(null);
  const [joinSubmitting, setJoinSubmitting] = useState(false);
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    api.getTurf(id).then((data) => setTurf(data.turf));
  }, [id]);

  useEffect(() => {
    if (!date) return;
    api.getAvailability(id, date).then((data) => setAvailability(data.bookings));
  }, [id, date]);

  function loadOpenForTurf() {
    api.openBookings({ turf_id: id }).then((data) => setOpenForTurf(data.bookings));
  }
  useEffect(() => {
    loadOpenForTurf();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const images = turf ? (turf.cover_image ? [turf.cover_image, ...(turf.gallery || [])] : (turf.gallery || [])) : [];
  const estimatedAmount = turf ? Math.round(turf.rate_per_hour * durationHours(startTime, endTime)) : 0;

  function paymentOptionsFor(t) {
    const options = [{ value: 'full', label: 'Full payment' }];
    if (t?.allow_partial_booking) options.unshift({ value: 'partial', label: `Partial (${t.partial_token_pct}% token)` });
    if (t?.allow_free_booking) options.unshift({ value: 'free', label: 'Free' });
    return options;
  }

  async function handleBook(e) {
    e.preventDefault();
    setError('');
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'player') { setError('Only players can book turfs.'); return; }

    setLoading(true);
    try {
      const data = await api.createBooking(
        {
          turf_id: id, booking_type: bookingType, booking_date: date,
          start_time: startTime, end_time: endTime, max_players: Number(maxPlayers), payment_type: paymentType,
        },
        token
      );
      setPendingBooking(data.booking);
      setPayError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePayNow() {
    setPaying(true);
    setPayError('');
    try {
      await api.payBooking(pendingBooking.id, token);
      setPendingBooking(null);
      navigate('/my-bookings');
    } catch (err) {
      setPayError(err.message);
    } finally {
      setPaying(false);
    }
  }

  async function handleCancelPending() {
    try { await api.cancelBooking(pendingBooking.id, token); } catch (e) { /* best effort */ }
    setPendingBooking(null);
    api.getAvailability(id, date).then((data) => setAvailability(data.bookings));
    loadOpenForTurf();
  }

  function handleClosePopupAfterFree() {
    setPendingBooking(null);
    navigate('/my-bookings');
  }

  function openJoinPopup(booking) {
    if (!user) { navigate('/login'); return; }
    setJoinError('');
    setJoiningBooking(booking);
  }

  async function confirmJoin() {
    setJoinSubmitting(true);
    setJoinError('');
    try {
      await api.joinBooking(joiningBooking.id, token);
      setJoiningBooking(null);
      loadOpenForTurf();
      api.getAvailability(id, date).then((data) => setAvailability(data.bookings));
    } catch (err) {
      setJoinError(err.message);
    } finally {
      setJoinSubmitting(false);
    }
  }

  if (!turf) return <div className="page">Loading…</div>;

  const options = paymentOptionsFor(turf);

  return (
    <div className="page">
      <div className="pdp-header">
        <button className="pdp-back-btn" onClick={() => navigate(-1)}>← Back</button>
        <div className="pdp-header-context">
          <strong>{turf.sport_type}</strong> · {turf.city} ·{' '}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ border: 'none', font: 'inherit', color: 'inherit', background: 'transparent' }}
          />
        </div>
      </div>

      <div className="pdp-layout">
        {/* Left: image gallery */}
        <div>
          <div className="pdp-main-image" onClick={() => images.length > 0 && setZoomOpen(true)}>
            {images.length > 0 ? (
              <img src={images[activeImg]} alt={turf.name} onError={(e) => { e.target.style.display = 'none'; }} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }} className="subtle">
                No images yet
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="pdp-thumbnails">
              {images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt=""
                  className={i === activeImg ? 'active' : ''}
                  onClick={() => setActiveImg(i)}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ))}
            </div>
          )}
          <div className="chip-row" style={{ marginTop: 14 }}>
            <span className="chip">{turf.sport_type}</span>
          </div>
          <p className="subtle small">🕒 Open {turf.open_time} – {turf.close_time}</p>
          <p className="price">
            {turf.old_price ? <span className="old-price">₹{turf.old_price}</span> : null}
            ₹{turf.rate_per_hour}/hr
          </p>
        </div>

        {/* Center: turf info + booking widget */}
        <div>
          <div className="card">
            <h1 style={{ marginTop: 0 }}>{turf.name}</h1>
            <p className="subtle">{turf.address ? `${turf.address} · ` : ''}{turf.city}</p>
            {turf.description && <p>{turf.description}</p>}
          </div>

          <div className="card">
            <h2>Book this turf</h2>
            <form className="form" onSubmit={handleBook}>
              <label>
                Booking type
                <div className="role-toggle">
                  <button type="button" className={bookingType === 'private' ? 'toggle-btn active' : 'toggle-btn'} onClick={() => setBookingType('private')}>Private</button>
                  <button type="button" className={bookingType === 'open' ? 'toggle-btn active' : 'toggle-btn'} onClick={() => setBookingType('open')}>Open — let others join</button>
                </div>
              </label>

              <div className="time-row">
                <TimeSlotPicker label="Start time" value={startTime} onChange={setStartTime} />
                <TimeSlotPicker label="End time" value={endTime} onChange={setEndTime} />
              </div>
              <p className="subtle small">Minimum 1 hour, in 30-minute increments.</p>

              {bookingType === 'open' && (
                <label>Max players<input type="number" min={2} max={30} value={maxPlayers} onChange={(e) => setMaxPlayers(e.target.value)} /></label>
              )}

              <label>
                Payment
                <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
                  {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </label>
              {paymentType === 'full' && <p className="subtle small">Full payment must be completed at least 30 minutes before the slot starts.</p>}
              {paymentType !== 'free' && <p className="subtle small">Cancelling after payment deducts a {turf.cancellation_fee_pct}% fee.</p>}
              <p className="subtle small">Estimated total: ₹{estimatedAmount}</p>

              {error && <div className="error-text">{error}</div>}

              <button className="btn-primary" disabled={loading} type="submit">
                {loading ? 'Booking…' : 'BOOK'}
              </button>
            </form>
          </div>

          {availability.length > 0 && (
            <div className="card">
              <h2>Availability on {formatDateNice(date)}</h2>
              <ul className="availability-list">
                {availability.map((b) => (
                  <li key={b.id}>
                    {b.start_time}–{b.end_time} · {b.booking_type === 'open' ? `Open game (${b.joined_count}/${b.max_players})` : 'Booked (private)'}
                    {b.status === 'pending_payment' ? ' · payment pending' : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right: joinable open bookings */}
        <div>
          <div className="open-bookings-panel">
            <h3 style={{ marginTop: 0 }}>Available Open Bookings</h3>
            {openForTurf.length === 0 ? (
              <p className="subtle small">No open games to join right now. Be the first — book above and mark it open.</p>
            ) : (
              openForTurf.map((b) => (
                <div key={b.id} className="open-booking-card" onClick={() => openJoinPopup(b)}>
                  <strong>{formatDateNice(b.booking_date)}</strong>
                  <div className="subtle small">{b.start_time}–{b.end_time}</div>
                  <div className="subtle small">{b.joined_count}/{b.max_players} players</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {zoomOpen && images.length > 0 && (
        <div className="zoom-overlay" onClick={() => setZoomOpen(false)}>
          <img src={images[activeImg]} alt={turf.name} />
        </div>
      )}

      {pendingBooking && (
        <div className="popup-overlay">
          <div className="popup-card">
            <h2>{pendingBooking.payment_type === 'free' ? 'Booking confirmed' : 'Confirm booking'}</h2>
            <div className="popup-summary">
              <p><strong>{turf.name}</strong></p>
              <p className="subtle">{turf.city}</p>
              <p>{pendingBooking.booking_date} · {pendingBooking.start_time}–{pendingBooking.end_time}</p>
              <p className="subtle small">{pendingBooking.booking_type === 'open' ? 'Open booking' : 'Private booking'} · {pendingBooking.payment_type} payment</p>
              {pendingBooking.payment_type !== 'free' && <p className="price">Amount due: ₹{pendingBooking.amount_due}</p>}
            </div>
            {payError && <div className="error-text">{payError}</div>}
            {pendingBooking.payment_type === 'free' ? (
              <button className="btn-primary" onClick={handleClosePopupAfterFree}>Go to My Bookings</button>
            ) : (
              <div className="popup-actions">
                <button className="btn-secondary" onClick={handleCancelPending} disabled={paying}>Cancel</button>
                <button className="btn-primary" onClick={handlePayNow} disabled={paying}>{paying ? 'Processing…' : 'Pay Now'}</button>
              </div>
            )}
            <p className="subtle small">Payment gateway isn't wired up yet — "Pay Now" simulates payment completion for this MVP.</p>
          </div>
        </div>
      )}

      {joiningBooking && (
        <div className="popup-overlay">
          <div className="popup-card">
            <h2>Join this game?</h2>
            <div className="popup-summary">
              <p><strong>{turf.name}</strong></p>
              <p className="subtle">{turf.city}</p>
              <p>{joiningBooking.booking_date} · {joiningBooking.start_time}–{joiningBooking.end_time}</p>
              <p className="subtle small">{joiningBooking.joined_count}/{joiningBooking.max_players} players joined</p>
              <p className="subtle small">Joining is free — only the person who created this open booking pays.</p>
            </div>
            {joinError && <div className="error-text">{joinError}</div>}
            <div className="popup-actions">
              <button className="btn-secondary" onClick={() => setJoiningBooking(null)} disabled={joinSubmitting}>Cancel</button>
              <button className="btn-primary" onClick={confirmJoin} disabled={joinSubmitting}>
                {joinSubmitting ? 'Joining…' : 'Confirm & Join'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
