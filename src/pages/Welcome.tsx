import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

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
  const [showIOSModal, setShowIOSModal] = useState(false);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSModal(true);
    } else {
      await triggerInstall();
    }
  };

  return (
    <div className="welcome-page">

      {/* ── Full-screen hero ── */}
      <div className="welcome-hero">
        <img
          className="welcome-bg-img"
          src="https://images.unsplash.com/photo-1527184478405-b1cf212ab2a3?w=1200&h=1600&fit=crop&crop=top&q=85&auto=format"
          alt=""
        />
        <div className="welcome-overlay" />

        {/* Top: logo */}
        <div className="welcome-top">
          <Logo size="sm" showText={true} />
          {canInstall && (
            <button className="welcome-get-app-btn" onClick={handleInstall}>Get the app</button>
          )}
        </div>

        {/* Bottom: headline + buttons */}
        <div className="welcome-bottom">
          <h1 className="welcome-headline">Dating - the way<br />it should be.</h1>
          <p className="welcome-tagline">Two connections at a time.</p>

          <div className="welcome-actions">
            <button className="welcome-btn-primary" onClick={() => navigate('/register')}>
              Create account
            </button>
            <button className="welcome-btn-dark" onClick={() => navigate('/login')}>
              Sign in
            </button>
            <p className="welcome-login-hint">
              Already have an account?{' '}
              <span className="welcome-login-link" onClick={() => navigate('/login')}>Log in</span>
            </p>
            <p className="welcome-legal-text">
              By continuing you agree to our{' '}
              <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </div>

      {showIOSModal && <IOSInstallModal onClose={() => setShowIOSModal(false)} />}
    </div>
  );
};

export default Welcome;
