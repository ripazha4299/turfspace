import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import TicketModal from '../components/TicketModal';
import ShareButton from '../components/ShareButton';

function formatDateNice(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

// The landing page a shared link points to (see ShareButton / utils/share.js).
// Public -- no login required to view. Any booking (private or open) can be
// viewed this way, but only Open bookings can actually be joined here.
export default function SharedGame() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [showJoinConfirm, setShowJoinConfirm] = useState(false);
  const [joinSubmitting, setJoinSubmitting] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [justJoined, setJustJoined] = useState(false);
  const [overlapsElsewhere, setOverlapsElsewhere] = useState(false);

  function load() {
    setLoading(true);
    api.getBooking(id)
      .then((data) => setBooking(data.booking))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function handleJoinClick() {
    if (!user) { navigate('/login', { state: { from: location.pathname } }); return; }
    setJoinError('');
    setJustJoined(false);
    setShowJoinConfirm(true);
  }

  async function confirmJoin() {
    setJoinSubmitting(true);
    setJoinError('');
    try {
      const data = await api.joinBooking(id, token);
      if (data.overlaps_with_other_booking) {
        setOverlapsElsewhere(true);
        setJustJoined(true);
      } else {
        setShowJoinConfirm(false);
        navigate('/my-bookings');
      }
    } catch (err) {
      setJoinError(err.message);
    } finally {
      setJoinSubmitting(false);
    }
  }

  if (loading) return <div className="page">Loading…</div>;
  if (error || !booking) {
    return (
      <div className="page">
        <div className="card">
          <h1>Booking not found</h1>
          <p className="subtle">This link may be broken, or the booking may have been cancelled.</p>
          <Link to="/open" className="btn-primary">Browse open games</Link>
        </div>
      </div>
    );
  }

  const isOpen = booking.booking_type === 'open';
  const isFull = isOpen && booking.joined_count >= booking.max_players;
  const isJoinable = isOpen && ['pending_payment', 'confirmed'].includes(booking.status) && !isFull;

  return (
    <div className="page">
      <div className="card" style={{ maxWidth: 480, margin: '0 auto' }}>
        {booking.turf_cover_image && (
          <img
            src={booking.turf_cover_image}
            alt={booking.turf_name}
            style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 10, marginBottom: 14 }}
          />
        )}
        <h1 style={{ marginTop: 0 }}>{isOpen ? "You're invited to play!" : 'Booking details'}</h1>
        <p>
          <Link to={`/turfs/${booking.turf_id}`}><strong>{booking.turf_name}</strong></Link>
          {' · '}{booking.turf_city}
        </p>
        <div className="chip-row">
          {(booking.turf_sports || []).map((s) => <span className="chip" key={s}>{s}</span>)}
        </div>
        <p>{formatDateNice(booking.booking_date)} · {booking.start_time}–{booking.end_time}</p>
        <p className="subtle small">
          {isOpen ? 'Open booking' : 'Private booking'} ·{' '}
          <span className={`status-badge ${booking.status}`}>{booking.status.replace('_', ' ')}</span>
        </p>
        {isOpen && <p className="subtle">{booking.joined_count}/{booking.max_players} players joined</p>}

        {isOpen && !isJoinable && (
          <p className="subtle small">
            {isFull ? 'This game is full.' : 'This game is no longer open to join.'}
          </p>
        )}
        {!isOpen && (
          <p className="subtle small">
            This is a private booking — it can't be joined, only viewed.
          </p>
        )}
        {isJoinable && (
          <button className="btn-primary" onClick={handleJoinClick}>
            Join this game
          </button>
        )}
        {isOpen && (
          <p className="subtle small" style={{ marginTop: 10 }}>
            Joining is free — only the person who created this game pays.
          </p>
        )}
      </div>

      {showJoinConfirm && (
        <TicketModal
          turf={{
            id: booking.turf_id, name: booking.turf_name, city: booking.turf_city,
            address: booking.address, cover_image: booking.turf_cover_image,
          }}
          onClose={() => {
            setShowJoinConfirm(false);
            if (justJoined) navigate('/my-bookings');
          }}
          footer={
            justJoined ? (
              <button className="btn-primary" style={{ width: '100%' }} onClick={() => { setShowJoinConfirm(false); navigate('/my-bookings'); }}>
                Continue to My Bookings
              </button>
            ) : (
              <>
                <button className="btn-secondary" onClick={() => setShowJoinConfirm(false)} disabled={joinSubmitting}>Cancel</button>
                <button className="btn-primary" onClick={confirmJoin} disabled={joinSubmitting}>
                  {joinSubmitting ? 'Joining…' : 'Confirm & Join'}
                </button>
              </>
            )
          }
        >
          <h2 style={{ marginTop: 0 }}>{justJoined ? "You're In!" : 'Join This Game?'}</h2>
          {justJoined && overlapsElsewhere && (
            <div className="disclaimer-banner">
              Booking for a friend? Share this game's details with them so they know where to go.
              <div style={{ marginTop: 8 }}>
                <ShareButton booking={{ id: booking.id, turf_name: booking.turf_name, booking_date: booking.booking_date, start_time: booking.start_time, end_time: booking.end_time }} />
              </div>
            </div>
          )}
          <div className="ticket-section-title">Details</div>
          <div className="ticket-row"><span>Date</span><span>{formatDateNice(booking.booking_date)}</span></div>
          <div className="ticket-row"><span>Time</span><span>{booking.start_time}–{booking.end_time}</span></div>
          <div className="ticket-row"><span>Players</span><span>{booking.joined_count}/{booking.max_players}</span></div>
          {joinError && <div className="error-text">{joinError}</div>}
          {!justJoined && (
            <p className="subtle small" style={{ marginTop: 10 }}>
              Disclaimer: joining is free — only the person who created this open booking pays.
            </p>
          )}
        </TicketModal>
      )}
    </div>
  );
}
