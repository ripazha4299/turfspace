import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

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
    if (sportType) params.sport_type = sportType;
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
      runSearch({});
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
        <input placeholder="Sport" value={sportType} onChange={(e) => setSportType(e.target.value)} />
        <button className="btn-primary" type="submit">Search</button>
      </form>

      {loading && <p className="subtle">Loading open games…</p>}
      {error && <div className="error-text">{error}</div>}

      <div className="grid">
        {!loading && bookings.length === 0 && (
          <p className="subtle">No open games right now. Be the first — book a turf and mark it open.</p>
        )}
        {bookings.map((b) => (
          <div key={b.id} className="card turf-card">
            <h3>{b.turf_name}</h3>
            <p className="subtle">{b.turf_city}</p>
            <p className="tag">{b.sport_type}</p>
            <p>{b.booking_date} · {b.start_time}–{b.end_time}</p>
            <p className="subtle small">{b.joined_count}/{b.max_players} players joined</p>
            <button className="btn-primary" onClick={() => openJoinPopup(b)}>
              Join this game
            </button>
          </div>
        ))}
      </div>

      {joiningBooking && (
        <div className="popup-overlay">
          <div className="popup-card">
            <h2>Join this game?</h2>
            <div className="popup-summary">
              <p><strong>{joiningBooking.turf_name}</strong></p>
              <p className="subtle">{joiningBooking.turf_city}</p>
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
