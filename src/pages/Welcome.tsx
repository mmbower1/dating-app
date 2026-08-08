import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

const pillars = [
  {
    title: 'Two connections at a time',
    body: 'Once you have 2 active matches, swiping pauses. Lockheart keeps your focus where it matters.',
  },
  {
    title: 'Think before you swipe',
    body: 'Swiping on Lockheart carries weight. With limited connections, every swipe is a choice — make it a deliberate one.',
  },
  {
    title: 'A match is a big deal',
    body: 'Getting matched on Lockheart isn\'t a casual thing. It means two people chose each other. Honor that.',
  },
  {
    title: 'Graceful goodbyes',
    body: 'Not feeling it? Say why respectfully. Ghosting lowers your score and limits your visibility.',
  },
  {
    title: 'Integrity score',
    body: 'Your score reflects how you treat people — how often you respond, whether you exit gracefully, and whether you ghost.',
  },
  {
    title: 'No infinite scrolling',
    body: 'Lockheart isn\'t built for browsing. We aren\'t here to keep you hooked. It\'s built for connecting. Quality over quantity.',
  },
];

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
          <span>Tap the <strong>Share</strong> button at the bottom of your browser</span>
          <svg className="ios-share-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
            <polyline points="16 6 12 2 8 6"/>
            <line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
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

      {/* ── Top nav ── */}
      <nav className="welcome-nav">
        <Logo size="sm" showText={true} />
        <div className="welcome-nav-actions">
          {canInstall && (
            <button className="welcome-nav-install" onClick={handleInstall}>Get the app</button>
          )}
          <button className="welcome-nav-signin" onClick={() => navigate('/login')}>Sign in</button>
          <button className="welcome-nav-cta" onClick={() => navigate('/register')}>Create account</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="welcome-hero">
        <h1 className="welcome-headline">Dating - the way<br />it should be.</h1>

        <div className="welcome-hero-image">
          <img
            src="https://images.unsplash.com/photo-1527184478405-b1cf212ab2a3?w=1400&h=700&fit=crop&q=80&auto=format"
            alt="Man and woman facing each other"
          />
        </div>
      </section>

      {/* ── Pillars ── */}
      <section className="welcome-pillars">
        {pillars.map((p) => (
          <div key={p.title} className="welcome-pillar">
            <h3>{p.title}</h3>
            <p>{p.body}</p>
          </div>
        ))}
      </section>

      {/* ── Footer CTA ── */}
      <section className="welcome-footer-cta">
        <h2>Ready to meet someone real?</h2>
        <button className="welcome-cta" onClick={() => navigate('/register')}>Create your profile</button>
        <button className="welcome-secondary" onClick={() => navigate('/login')}>Already have an account? Sign in</button>
        {canInstall && (
          <button className="welcome-install-btn" onClick={handleInstall}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Get the app
          </button>
        )}
      </section>

      {showIOSModal && <IOSInstallModal onClose={() => setShowIOSModal(false)} />}
    </div>
  );
};

export default Welcome;
