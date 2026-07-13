import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function NotificationBell() {
  const { token, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  async function load() {
    try {
      const data = await api.notifications(token);
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch (e) {
      // fail silently -- notifications are non-critical
    }
  }

  useEffect(() => {
    if (!user) return;
    load();
    // Simple polling keeps this reasonably fresh without a websocket layer.
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleOpen() {
    setOpen((o) => !o);
    if (!open && unreadCount > 0) {
      try {
        await api.markAllNotificationsRead(token);
        setUnreadCount(0);
        setNotifications((list) => list.map((n) => ({ ...n, is_read: 1 })));
      } catch (e) {
        // ignore
      }
    }
  }

  if (!user) return null;

  return (
    <div className="notif-bell-wrap" ref={boxRef}>
      <button className="notif-bell-btn" onClick={handleOpen} aria-label="Notifications">
        🔔
        {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
      </button>
      {open && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-title">Notifications</div>
          {notifications.length === 0 ? (
            <p className="subtle small" style={{ padding: '10px 14px' }}>Nothing yet.</p>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="notif-item">
                <p>{n.message}</p>
                <span className="subtle small">{new Date(n.created_at).toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
