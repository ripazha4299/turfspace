import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { PLAYER_ICON, TURF_ICON } from '../constants';
import NotificationBell from './NotificationBell';

export default function NavBar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    setMenuOpen(false);
    logout();
    navigate('/login');
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  const roleIcon = user ? (user.role === 'owner' ? TURF_ICON : PLAYER_ICON) : null;

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand" onClick={closeMenu}>TurfSpace</Link>

        <button
          className="hamburger-btn"
          aria-label="Toggle menu"
          onClick={() => setMenuOpen((m) => !m)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={menuOpen ? 'nav-links open' : 'nav-links'}>
          <Link to="/search" onClick={closeMenu}>Find a Turf</Link>
          <Link to="/open" onClick={closeMenu}>Join a Game</Link>
          <Link to="/about" onClick={closeMenu}>About</Link>
          {user && user.role === 'player' && <Link to="/my-bookings" onClick={closeMenu}>My Bookings</Link>}
          {user && user.role === 'owner' && <Link to="/owner" onClick={closeMenu}>Owner Dashboard</Link>}
          <button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle dark mode">
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
          {user ? (
            <>
              <Link to="/profile" onClick={closeMenu} className="nav-user-link">
                <span aria-hidden="true">{roleIcon}</span> {user.name}
              </Link>
              <div className="nav-bell-wrap"><NotificationBell /></div>
              <button className="link-btn" onClick={handleLogout}>Log out</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={closeMenu}>Log in</Link>
              <Link to="/register" className="btn-small" onClick={closeMenu}>Sign up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
