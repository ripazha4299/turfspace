import { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PLAYER_ICON, TURF_ICON } from '../constants';

export default function Profile() {
  const { user, token, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [city, setCity] = useState(user?.city || '');
  const [sportPreferences, setSportPreferences] = useState(user?.sport_preferences || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const data = await api.updateMe(
        { name, city, sport_preferences: sportPreferences },
        token
      );
      updateUser(data.user);
      setSuccess('Profile updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <div className="page">
      <h1>{user.role === 'owner' ? TURF_ICON : PLAYER_ICON} Your profile</h1>
      <div className="card">
        <form className="form" onSubmit={handleSave}>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            City
            <input value={city} onChange={(e) => setCity(e.target.value)} />
          </label>
          {user.role === 'player' && (
            <label>
              Sport preferences
              <input value={sportPreferences} onChange={(e) => setSportPreferences(e.target.value)} />
            </label>
          )}
          <p className="subtle small">Role: {user.role}</p>
          {user.role === 'player' && (
            <p className="subtle small">No-show count: {user.no_show_count}</p>
          )}
          {error && <div className="error-text">{error}</div>}
          {success && <div className="success-text">{success}</div>}
          <button className="btn-primary" disabled={saving} type="submit">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
