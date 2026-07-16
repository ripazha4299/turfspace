import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PLAYER_ICON } from '../constants';

function formatDateNice(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function OwnerBookingDetail() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [newMax, setNewMax] = useState('');
  const [savingMax, setSavingMax] = useState(false);

  const [addEmail, setAddEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api.ownerBookingDetail(id, token);
      setBooking(data.booking);
      setParticipants(data.participants);
      setNewMax(String(data.booking.max_players));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleUpdateMax(e) {
    e.preventDefault();
    setSavingMax(true);
    setError('');
    try {
      await api.updateMaxPlayers(id, Number(newMax), token);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingMax(false);
    }
  }

  async function handleAddPlayer(e) {
    e.preventDefault();
    setAdding(true);
    setError('');
    try {
      await api.addParticipant(id, addEmail, token);
      setAddEmail('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleRemovePlayer(userId) {
    if (!window.confirm('Remove this player from the game?')) return;
    setRemovingId(userId);
    setError('');
    try {
      await api.removeParticipant(id, userId, token);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setRemovingId(null);
    }
  }

  if (loading) return <div className="page">Loading…</div>;
  if (!booking) return <div className="page"><p className="error-text">{error || 'Booking not found.'}</p></div>;

  return (
    <div className="page">
      <button className="pdp-back-btn" onClick={() => navigate('/owner')} style={{ marginBottom: 16 }}>
        ← Back to dashboard
      </button>

      <div className="card">
        <h1 style={{ marginTop: 0 }}>
          <Link to={`/turfs/${booking.turf_id}`}>{booking.turf_name}</Link>
        </h1>
        <p className="subtle">{booking.turf_address ? `${booking.turf_address} · ` : ''}{booking.turf_city}</p>
        <p>{formatDateNice(booking.booking_date)} · {booking.start_time}–{booking.end_time}</p>
        <p className="subtle small">
          {booking.booking_type === 'open' ? 'Open booking' : 'Private booking'} ·{' '}
          <span className={`status-badge ${booking.status}`}>{booking.status.replace('_', ' ')}</span>
        </p>

        <div className="ticket-section-title">Booked by</div>
        <div className="ticket-person-badge">
          <span>{PLAYER_ICON}</span>
          <div>
            <div style={{ fontWeight: 700 }}>{booking.created_by_name}</div>
            <div className="subtle small">{booking.created_by_email}</div>
          </div>
        </div>

        <div className="ticket-section-title">Payment</div>
        <div className="ticket-row"><span>Payment type</span><span>{booking.payment_type}</span></div>
        <div className="ticket-row"><span>Total amount</span><span>₹{booking.amount_total}</span></div>
        {booking.payment_type !== 'free' && (
          <div className="ticket-row highlight money"><span>Amount due</span><span>₹{booking.amount_due}</span></div>
        )}
        {booking.amount_paid > 0 && (
          <div className="ticket-row highlight"><span>Amount paid</span><span>₹{booking.amount_paid}</span></div>
        )}
      </div>

      {error && <div className="error-text" style={{ marginBottom: 12 }}>{error}</div>}

      {booking.booking_type === 'open' && (
        <>
          <div className="card">
            <h2>Players ({participants.length}/{booking.max_players})</h2>
            <ul className="booking-list">
              {participants.map((p) => (
                <li key={p.id} className="booking-row">
                  <div>
                    <strong>{PLAYER_ICON} {p.name}</strong>
                    <div className="subtle small">{p.email}</div>
                  </div>
                  {p.id !== booking.created_by && (
                    <button
                      className="btn-danger small"
                      onClick={() => handleRemovePlayer(p.id)}
                      disabled={removingId === p.id}
                    >
                      {removingId === p.id ? 'Removing…' : 'Remove'}
                    </button>
                  )}
                  {p.id === booking.created_by && <span className="chip">Creator</span>}
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h2>Increase player cap</h2>
            <form className="form" onSubmit={handleUpdateMax}>
              <label>
                Max players
                <input
                  type="number"
                  min={participants.length}
                  value={newMax}
                  onChange={(e) => setNewMax(e.target.value)}
                />
              </label>
              <button className="btn-primary" disabled={savingMax} type="submit">
                {savingMax ? 'Saving…' : 'Update cap'}
              </button>
            </form>
          </div>

          <div className="card">
            <h2>Add a player</h2>
            <p className="subtle small">Add someone who booked over the phone or WhatsApp, by their TurfSpace account email.</p>
            <form className="form" onSubmit={handleAddPlayer}>
              <label>
                Player's email
                <input type="email" required value={addEmail} onChange={(e) => setAddEmail(e.target.value)} />
              </label>
              <button className="btn-primary" disabled={adding} type="submit">
                {adding ? 'Adding…' : 'Add player'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
