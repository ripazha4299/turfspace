import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'player', city: '', sport_preferences: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function goToDestination(user) {
    navigate(from || (user.role === 'owner' ? '/owner' : '/search'));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.register(form);
      login(data.token, data.user);
      goToDestination(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSuccess(credentialResponse) {
    setError('');
    try {
      const data = await api.googleAuth(credentialResponse.credential);
      login(data.token, data.user);
      goToDestination(data.user);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page auth-page">
      <div className="card auth-card">
        <h1>Create your account</h1>
        <p className="subtle">Whether you just moved cities or run a turf, TurfSpace starts here.</p>

        <div style={{ marginTop: 16, marginBottom: 4 }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google sign-in failed. Please try again.')}
          />
        </div>
        <p className="subtle small">Signing up with Google creates a Player account. Turf owners, use the form below.</p>
        <div className="auth-divider"><span>or</span></div>

        <form onSubmit={handleSubmit} className="form">
          <label>
            I am a
            <div className="role-toggle">
              <button
                type="button"
                className={form.role === 'player' ? 'toggle-btn active' : 'toggle-btn'}
                onClick={() => update('role', 'player')}
              >
                Player
              </button>
              <button
                type="button"
                className={form.role === 'owner' ? 'toggle-btn active' : 'toggle-btn'}
                onClick={() => update('role', 'owner')}
              >
                Turf Owner
              </button>
            </div>
          </label>

          <label>
            Full name
            <input required value={form.name} onChange={(e) => update('name', e.target.value)} />
          </label>

          <label>
            Email
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
            />
          </label>

          <label>
            Password
            <input
              required
              type="password"
              minLength={8}
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
            />
          </label>

          <label>
            City
            <input
              placeholder="e.g. Jaipur"
              value={form.city}
              onChange={(e) => update('city', e.target.value)}
            />
          </label>

          {form.role === 'player' && (
            <label>
              Sport preferences
              <input
                placeholder="e.g. Football, Badminton"
                value={form.sport_preferences}
                onChange={(e) => update('sport_preferences', e.target.value)}
              />
            </label>
          )}

          {error && <div className="error-text">{error}</div>}

          <button className="btn-primary" disabled={loading} type="submit">
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="subtle">
          Already have an account? <Link to="/login" state={{ from }}>Log in</Link>
        </p>
      </div>
    </div>
  );
}
