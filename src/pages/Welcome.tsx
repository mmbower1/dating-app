import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { useLanguage } from '../context/LanguageContext';
import { LANGUAGES } from '../i18n/translations';

const IOSInstallModal = ({ onClose }: { onClose: () => void }) => (
  <div className="ios-install-overlay" onClick={onClose}>
    <div className="ios-install-modal" onClick={(e) => e.stopPropagation()}>
      <button className="ios-install-close" onClick={onClose} aria-label="Close">✕</button>
      <div className="ios-install-icon">
        <img src="/apple-touch-icon.png" alt="Lockheart" width={60} height={60} style={{ borderRadius: 14 }} />
      </div>
      <h3 className="ios-install-title">Add to Home Screen</h3>
      <p className="ios-install-subtitle">Install Lockheart for the full app experience.</p>
      <ol className="ios-install-steps">
        <li>
          <span className="ios-step-num">1</span>
          <span>Tap the <strong>Share</strong> button at the bottom of your browser
            <svg className="ios-share-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
          </span>
        </li>
        <li>
          <span className="ios-step-num">2</span>
          <span>Scroll down and tap <strong>Add to Home Screen</strong></span>
        </li>
        <li>
          <span className="ios-step-num">3</span>
          <span>Tap <strong>Add</strong> in the top right corner</span>
        </li>
      </ol>
    </div>
  </div>
);

const Welcome = () => {
  const navigate = useNavigate();
  const { canInstall, isIOS, triggerInstall } = useInstallPrompt();
  const { language, setLanguage, t } = useLanguage();
  const [showIOSModal, setShowIOSModal] = useState(false);

  const handleInstall = async () => {
    if (isIOS) setShowIOSModal(true);
    else await triggerInstall();
  };

  return (
    <div className="welcome-page">
      <div className="welcome-hero">

        {/* ── Left content panel ── */}
        <div className="welcome-content-panel">
          <div className="welcome-top">
            <Logo size="sm" showText={true} />
            <div className="welcome-lang-picker">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <select
                className="welcome-lang-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value as typeof language)}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>
            {canInstall && (
              <button className="welcome-get-app-btn" onClick={handleInstall}>{t.welcome.getApp}</button>
            )}
          </div>

          <div className="welcome-bottom">
            <h1 className="welcome-headline" style={{ whiteSpace: 'pre-line' }}>{t.welcome.headline}</h1>
            <p className="welcome-tagline">{t.welcome.tagline}</p>

            <div className="welcome-actions">
              <button className="welcome-btn-primary" onClick={() => navigate('/register')}>
                {t.welcome.createAccount}
              </button>
              <button className="welcome-btn-dark" onClick={() => navigate('/login')}>
                {t.welcome.signIn}
              </button>
              <p className="welcome-login-hint">
                {t.welcome.alreadyHaveAccount}{' '}
                <span className="welcome-login-link" onClick={() => navigate('/login')}>{t.welcome.logIn}</span>
              </p>
              <p className="welcome-legal-text">
                {t.welcome.byContinuing}{' '}
                <a href="/terms">{t.welcome.terms}</a> {t.welcome.and} <a href="/privacy">{t.welcome.privacy}</a>.
              </p>
            </div>
          </div>
        </div>

        {/* ── Right photo panel ── */}
        <div className="welcome-photo-panel">
          <img
            className="welcome-bg-img"
            src="https://images.unsplash.com/photo-1527184478405-b1cf212ab2a3?w=1200&h=1600&fit=crop&crop=center&q=85&auto=format"
            alt=""
          />
          <div className="welcome-overlay" />
        </div>

      </div>

      {showIOSModal && <IOSInstallModal onClose={() => setShowIOSModal(false)} />}
    </div>
  );
};

export default Welcome;
