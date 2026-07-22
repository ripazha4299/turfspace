import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import TimeSlotPicker from '../components/TimeSlotPicker';
import TicketModal from '../components/TicketModal';
import ConfirmModal from '../components/ConfirmModal';
import ShareButton from '../components/ShareButton';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addHoursToTime(start, hours) {
  const [sh, sm] = start.split(':').map(Number);
  const totalMinutes = sh * 60 + sm + Math.round(hours * 60);
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

function formatDateNice(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TurfDetail() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [turf, setTurf] = useState(null);
  const [date, setDate] = useState(todayISO());
  const [openForTurf, setOpenForTurf] = useState([]);

  const [bookingType, setBookingType] = useState('private');
  const [startTime, setStartTime] = useState('18:00');
  const [slotHours, setSlotHours] = useState(1);
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
  const [overlapsElsewhere, setOverlapsElsewhere] = useState(false);
  const [showCancelPendingConfirm, setShowCancelPendingConfirm] = useState(false);

  // Join popup for an existing open booking in the right-hand panel
  const [joiningBooking, setJoiningBooking] = useState(null);
  const [joinSubmitting, setJoinSubmitting] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinOverlapsElsewhere, setJoinOverlapsElsewhere] = useState(false);

  useEffect(() => {
    api.getTurf(id).then((data) => setTurf(data.turf));
  }, [id]);

  useEffect(() => {
    setEndTime(addHoursToTime(startTime, slotHours));
  }, [startTime, slotHours]);

  function loadOpenForTurf() {
    api.openBookings({ turf_id: id }).then((data) => setOpenForTurf(data.bookings));
  }
  useEffect(() => {
    loadOpenForTurf();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const images = turf ? (turf.cover_image ? [turf.cover_image, ...(turf.gallery || [])] : (turf.gallery || [])) : [];
  const estimatedAmount = turf ? Math.round(turf.rate_per_hour * slotHours) : 0;

  function paymentOptionsFor(t) {
    const options = [{ value: 'full', label: 'Full payment' }];
    if (t?.allow_partial_booking) options.unshift({ value: 'partial', label: `Partial (${t.partial_token_pct}% token)` });
    if (t?.allow_free_booking) options.unshift({ value: 'free', label: 'Free' });
    return options;
  }

  async function handleBook(e) {
    e.preventDefault();
    setError('');
    if (!user) { navigate('/login', { state: { from: location.pathname } }); return; }
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
      setOverlapsElsewhere(data.overlaps_with_other_booking);
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
    loadOpenForTurf();
  }

  function handleClosePopupAfterFree() {
    setPendingBooking(null);
    navigate('/my-bookings');
  }

  function openJoinPopup(booking) {
    if (!user) { navigate('/login', { state: { from: location.pathname } }); return; }
    setJoinError('');
    setJoinOverlapsElsewhere(false);
    setJoiningBooking(booking);
  }

  async function confirmJoin() {
    setJoinSubmitting(true);
    setJoinError('');
    try {
      const data = await api.joinBooking(joiningBooking.id, token);
      if (data.overlaps_with_other_booking) {
        setJoinOverlapsElsewhere(true);
        setJoiningBooking((b) => ({ ...b, _joined: true }));
      } else {
        setJoiningBooking(null);
        navigate('/my-bookings');
      }
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
      <div className="pdp-topbar">
        <button className="pdp-back-btn" onClick={() => navigate(-1)}>← Back</button>
        <div className="pdp-topbar-context">
          <span className="pdp-topbar-pill">{(turf.sports || []).join(' · ')}</span>
          <span className="pdp-topbar-pill">{turf.city}</span>
        </div>
      </div>

      {/* Title + location sit above the hero image */}
      <div className="pdp-title-block">
        <h1>{turf.name}</h1>
        <p className="subtle">{turf.address ? `${turf.address} · ` : ''}{turf.city}</p>
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
            {(turf.sports || []).map((s) => <span className="chip" key={s}>{s}</span>)}
          </div>
          <p className="subtle small">🕒 Open {turf.open_time} – {turf.close_time}</p>
          <p className="price">
            {turf.old_price ? <span className="old-price">₹{turf.old_price}</span> : null}
            ₹{turf.rate_per_hour}/hr
          </p>
        </div>

        {/* Center: booking widget only -- availability list removed, the
            right-hand open-bookings panel already covers that */}
        <div>
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
              <div className="pdp-topbar">
                <div className="pdp-topbar-context">
                  <label>Date</label>
                  <input
                    type="date"
                    className="pdp-topbar-date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="time-row">
                <TimeSlotPicker label="Start time" value={startTime} onChange={setStartTime} />
                <label>
                  Duration
                  <select value={slotHours} onChange={(e) => setSlotHours(Number(e.target.value))}>
                    <option value={1}>1 hr</option>
                    <option value={1.5}>1.5 hr</option>
                    <option value={3}>3 hrs</option>
                    <option value={6}>6 hrs</option>
                  </select>
                </label>
              </div>
              <p className="subtle small">Choose one of the available slot lengths.</p>

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
        </div>

        {/* Right: joinable open bookings, then About below it */}
        <div>
          <div className="open-bookings-panel">
            <h3 style={{ marginTop: 0 }}>Available Open Bookings</h3>
            {openForTurf.length === 0 ? (
              <p className="subtle small">No open games to join right now. Be the first — book and mark it open.</p>
            ) : (
              openForTurf.map((b) => (
                <div key={b.id} className="open-booking-card" onClick={() => openJoinPopup(b)}>
                  <strong>{formatDateNice(b.booking_date)}</strong>
                  <div className="subtle small">{b.start_time}–{b.end_time}</div>
                  <div className="subtle small">{b.joined_count}/{b.max_players} players</div>
                  <div style={{ marginTop: 6 }}>
                    <ShareButton booking={b} />
                  </div>
                </div>
              ))
            )}
          </div>

          {turf.description && (
            <div className="card" style={{ marginTop: 16 }}>
              <h3 style={{ marginTop: 0 }}>About</h3>
              <p className="subtle">{turf.description}</p>
            </div>
          )}
        </div>
      </div>

      {zoomOpen && images.length > 0 && (
        <div className="zoom-overlay" onClick={() => setZoomOpen(false)}>
          <img src={images[activeImg]} alt={turf.name} />
        </div>
      )}

      {pendingBooking && (
        <TicketModal
          turf={turf}
          onClose={pendingBooking.payment_type === 'free' ? handleClosePopupAfterFree : handleCancelPending}
          footer={
            pendingBooking.payment_type === 'free' ? (
              <button className="btn-primary" style={{ width: '100%' }} onClick={handleClosePopupAfterFree}>
                Go to My Bookings
              </button>
            ) : (
              <>
                <button className="btn-secondary" onClick={() => setShowCancelPendingConfirm(true)} disabled={paying}>Cancel</button>
                <button className="btn-primary" onClick={handlePayNow} disabled={paying}>
                  {paying ? 'Processing…' : 'Pay Now'}
                </button>
              </>
            )
          }
        >
          <h2 style={{ marginTop: 0 }}>{pendingBooking.payment_type === 'free' ? 'Booking Confirmed' : 'Confirm Booking'}</h2>
          {overlapsElsewhere && (
            <div className="disclaimer-banner">
              Booking for a friend? Share this booking's details with them so they know where to go.
              <div style={{ marginTop: 8 }}><ShareButton booking={{ id: pendingBooking.id, turf_name: turf.name, booking_date: pendingBooking.booking_date, start_time: pendingBooking.start_time, end_time: pendingBooking.end_time }} /></div>
            </div>
          )}
          <div className="ticket-section-title">Details</div>
          <div className="ticket-row"><span>Date</span><span>{formatDateNice(pendingBooking.booking_date)}</span></div>
          <div className="ticket-row"><span>Time</span><span>{pendingBooking.start_time}–{pendingBooking.end_time}</span></div>
          <div className="ticket-row"><span>Type</span><span>{pendingBooking.booking_type === 'open' ? 'Open booking' : 'Private booking'}</span></div>
          <div className="ticket-row"><span>Payment</span><span>{pendingBooking.payment_type}</span></div>
          {pendingBooking.payment_type !== 'free' && (
            <div className="ticket-row highlight money"><span>Amount due</span><span>₹{pendingBooking.amount_due}</span></div>
          )}
          {pendingBooking.payment_type !== 'free' && (
            <p className="subtle small" style={{ marginTop: 10 }}>
              Disclaimer: cancelling after payment deducts a {turf.cancellation_fee_pct}% fee. Payment gateway isn't
              wired up yet for this MVP — "Pay Now" simulates payment completion.
            </p>
          )}
          {payError && <div className="error-text">{payError}</div>}
        </TicketModal>
      )}

      {joiningBooking && (
        <TicketModal
          turf={turf}
          onClose={() => {
            const wasJoined = joiningBooking._joined;
            setJoiningBooking(null);
            if (wasJoined) navigate('/my-bookings');
          }}
          footer={
            joiningBooking._joined ? (
              <button className="btn-primary" style={{ width: '100%' }} onClick={() => { setJoiningBooking(null); navigate('/my-bookings'); }}>
                Continue to My Bookings
              </button>
            ) : (
              <>
                <button className="btn-secondary" onClick={() => setJoiningBooking(null)} disabled={joinSubmitting}>Cancel</button>
                <button className="btn-primary" onClick={confirmJoin} disabled={joinSubmitting}>
                  {joinSubmitting ? 'Joining…' : 'Confirm & Join'}
                </button>
              </>
            )
          }
        >
          <h2 style={{ marginTop: 0 }}>{joiningBooking._joined ? 'You\'re In!' : 'Join This Game?'}</h2>
          {joinOverlapsElsewhere && (
            <div className="disclaimer-banner">
              Booking for a friend? Share this game's details with them so they know where to go.
              <div style={{ marginTop: 8 }}><ShareButton booking={{ id: joiningBooking.id, turf_name: turf.name, booking_date: joiningBooking.booking_date, start_time: joiningBooking.start_time, end_time: joiningBooking.end_time }} /></div>
            </div>
          )}
          <div className="ticket-section-title">Details</div>
          <div className="ticket-row"><span>Date</span><span>{formatDateNice(joiningBooking.booking_date)}</span></div>
          <div className="ticket-row"><span>Time</span><span>{joiningBooking.start_time}–{joiningBooking.end_time}</span></div>
          <div className="ticket-row"><span>Players</span><span>{joiningBooking.joined_count}/{joiningBooking.max_players}</span></div>
          {joinError && <div className="error-text">{joinError}</div>}
          {!joiningBooking._joined && (
            <p className="subtle small" style={{ marginTop: 10 }}>
              Disclaimer: joining is free — only the person who created this open booking pays.
            </p>
          )}
        </TicketModal>
      )}

      {showCancelPendingConfirm && pendingBooking && (
        <ConfirmModal
          title="Cancel this booking?"
          message={
            pendingBooking.payment_type !== 'free'
              ? "You haven't paid yet, so no cancellation fee applies."
              : 'This will cancel your booking.'
          }
          confirmLabel="Cancel booking"
          cancelLabel="Keep booking"
          onConfirm={() => { setShowCancelPendingConfirm(false); handleCancelPending(); }}
          onCancel={() => setShowCancelPendingConfirm(false)}
        />
      )}
    </div>
  );
}
