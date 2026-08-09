import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import { useLanguage } from '../context/LanguageContext';

const EyeIcon = ({ open }: { open: boolean }) =>
  open ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch {
      setError(t.login.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      {/* ── Left / content panel ── */}
      <div className="login-content-panel">

        {/* Top: logo + back */}
        <div className="login-top">
          <Logo size="sm" showText={true} />
          <button className="login-back-pill" onClick={() => navigate('/')}>{t.login.back}</button>
        </div>

        {/* Middle: branding (mobile only — fills the top half) */}
        <div className="login-branding">
          <h1 className="login-headline" style={{ whiteSpace: 'pre-line' }}>{t.login.headline}</h1>
          <p className="login-tagline">{t.login.tagline}</p>
        </div>

        {/* Bottom: form */}
        <div className="login-bottom">
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-fields">
              <input
                className="login-field"
                type="email"
                placeholder={t.login.email}
                value={email}
                autoComplete="email"
                onChange={e => setEmail(e.target.value)}
                required
              />
              <div className="login-divider" />
              <div className="login-pw-row">
                <input
                  className="login-field"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t.login.password}
                  value={password}
                  autoComplete="current-password"
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            {error && <p className="login-error">{error}</p>}

            <Link to="/forgot-password" className="login-forgot">{t.login.forgotPassword}</Link>

            <button
              type="submit"
              className="login-submit-btn"
              disabled={loading || !email || !password}
            >
              {loading ? t.login.signingIn : t.login.logIn}
            </button>
          </form>

          <p className="login-create-hint">
            {t.login.noAccount}{' '}
            <span className="login-create-link" onClick={() => navigate('/register')}>
              {t.login.createOne}
            </span>
          </p>
          <p className="login-legal">
            {t.login.byContinuing}{' '}
            <a href="/terms">{t.login.terms}</a> {t.login.and} <a href="/privacy">{t.login.privacy}</a>.
          </p>
        </div>
      </div>

      {/* ── Right / photo panel ── */}
      <div className="login-photo-panel">
        <img
          className="login-bg"
          src="https://images.unsplash.com/photo-1527184478405-b1cf212ab2a3?w=1200&h=1600&fit=crop&crop=center&q=85&auto=format"
          alt=""
        />
        <div className="login-overlay" />
      </div>

    </div>
  );
};

export default Login;
