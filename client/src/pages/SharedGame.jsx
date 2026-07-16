import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import TicketModal from '../components/TicketModal';

function formatDateNice(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

// The landing page a shared link points to (see ShareButton / utils/share.js).
// Public -- no login required to view, only to join.
export default function SharedGame() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [showJoinConfirm, setShowJoinConfirm] = useState(false);
  const [joinSubmitting, setJoinSubmitting] = useState(false);
  const [joinError, setJoinError] = useState('');

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
    if (!user) { navigate('/login'); return; }
    setJoinError('');
    setShowJoinConfirm(true);
  }

  async function confirmJoin() {
    setJoinSubmitting(true);
    setJoinError('');
    try {
      await api.joinBooking(id, token);
      setShowJoinConfirm(false);
      navigate('/my-bookings');
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
          <h1>Game not found</h1>
          <p className="subtle">This link may be broken, or the game may have been cancelled.</p>
          <Link to="/open" className="btn-primary">Browse open games</Link>
        </div>
      </div>
    );
  }

  const isFull = booking.joined_count >= booking.max_players;
  const isJoinable = booking.booking_type === 'open' && ['pending_payment', 'confirmed'].includes(booking.status) && !isFull;

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
        <h1 style={{ marginTop: 0 }}>You're invited to play!</h1>
        <p>
          <Link to={`/turfs/${booking.turf_id}`}><strong>{booking.turf_name}</strong></Link>
          {' · '}{booking.turf_city}
        </p>
        <div className="chip-row">
          {(booking.turf_sports || []).map((s) => <span className="chip" key={s}>{s}</span>)}
        </div>
        <p>{formatDateNice(booking.booking_date)} · {booking.start_time}–{booking.end_time}</p>
        <p className="subtle">{booking.joined_count}/{booking.max_players} players joined</p>

        {!isJoinable && (
          <p className="subtle small">
            {isFull ? 'This game is full.' : 'This game is no longer open to join.'}
          </p>
        )}
        {isJoinable && (
          <button className="btn-primary" onClick={handleJoinClick}>
            Join this game
          </button>
        )}
        <p className="subtle small" style={{ marginTop: 10 }}>
          Joining is free — only the person who created this game pays.
        </p>
      </div>

      {showJoinConfirm && (
        <TicketModal
          turf={{
            id: booking.turf_id, name: booking.turf_name, city: booking.turf_city,
            address: booking.address, cover_image: booking.turf_cover_image,
          }}
          onClose={() => setShowJoinConfirm(false)}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setShowJoinConfirm(false)} disabled={joinSubmitting}>Cancel</button>
              <button className="btn-primary" onClick={confirmJoin} disabled={joinSubmitting}>
                {joinSubmitting ? 'Joining…' : 'Confirm & Join'}
              </button>
            </>
          }
        >
          <h2 style={{ marginTop: 0 }}>Join This Game?</h2>
          <div className="ticket-section-title">Details</div>
          <div className="ticket-row"><span>Date</span><span>{formatDateNice(booking.booking_date)}</span></div>
          <div className="ticket-row"><span>Time</span><span>{booking.start_time}–{booking.end_time}</span></div>
          <div className="ticket-row"><span>Players</span><span>{booking.joined_count}/{booking.max_players}</span></div>
          {joinError && <div className="error-text">{joinError}</div>}
          <p className="subtle small" style={{ marginTop: 10 }}>
            Disclaimer: joining is free — only the person who created this open booking pays.
          </p>
        </TicketModal>
      )}
    </div>
  );
}
