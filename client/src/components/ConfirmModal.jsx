// A plain (non-ticket) confirmation dialog for simple yes/no gates -- distinct
// from TicketModal, which is for booking-shaped content. Used wherever we need
// to show specific details (like a cancellation fee) before confirming a
// destructive action, instead of the browser's generic window.confirm().
export default function ConfirmModal({ title, message, details, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel, danger = true }) {
  return (
    <div className="popup-overlay" onClick={onCancel}>
      <div className="popup-card" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        <p>{message}</p>
        {details && <div className="popup-summary">{details}</div>}
        <div className="popup-actions">
          <button className="btn-secondary" onClick={onCancel}>{cancelLabel}</button>
          <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
