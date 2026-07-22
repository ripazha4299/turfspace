import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import NavBar from './components/NavBar';
import RequireRole from './components/RequireRole';
import GlobalLoader from './components/GlobalLoader';

import Home from './pages/Home';
import About from './pages/About';
import Login from './pages/Login';
import Register from './pages/Register';
import Search from './pages/Search';
import TurfDetail from './pages/TurfDetail';
import OpenBookings from './pages/OpenBookings';
import MyBookings from './pages/MyBookings';
import OwnerDashboard from './pages/OwnerDashboard';
import OwnerBookingDetail from './pages/OwnerBookingDetail';
import SharedGame from './pages/SharedGame';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';
import Messages from './pages/Messages';

function AppRoutes() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <>
      <NavBar />
      <main className={`app-main ${isHome ? 'home-page-main' : ''}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/search" element={<Search />} />
          <Route path="/turfs/:id" element={<TurfDetail />} />
          <Route path="/open" element={<OpenBookings />} />
          <Route path="/games/:id" element={<SharedGame />} />
          <Route
            path="/my-bookings"
            element={
              <RequireRole role="player">
                <MyBookings />
              </RequireRole>
            }
          />
          <Route
            path="/owner"
            element={
              <RequireRole role="owner">
                <OwnerDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/owner/bookings/:id"
            element={
              <RequireRole role="owner">
                <OwnerBookingDetail />
              </RequireRole>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireRole>
                <Profile />
              </RequireRole>
            }
          />
          <Route
            path="/users/:id"
            element={
              <RequireRole>
                <PublicProfile />
              </RequireRole>
            }
          />
          <Route
            path="/messages"
            element={
              <RequireRole>
                <Messages />
              </RequireRole>
            }
          />
          <Route
            path="/messages/:userId"
            element={
              <RequireRole>
                <Messages />
              </RequireRole>
            }
          />
        </Routes>
      </main>
      <footer className="site-footer">
        <div className="site-footer-inner">
          <div className="site-footer-brand">TurfSpace</div>
          <div className="site-footer-links">
            <Link to="/about">About Us</Link>
            <a href="#">Contact</a>
            <a href="#">Privacy</a>
          </div>
        </div>
      </footer>
    </>
  );
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <GlobalLoader />
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}
