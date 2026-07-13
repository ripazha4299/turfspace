import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.login({ email, password });
      login(data.token, data.user);
      navigate(data.user.role === 'owner' ? '/owner' : '/search');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page auth-page">
      <div className="card auth-card">
        <h1>Welcome back</h1>
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
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
