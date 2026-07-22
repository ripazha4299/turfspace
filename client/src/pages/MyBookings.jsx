import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import TicketModal from '../components/TicketModal';
import ConfirmModal from '../components/ConfirmModal';
import ShareButton from '../components/ShareButton';
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
          {isJoined && (
            <> · created by {PLAYER_ICON}{' '}
              <Link to={`/users/${b.created_by}`} onClick={(e) => e.stopPropagation()}>{b.creator_name}</Link>
            </>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
        {needsPayment && onPay && (
          <button className="btn-primary small" onClick={() => onPay(b.id)} disabled={payingId === b.id}>
            {payingId === b.id ? 'Paying…' : 'Pay Now'}
          </button>
        )}
        {onCancel && b.status !== 'cancelled' && (
          <ShareButton booking={b} className="btn-secondary small" />
        )}
        {onCancel && b.status !== 'cancelled' && (
          <button className="btn-secondary small" onClick={() => onCancel(b)}>Cancel</button>
        )}
        {onLeave && b.status !== 'cancelled' && (
          <ShareButton booking={b} className="btn-secondary small" />
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
  const [showCompleted, setShowCompleted] = useState(false);
  const [detailBooking, setDetailBooking] = useState(null); // { booking, isJoined }
  const [detailParticipants, setDetailParticipants] = useState(null);

  // Cancel/leave confirmation state -- replaces window.confirm with a proper
  // in-app modal so we can show the actual computed cancellation fee.
  const [cancelTarget, setCancelTarget] = useState(null); // booking being cancelled
  const [leaveTargetId, setLeaveTargetId] = useState(null);

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

  async function confirmCancel() {
    const id = cancelTarget.id;
    setCancelTarget(null);
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

  async function confirmLeave() {
    const id = leaveTargetId;
    setLeaveTargetId(null);
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

  async function openDetail(booking, isJoined) {
    setDetailBooking({ booking, isJoined });
    setDetailParticipants(null);
    if (booking.booking_type === 'open') {
      try {
        const data = await api.getBooking(booking.id);
        setDetailParticipants(data.participants);
      } catch (err) {
        // non-fatal -- the ticket still shows without the participant list
      }
    }
  }

  const visibleCreated = created.filter((b) => {
    if (!showCancelled && b.status === 'cancelled') return false;
    if (!showCompleted && b.status === 'completed') return false;
    return true;
  });
  const visibleJoined = joined.filter((b) => {
    if (!showCancelled && b.status === 'cancelled') return false;
    if (!showCompleted && b.status === 'completed') return false;
    return true;
  });

  // Computes the cancellation-fee breakdown to show in the confirm dialog --
  // a fee only ever applies if money was actually collected (payment_status paid).
  function cancelFeeDetails(b) {
    if (b.payment_status !== 'paid') return null;
    const fee = Math.round(b.amount_total * (b.cancellation_fee_pct / 100));
    const refund = Math.max(0, b.amount_paid - fee);
    return { fee, refund };
  }

  return (
    <div className="page">
      <div className="card-header-row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>My bookings</h1>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <label className="filter-option" style={{ padding: 0 }}>
            <input type="checkbox" checked={showCancelled} onChange={() => setShowCancelled((s) => !s)} />
            Show cancelled
          </label>
          <label className="filter-option" style={{ padding: 0 }}>
            <input type="checkbox" checked={showCompleted} onChange={() => setShowCompleted((s) => !s)} />
            Show completed
          </label>
        </div>
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
                  onCancel={setCancelTarget}
                  onPay={handlePay}
                  payingId={payingId}
                  onOpenDetail={(booking) => openDetail(booking, false)}
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
                  onLeave={setLeaveTargetId}
                  leavingId={leavingId}
                  isJoined
                  onOpenDetail={(booking) => openDetail(booking, true)}
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
                  <div style={{ fontWeight: 700 }}>
                    <Link to={`/users/${detailBooking.booking.created_by}`}>{detailBooking.booking.creator_name}</Link>
                  </div>
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

          {detailBooking.booking.booking_type === 'open' && (
            <>
              <div className="ticket-section-title">
                Players ({detailParticipants ? detailParticipants.length : '…'}/{detailBooking.booking.max_players})
              </div>
              <div className="ticket-participant-list">
                {detailParticipants === null ? (
                  <p className="subtle small">Loading players…</p>
                ) : (
                  detailParticipants.map((p) => (
                    <div className="ticket-participant-row" key={p.id}>
                      <span>{PLAYER_ICON}</span>
                      <Link to={`/users/${p.id}`}>{p.name}</Link>
                      {p.id === detailBooking.booking.created_by && <span className="chip">Creator</span>}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </TicketModal>
      )}

      {cancelTarget && (
        <ConfirmModal
          title="Cancel this booking?"
          message={
            cancelTarget.booking_type === 'open'
              ? "Cancelling removes everyone's spot in this game, not just yours."
              : 'This will cancel your booking.'
          }
          details={(() => {
            const fee = cancelFeeDetails(cancelTarget);
            if (!fee) return <p className="subtle small">No payment was collected, so no cancellation fee applies.</p>;
            return (
              <>
                <div className="ticket-row"><span>Cancellation fee ({cancelTarget.cancellation_fee_pct}%)</span><span>₹{fee.fee}</span></div>
                <div className="ticket-row highlight"><span>You'll be refunded</span><span>₹{fee.refund}</span></div>
              </>
            );
          })()}
          confirmLabel="Cancel booking"
          cancelLabel="Keep booking"
          onConfirm={confirmCancel}
          onCancel={() => setCancelTarget(null)}
        />
      )}

      {leaveTargetId && (
        <ConfirmModal
          title="Leave this game?"
          message="You'll be removed from the game. The creator will be notified."
          confirmLabel="Leave game"
          cancelLabel="Stay"
          onConfirm={confirmLeave}
          onCancel={() => setLeaveTargetId(null)}
        />
      )}
    </div>
  );
}
