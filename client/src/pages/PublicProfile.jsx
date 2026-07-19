import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PLAYER_ICON, TURF_ICON } from '../constants';

export default function PublicProfile() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.publicProfile(id, token)
      .then((data) => setProfile(data.profile))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, token]);

  if (loading) return <div className="page">Loading…</div>;
  if (error || !profile) {
    return <div className="page"><p className="error-text">{error || 'Profile not found.'}</p></div>;
  }

  const icon = profile.role === 'owner' ? TURF_ICON : PLAYER_ICON;
  const isOwnProfile = user && user.id === profile.id;

  return (
    <div className="page">
      <div className="card">
        <div className="card-header-row">
          <div>
            <h1 style={{ marginTop: 0 }}>{icon} {profile.name}</h1>
            <p className="subtle">{profile.city}</p>
          </div>
          {!isOwnProfile && (
            <button className="btn-primary" onClick={() => navigate(`/messages/${profile.id}`)}>
              Message
            </button>
          )}
        </div>
        <p className="tag">{profile.role === 'owner' ? 'Turf Owner' : 'Player'}</p>
        {profile.role === 'player' && profile.sport_preferences && (
          <p className="subtle small">Plays: {profile.sport_preferences}</p>
        )}
      </div>

      {profile.role === 'owner' && (
        <div className="card">
          <h2>Turfs managed by {profile.name}</h2>
          {profile.turfs.length === 0 ? (
            <p className="subtle">No turfs listed yet.</p>
          ) : (
            <div className="grid">
              {profile.turfs.map((t) => (
                <Link to={`/turfs/${t.id}`} key={t.id} className="card turf-card">
                  {t.cover_image && (
                    <img src={t.cover_image} alt={t.name} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />
                  )}
                  <h3>{t.name}</h3>
                  <p className="subtle small">{t.city}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
