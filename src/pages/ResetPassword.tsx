import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import Logo from '../components/Logo';

const EyeIcon = ({ open }: { open: boolean }) =>
  open ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-content">
          <div className="auth-card">
            <div className="auth-logo"><Logo size="lg" showText={true} /></div>
            <h1>Invalid link</h1>
            <p className="auth-subtitle">This reset link is missing or malformed.</p>
            <p className="auth-link"><Link to="/login">Back to sign in</Link></p>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Reset link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-content">
        <div className="auth-card">
          <div className="auth-logo">
            <Logo size="lg" showText={true} />
          </div>
          {done ? (
            <>
              <h1>Password updated</h1>
              <p className="auth-subtitle">Redirecting you to sign in…</p>
            </>
          ) : (
            <>
              <h1>Set new password</h1>
              <p className="auth-subtitle">Choose a strong password for your account.</p>
              {error && <p className="error">{error}</p>}
              <form onSubmit={handleSubmit}>
                <div className="password-field">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="New password (min 6 chars)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button type="button" className="password-toggle" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide' : 'Show'}>
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
                <div className="password-field">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button type="button" className="password-toggle" onClick={() => setShowConfirm((v) => !v)} aria-label={showConfirm ? 'Hide' : 'Show'}>
                    <EyeIcon open={showConfirm} />
                  </button>
                </div>
                <button type="submit" disabled={loading}>
                  {loading ? 'Updating…' : 'Update password'}
                </button>
              </form>
              <p className="auth-link">
                <Link to="/login">Back to sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
