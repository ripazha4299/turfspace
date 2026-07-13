import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.register(form);
      login(data.token, data.user);
      navigate(form.role === 'owner' ? '/owner' : '/search');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page auth-page">
      <div className="card auth-card">
        <h1>Create your account</h1>
        <p className="subtle">Whether you just moved cities or run a turf, TurfSpace starts here.</p>

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
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
