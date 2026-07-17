import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';

const pillars = [
  {
    title: 'Two connections at a time',
    body: 'Once you have 2 active matches, swiping pauses. Lockheart keeps your focus where it matters.',
  },
  {
    title: 'Graceful goodbyes',
    body: 'Not feeling it? Say why respectfully. Ghosting lowers your accountability score and limits your visibility.',
  },
  {
    title: 'Accountability score',
    body: 'Your score reflects how you treat people — response rate, graceful exits, and ghost count all factor in.',
  },
  {
    title: 'No infinite scrolling',
    body: 'Lockheart isn\'t built for browsing. It\'s built for connecting. Quality over quantity.',
  },
];

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="welcome-page">

      {/* ── Top nav ── */}
      <nav className="welcome-nav">
        <Logo size="sm" showText={true} />
        <div className="welcome-nav-actions">
          <button className="welcome-nav-signin" onClick={() => navigate('/login')}>Sign in</button>
          <button className="welcome-nav-cta" onClick={() => navigate('/register')}>Create account</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="welcome-hero">
        <h1 className="welcome-headline">Dating the way<br />it should be.</h1>
        <p className="welcome-tagline">Real connections. No games. No ghosting.</p>
        <div className="welcome-hero-image">
          <img
            src="https://images.unsplash.com/photo-1496602910407-bacda74a0fe4?w=1400&h=700&fit=crop&q=80&auto=format"
            alt="Couple watching the sunset together"
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
      </section>

    </div>
  );
};

export default Welcome;
