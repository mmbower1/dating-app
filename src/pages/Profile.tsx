import { useState, useRef } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/axios';
import type { User } from '../types';

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

const Profile = () => {
  const { user, logout, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [bio, setBio] = useState(user?.bio || '');
  const [ageMin, setAgeMin] = useState(user?.agePreference?.min ?? 18);
  const [ageMax, setAgeMax] = useState(user?.agePreference?.max ?? 60);
  const [interests, setInterests] = useState<string[]>(user?.interestedIn ?? []);
  const [saved, setSaved] = useState(false);

  const GENDERS = ['male', 'female', 'non-binary', 'other'];
  const GENDER_LABELS: Record<string, string> = { male: 'Male', female: 'Female', 'non-binary': 'Non-Binary', other: 'Other' };

  const toggleInterest = (g: string) =>
    setInterests((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [notifStatus, setNotifStatus] = useState<'idle' | 'enabled' | 'denied'>('idle');
  const fileRef = useRef<HTMLInputElement>(null);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const clampedMin = Math.min(ageMin, ageMax - 1);
    const clampedMax = Math.max(ageMax, ageMin + 1);
    await api.patch<User>('/users/me', { bio, agePreference: { min: clampedMin, max: clampedMax }, interestedIn: interests });
    updateUser({ bio, agePreference: { min: clampedMin, max: clampedMax }, interestedIn: interests });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('photo', file);
      const res = await api.post<{ url: string; photos: string[] }>('/users/upload-photo', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser({ photos: res.data.photos });
    } catch {
      setUploadError('Upload failed. Make sure Cloudinary is configured.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removePhoto = async (url: string) => {
    const res = await api.delete<{ photos: string[] }>('/users/photo', { data: { url } });
    updateUser({ photos: res.data.photos });
  };

  const enableNotifications = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setNotifStatus('denied');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') { setNotifStatus('denied'); return; }

    try {
      const sw = await navigator.serviceWorker.register('/sw.js');
      const { data } = await api.get<{ key: string }>('/users/vapid-public-key');
      const subscription = await sw.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.key),
      });
      await api.post('/users/push-subscribe', subscription.toJSON());
      setNotifStatus('enabled');
    } catch {
      setNotifStatus('denied');
    }
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

      {/* Photo management */}
      <div className="photo-section">
        <h3 className="section-title">Photos</h3>
        <div className="photo-grid">
          {user.photos.map((url) => (
            <div key={url} className="photo-thumb">
              <img src={url} alt="profile" />
              <button className="photo-remove" onClick={() => removePhoto(url)} title="Remove">✕</button>
            </div>
          ))}
          {user.photos.length < 6 && (
            <button
              className="photo-add"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? '...' : '+'}
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        {uploadError && <p className="upload-error">{uploadError}</p>}
        <p className="photo-hint">{user.photos.length}/6 photos</p>
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

        <div className="age-pref-section">
          <label className="age-pref-label">Interested in</label>
          <div className="pill-group" style={{ marginTop: 8 }}>
            {GENDERS.map((g) => (
              <button
                key={g}
                type="button"
                className={`pill ${interests.includes(g) ? 'active' : ''}`}
                onClick={() => toggleInterest(g)}
              >
                {GENDER_LABELS[g]}
              </button>
            ))}
          </div>
        </div>

        <div className="age-pref-section">
          <label className="age-pref-label">
            Age range
            <span className="age-pref-range">{ageMin} – {ageMax}</span>
          </label>
          <div className="age-slider-row">
            <span className="age-slider-cap">18</span>
            <div className="age-sliders">
              <input
                type="range"
                min={18}
                max={80}
                value={ageMin}
                onChange={(e) => setAgeMin(Math.min(Number(e.target.value), ageMax - 1))}
              />
              <input
                type="range"
                min={18}
                max={80}
                value={ageMax}
                onChange={(e) => setAgeMax(Math.max(Number(e.target.value), ageMin + 1))}
              />
            </div>
            <span className="age-slider-cap">80</span>
          </div>
        </div>

        <button type="submit">{saved ? 'Saved!' : 'Save changes'}</button>
      </form>

      {/* Push notifications */}
      {notifStatus === 'idle' && (
        <button className="notif-btn" onClick={enableNotifications}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          Enable notifications
        </button>
      )}
      {notifStatus === 'enabled' && (
        <p className="notif-ok">✓ Notifications enabled</p>
      )}
      {notifStatus === 'denied' && (
        <p className="notif-denied">Notifications blocked — enable in browser settings</p>
      )}

      <button className="theme-toggle-btn" onClick={toggleTheme}>
        {theme === 'dark' ? (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
            Switch to Light Mode
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
            Switch to Dark Mode
          </>
        )}
      </button>

      <button className="logout-btn" onClick={logout}>Sign out</button>
    </div>
  );
};

export default Profile;
