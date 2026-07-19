import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function MessagesLink({ onClick }) {
  const { token, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    function load() {
      api.unreadMessageCount(token).then((data) => setUnreadCount(data.unread_count)).catch(() => {});
    }
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [user, token]);

  if (!user) return null;

  return (
    <Link to="/messages" onClick={onClick} className="nav-user-link">
      💬 Messages
      {unreadCount > 0 && <span className="notif-badge" style={{ position: 'static' }}>{unreadCount}</span>}
    </Link>
  );
}
