import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import NavBar from './components/NavBar';
import RequireRole from './components/RequireRole';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Search from './pages/Search';
import TurfDetail from './pages/TurfDetail';
import OpenBookings from './pages/OpenBookings';
import MyBookings from './pages/MyBookings';
import OwnerDashboard from './pages/OwnerDashboard';
import Profile from './pages/Profile';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <NavBar />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/search" element={<Search />} />
            <Route path="/turfs/:id" element={<TurfDetail />} />
            <Route path="/open" element={<OpenBookings />} />
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
              path="/profile"
              element={
                <RequireRole>
                  <Profile />
                </RequireRole>
              }
            />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
}
