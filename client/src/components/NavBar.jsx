import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { PLAYER_ICON, TURF_ICON } from '../constants';
import NotificationBell from './NotificationBell';
import MessagesLink from './MessagesLink';
import turfSpaceIcon from "../assets/icons/turfSpaceIcon.svg";

export default function NavBar() {
  const { user, logout } = useAuth();
  // const { theme, toggleTheme } = useTheme();
  const theme = 'dark'; // flag to disable theme toggle for now and keep dark mode as default
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
    <header className="navbar home-header">
      <div className="navbar-inner">
        <Link to="/" className="brand home-brand" onClick={closeMenu}>
          <img
            src={turfSpaceIcon}
            alt="TurfSpace"
            className="brand-logo"
          />
          <span>TurfSpace</span>
        </Link>

        <button
          className={menuOpen ? 'hamburger-btn open' : 'hamburger-btn'}
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
          {user && user.role === 'player' && <Link to="/my-bookings" onClick={closeMenu}>My Bookings</Link>}
          {user && user.role === 'owner' && <Link to="/owner" onClick={closeMenu}>Owner Dashboard</Link>}
          {/* <button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle dark mode">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button> */}
          {user ? (
            <>
              <MessagesLink onClick={closeMenu} />
              <Link to="/profile" onClick={closeMenu} className="nav-user-link home-alert-btn">
                <span aria-hidden="true">{roleIcon}</span>
                 {/* {user.name} */}
              </Link>
              <div className="nav-bell-wrap"><NotificationBell /></div>
              <button className="link-btn home-logout-btn" onClick={handleLogout}>Log out</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={closeMenu}>Log in</Link>
              <Link to="/register" className="home-login-btn" onClick={closeMenu}>Sign up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
