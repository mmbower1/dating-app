import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/axios';

const Settings = () => {
  const { user, logout, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [email, setEmail] = useState(user?.email ?? '');
  const [emailMsg, setEmailMsg] = useState('');

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);

  const saveEmail = async (e: FormEvent) => {
    e.preventDefault();
    setEmailMsg('');
    try {
      await api.patch('/users/me/email', { email });
      updateUser({ email });
      setEmailMsg('Email updated!');
    } catch {
      setEmailMsg('Failed to update email.');
    }
  };

  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwMsg('');
    setPwError('');
    if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return; }
    if (newPw.length < 6) { setPwError('Password must be at least 6 characters.'); return; }
    try {
      await api.patch('/users/me/password', { currentPassword: currentPw, newPassword: newPw });
      setPwMsg('Password updated!');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setPwError(msg ?? 'Failed to update password.');
    }
  };

  const deleteAccount = async () => {
    if (deleteInput !== 'DELETE') return;
    setDeleting(true);
    try {
      await api.delete('/users/me');
      logout();
    } catch {
      setDeleting(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <button className="settings-back" onClick={() => navigate('/profile')} aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h2 className="settings-title">Settings</h2>
      </div>

      {/* ── Appearance ─────────────────────── */}
      <section className="settings-section">
        <p className="settings-section-label">Appearance</p>
        <button className="settings-row-btn" onClick={toggleTheme}>
          {theme === 'dark' ? (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
              Light mode
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
              Dark mode
            </>
          )}
          <svg className="settings-row-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </section>

      {/* ── Account ────────────────────────── */}
      <section className="settings-section">
        <p className="settings-section-label">Account</p>

        <form className="settings-form" onSubmit={saveEmail}>
          <label className="field-label">Email address</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {emailMsg && <p className="settings-msg">{emailMsg}</p>}
          <button type="submit" className="settings-save-btn">Update email</button>
        </form>

        <div className="settings-divider" />

        <form className="settings-form" onSubmit={savePassword}>
          <label className="field-label">Change password</label>
          <input
            type="password"
            placeholder="Current password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="New password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            required
          />
          {pwError && <p className="settings-error">{pwError}</p>}
          {pwMsg && <p className="settings-msg">{pwMsg}</p>}
          <button type="submit" className="settings-save-btn">Update password</button>
        </form>
      </section>

      {/* ── Danger zone ────────────────────── */}
      <section className="settings-section settings-section--danger">
        <p className="settings-section-label">Danger zone</p>
        <button className="settings-delete-btn" onClick={() => setShowDeleteConfirm(true)}>
          Delete account
        </button>
      </section>

      <button className="logout-btn" style={{ marginTop: 8 }} onClick={logout}>Sign out</button>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Delete account?</h3>
            <p className="modal-body">
              This permanently removes your profile, photos, and all matches. This cannot be undone.
            </p>
            <p className="modal-body" style={{ marginTop: 8 }}>
              Type <strong>DELETE</strong> to confirm.
            </p>
            <input
              className="modal-confirm-input"
              type="text"
              placeholder="DELETE"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              autoFocus
            />
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }}>
                Cancel
              </button>
              <button
                className="modal-confirm-delete"
                disabled={deleteInput !== 'DELETE' || deleting}
                onClick={deleteAccount}
              >
                {deleting ? 'Deleting…' : 'Delete forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
