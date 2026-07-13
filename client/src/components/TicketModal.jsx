// A ticket-styled popup: left ~2/3 holds whatever content the caller passes in
// (booking summary, confirm/pay actions, monetary breakdown, etc.), right ~1/3
// is a "ticket stub" showing the turf photo, name, and location. Used for the
// confirm-booking popup, join-booking popup, and the read-only booking detail
// popups in My Bookings / Owner Dashboard.
import { Link } from 'react-router-dom';

export default function TicketModal({ onClose, turf, children, footer }) {
  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="ticket-card" onClick={(e) => e.stopPropagation()}>
        <div className="ticket-left">
          <button className="ticket-close" onClick={onClose} aria-label="Close">×</button>
          <div className="ticket-left-content">{children}</div>
          {footer && <div className="ticket-footer">{footer}</div>}
        </div>

        <div className="ticket-divider">
          <span className="ticket-notch ticket-notch-top" />
          <span className="ticket-notch ticket-notch-bottom" />
        </div>

        <div className="ticket-right">
          <div className="ticket-stub-image">
            {turf?.cover_image ? (
              <img src={turf.cover_image} alt={turf?.name || ''} onError={(e) => { e.target.style.display = 'none'; }} />
            ) : (
              <div className="ticket-stub-placeholder">🏠</div>
            )}
          </div>
          <div className="ticket-stub-name">
            {turf?.id ? (
              <Link to={`/turfs/${turf.id}`} onClick={(e) => e.stopPropagation()} className="ticket-stub-link">
                {turf.name}
              </Link>
            ) : (
              turf?.name
            )}
          </div>
          <div className="ticket-stub-location">{[turf?.address, turf?.city].filter(Boolean).join(' · ')}</div>
        </div>
      </div>
    </div>
  );
}
