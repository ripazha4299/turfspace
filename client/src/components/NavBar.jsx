import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand">TurfSpace</Link>
        <nav className="nav-links">
          <Link to="/search">Find a Turf</Link>
          <Link to="/open">Join a Game</Link>
          {user && user.role === 'player' && <Link to="/my-bookings">My Bookings</Link>}
          {user && user.role === 'owner' && <Link to="/owner">Owner Dashboard</Link>}
          {user ? (
            <>
              <Link to="/profile">{user.name}</Link>
              <button className="link-btn" onClick={handleLogout}>Log out</button>
            </>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/register" className="btn-small">Sign up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
