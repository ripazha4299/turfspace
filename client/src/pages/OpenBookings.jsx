import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import TicketModal from '../components/TicketModal';
import ShareButton from '../components/ShareButton';
import { SPORT_OPTIONS } from '../constants';

function formatDateNice(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function OpenBookings() {
  const [city, setCity] = useState('');
  const [sportType, setSportType] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [joiningBooking, setJoiningBooking] = useState(null);
  const [joinSubmitting, setJoinSubmitting] = useState(false);
  const [joinError, setJoinError] = useState('');

  const { user, token } = useAuth();
  const navigate = useNavigate();

  async function runSearch(params) {
    setLoading(true);
    setError('');
    try {
      const data = await api.openBookings(params);
      setBookings(data.bookings);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runSearch({});
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    const params = {};
    if (city) params.city = city;
    if (sportType) params.sports = sportType;
    runSearch(params);
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
      navigate('/my-bookings');
    } catch (err) {
      setJoinError(err.message);
    } finally {
      setJoinSubmitting(false);
    }
  }

  return (
    <div className="page">
      <h1>Join a game</h1>
      <p className="subtle">
        Browse open bookings nearby — no need to organize a full team yourself.
      </p>

      <form className="search-bar" onSubmit={handleSubmit}>
        <input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
        <select value={sportType} onChange={(e) => setSportType(e.target.value)}>
          <option value="">Any sport</option>
          {SPORT_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn-primary" type="submit">Search</button>
      </form>

      {loading && <p className="subtle">Loading open games…</p>}
      {error && <div className="error-text">{error}</div>}

      <div className="grid">
        {!loading && bookings.length === 0 && (
          <p className="subtle">No open games right now. Be the first — book a turf and mark it open.</p>
        )}
        {bookings.map((b) => (
          <div key={b.id} className="card turf-card open-booking-card">
            <h3>{b.turf_name}</h3>
            <p className="subtle">{b.turf_city}</p>
            <div className="chip-row">
              {(b.turf_sports || []).map((s) => <span className="chip" key={s}>{s}</span>)}
            </div>
            <p><span className="bold">{b.booking_date}</span> · {b.start_time}–{b.end_time}</p>
            <p className="subtle small">{b.joined_count}/{b.max_players} players joined</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" onClick={() => openJoinPopup(b)}>
                Join this game
              </button>
              <ShareButton booking={b} />
            </div>
          </div>
        ))}
      </div>

      {joiningBooking && (
        <TicketModal
          turf={{
            id: joiningBooking.turf_id, name: joiningBooking.turf_name, city: joiningBooking.turf_city,
            address: joiningBooking.address, cover_image: joiningBooking.turf_cover_image,
          }}
          onClose={() => setJoiningBooking(null)}
          footer={
            <>
              <button className="btn-secondary" onClick={() => setJoiningBooking(null)} disabled={joinSubmitting}>Cancel</button>
              <button className="btn-primary" onClick={confirmJoin} disabled={joinSubmitting}>
                {joinSubmitting ? 'Joining…' : 'Confirm & Join'}
              </button>
            </>
          }
        >
          <h2 style={{ marginTop: 0 }}>Join This Game?</h2>
          <div className="ticket-section-title">Details</div>
          <div className="ticket-row"><span>Date</span><span>{formatDateNice(joiningBooking.booking_date)}</span></div>
          <div className="ticket-row"><span>Time</span><span>{joiningBooking.start_time}–{joiningBooking.end_time}</span></div>
          <div className="ticket-row"><span>Players</span><span>{joiningBooking.joined_count}/{joiningBooking.max_players}</span></div>
          {joinError && <div className="error-text">{joinError}</div>}
          <p className="subtle small" style={{ marginTop: 10 }}>
            Disclaimer: joining is free — only the person who created this open booking pays.
          </p>
        </TicketModal>
      )}
    </div>
  );
}
