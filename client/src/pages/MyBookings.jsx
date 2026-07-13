import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

function BookingRow({ b, onCancel, onPay, payingId }) {
  const needsPayment = b.status === 'pending_payment' && b.payment_status === 'pending';
  return (
    <li className="booking-row">
      <div>
        <strong>{b.turf_name}</strong> · {b.turf_city} · {b.sport_type}
        <div className="subtle small">
          {b.booking_date} · {b.start_time}–{b.end_time} ·{' '}
          {b.booking_type === 'open' ? 'Open booking' : 'Private booking'} · status: {b.status}
        </div>
        <div className="subtle small">
          {b.payment_type} payment
          {b.payment_type !== 'free' && ` · ₹${b.amount_due} due`}
          {b.payment_status === 'paid' && ' · paid'}
          {b.status === 'cancelled' && b.refund_amount != null && ` · refund: ₹${b.refund_amount}`}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {needsPayment && onPay && (
          <button className="btn-primary small" onClick={() => onPay(b.id)} disabled={payingId === b.id}>
            {payingId === b.id ? 'Paying…' : 'Pay Now'}
          </button>
        )}
        {onCancel && b.status !== 'cancelled' && (
          <button className="btn-secondary small" onClick={() => onCancel(b.id)}>Cancel</button>
        )}
      </div>
    </li>
  );
}

export default function MyBookings() {
  const { token } = useAuth();
  const [created, setCreated] = useState([]);
  const [joined, setJoined] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payingId, setPayingId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api.myBookings(token);
      setCreated(data.created);
      setJoined(data.joined);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCancel(id) {
    try {
      await api.cancelBooking(id, token);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handlePay(id) {
    setPayingId(id);
    setError('');
    try {
      await api.payBooking(id, token);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setPayingId(null);
    }
  }

  return (
    <div className="page">
      <h1>My bookings</h1>
      {loading && <p className="subtle">Loading…</p>}
      {error && <div className="error-text">{error}</div>}

      <div className="card">
        <h2>Bookings I created</h2>
        {created.length === 0 ? (
          <p className="subtle">No bookings yet.</p>
        ) : (
          <ul className="booking-list">
            {created.map((b) => (
              <BookingRow key={b.id} b={b} onCancel={handleCancel} onPay={handlePay} payingId={payingId} />
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>Games I joined</h2>
        {joined.length === 0 ? (
          <p className="subtle">You haven't joined any open games yet.</p>
        ) : (
          <ul className="booking-list">
            {joined.map((b) => (
              <BookingRow key={b.id} b={b} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
