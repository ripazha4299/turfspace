import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import TicketModal from '../components/TicketModal';
import { PLAYER_ICON } from '../constants';

function formatDateNice(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function turfFor(b) {
  return { id: b.turf_id, name: b.turf_name, city: b.turf_city, address: b.turf_address, cover_image: b.turf_cover_image };
}

function BookingRow({ b, onCancel, onPay, onLeave, payingId, leavingId, onOpenDetail, isJoined }) {
  const needsPayment = b.status === 'pending_payment' && b.payment_status === 'pending';
  return (
    <li className="booking-row booking-row-clickable" onClick={() => onOpenDetail(b)}>
      <div>
        <strong>{b.turf_name}</strong> · {b.turf_city} · {(b.turf_sports || []).join(', ')}
        <div className="subtle small">
          {b.booking_date} · {b.start_time}–{b.end_time} ·{' '}
          {b.booking_type === 'open' ? 'Open booking' : 'Private booking'} ·{' '}
          <span className={`status-badge ${b.status}`}>{b.status.replace('_', ' ')}</span>
        </div>
        <div className="subtle small">
          {b.payment_type} payment
          {b.payment_type !== 'free' && ` · ₹${b.amount_due} due`}
          {b.payment_status === 'paid' && ' · paid'}
          {b.status === 'cancelled' && b.refund_amount != null && ` · refund: ₹${b.refund_amount}`}
          {isJoined && <> · created by {PLAYER_ICON} {b.creator_name}</>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }} onClick={(e) => e.stopPropagation()}>
        {needsPayment && onPay && (
          <button className="btn-primary small" onClick={() => onPay(b.id)} disabled={payingId === b.id}>
            {payingId === b.id ? 'Paying…' : 'Pay Now'}
          </button>
        )}
        {onCancel && b.status !== 'cancelled' && (
          <button className="btn-secondary small" onClick={() => onCancel(b.id)}>Cancel</button>
        )}
        {onLeave && b.status !== 'cancelled' && (
          <button className="btn-secondary small" onClick={() => onLeave(b.id)} disabled={leavingId === b.id}>
            {leavingId === b.id ? 'Leaving…' : 'Leave game'}
          </button>
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
  const [leavingId, setLeavingId] = useState(null);
  const [showCancelled, setShowCancelled] = useState(false);
  const [detailBooking, setDetailBooking] = useState(null); // { booking, isJoined }

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
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
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

  async function handleLeave(id) {
    if (!window.confirm('Are you sure you want to leave this game?')) return;
    setLeavingId(id);
    setError('');
    try {
      await api.leaveBooking(id, token);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setLeavingId(null);
    }
  }

  const visibleCreated = showCancelled ? created : created.filter((b) => b.status !== 'cancelled');
  const visibleJoined = showCancelled ? joined : joined.filter((b) => b.status !== 'cancelled');

  return (
    <div className="page">
      <div className="card-header-row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>My bookings</h1>
        <label className="filter-option" style={{ padding: 0 }}>
          <input type="checkbox" checked={showCancelled} onChange={() => setShowCancelled((s) => !s)} />
          Show cancelled
        </label>
      </div>
      {loading && <p className="subtle">Loading…</p>}
      {error && <div className="error-text">{error}</div>}

      <div className="my-bookings-grid">
        <div className="card">
          <h2>Bookings I created</h2>
          {visibleCreated.length === 0 ? (
            <p className="subtle">No bookings yet.</p>
          ) : (
            <ul className="booking-list">
              {visibleCreated.map((b) => (
                <BookingRow
                  key={b.id}
                  b={b}
                  onCancel={handleCancel}
                  onPay={handlePay}
                  payingId={payingId}
                  onOpenDetail={(booking) => setDetailBooking({ booking, isJoined: false })}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2>Games I joined</h2>
          {visibleJoined.length === 0 ? (
            <p className="subtle">You haven't joined any open games yet.</p>
          ) : (
            <ul className="booking-list">
              {visibleJoined.map((b) => (
                <BookingRow
                  key={b.id}
                  b={b}
                  onLeave={handleLeave}
                  leavingId={leavingId}
                  isJoined
                  onOpenDetail={(booking) => setDetailBooking({ booking, isJoined: true })}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      {detailBooking && (
        <TicketModal turf={turfFor(detailBooking.booking)} onClose={() => setDetailBooking(null)}>
          <h2 style={{ marginTop: 0 }}>Booking Ticket</h2>
          <div className="ticket-section-title">Details</div>
          <div className="ticket-row"><span>Date</span><span>{formatDateNice(detailBooking.booking.booking_date)}</span></div>
          <div className="ticket-row"><span>Time</span><span>{detailBooking.booking.start_time}–{detailBooking.booking.end_time}</span></div>
          <div className="ticket-row"><span>Type</span><span>{detailBooking.booking.booking_type === 'open' ? 'Open booking' : 'Private booking'}</span></div>
          <div className="ticket-row"><span>Status</span><span className={`status-badge ${detailBooking.booking.status}`}>{detailBooking.booking.status.replace('_', ' ')}</span></div>

          {detailBooking.isJoined && (
            <>
              <div className="ticket-section-title">Created by</div>
              <div className="ticket-person-badge">
                <span>{PLAYER_ICON}</span>
                <div>
                  <div style={{ fontWeight: 700 }}>{detailBooking.booking.creator_name}</div>
                  <div className="subtle small">{detailBooking.booking.creator_email}</div>
                </div>
              </div>
            </>
          )}

          <div className="ticket-section-title">Payment</div>
          <div className="ticket-row"><span>Payment type</span><span>{detailBooking.booking.payment_type}</span></div>
          <div className="ticket-row"><span>Total amount</span><span>₹{detailBooking.booking.amount_total}</span></div>
          {detailBooking.booking.payment_type !== 'free' && (
            <div className="ticket-row highlight money"><span>Amount due</span><span>₹{detailBooking.booking.amount_due}</span></div>
          )}
          {detailBooking.booking.amount_paid > 0 && (
            <div className="ticket-row highlight"><span>Amount paid</span><span>₹{detailBooking.booking.amount_paid}</span></div>
          )}
          {detailBooking.booking.status === 'cancelled' && detailBooking.booking.refund_amount != null && (
            <div className="ticket-row highlight"><span>Refund</span><span>₹{detailBooking.booking.refund_amount}</span></div>
          )}
        </TicketModal>
      )}
    </div>
  );
}
