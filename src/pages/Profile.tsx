import { useState, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/axios';
import type { User } from '../types';

const Profile = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [bio, setBio] = useState(user?.bio || '');
  const [saved, setSaved] = useState(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    await api.patch<User>('/users/me', { bio });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!user) return null;

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar">
          {user.photos[0] ? (
            <img src={user.photos[0]} alt={user.name} />
          ) : (
            <div className="no-photo-lg">{user.name[0]}</div>
          )}
        </div>
        <h2>{user.name}, {user.age}</h2>
      </div>

      <div className="accountability-card">
        <h3>Accountability Score</h3>
        <div className="score-ring">{user.accountabilityScore}</div>
        <div className="score-stats">
          <div className="stat">
            <span className="stat-value">{user.responseRate}%</span>
            <span className="stat-label">Response rate</span>
          </div>
          <div className="stat">
            <span className="stat-value">{user.gracefulExitCount}</span>
            <span className="stat-label">Graceful exits</span>
          </div>
          <div className="stat">
            <span className="stat-value">{user.ghostCount}</span>
            <span className="stat-label">Ghosts</span>
          </div>
        </div>
        <p className="score-tip">
          Respond to messages and use "Not feeling it" to close conversations gracefully — this raises your score and improves your visibility.
        </p>
      </div>

      <form className="profile-form" onSubmit={save}>
        <label>Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={500}
          rows={4}
          placeholder="Tell people about yourself..."
        />
        <button type="submit">{saved ? 'Saved!' : 'Save changes'}</button>
      </form>

      <button className="theme-toggle-btn" onClick={toggleTheme}>
        {theme === 'dark' ? '☀️ Switch to Light Mode' : '🌙 Switch to Dark Mode'}
      </button>

      <button className="logout-btn" onClick={logout}>Sign out</button>
    </div>
  );
};

export default Profile;
