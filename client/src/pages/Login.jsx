import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;

  function goToDestination(user) {
    navigate(from || (user.role === 'owner' ? '/owner' : '/search'));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login({ email, password });
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
        <h1>Welcome back</h1>

        <div style={{ marginBottom: 16 }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google sign-in failed. Please try again.')}
          />
        </div>
        <div className="auth-divider"><span>or</span></div>

        <form onSubmit={handleSubmit} className="form">
          <label>
            Email
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            Password
            <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <div className="error-text">{error}</div>}
          <button className="btn-primary" disabled={loading} type="submit">
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>
        <p className="subtle">
          New here? <Link to="/register" state={{ from }}>Create an account</Link>
        </p>
      </div>
    </div>
  );
}
