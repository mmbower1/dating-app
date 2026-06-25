import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';

const pillars = [
  {
    icon: '💜',
    title: 'One connection at a time',
    body: 'When you match, swiping pauses. Pearl asks you to be present with the person in front of you.',
  },
  {
    icon: '👋',
    title: 'Graceful goodbyes',
    body: 'Not feeling it? Say so respectfully. Ghosting lowers your accountability score and limits your visibility.',
  },
  {
    icon: '⭐',
    title: 'Accountability score',
    body: 'Your score reflects how you treat people — response rate, graceful exits, and ghost count all factor in.',
  },
  {
    icon: '🔒',
    title: 'No infinite scrolling',
    body: 'Pearl isn\'t built for browsing. It\'s built for connecting. Quality over quantity, always.',
  },
];

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="welcome-page">
      <div className="welcome-hero">
        <Logo size="lg" showText={true} />
        <p className="welcome-tagline">Dating the way it should be.</p>
      </div>

      <div className="welcome-pillars">
        {pillars.map((p) => (
          <div key={p.title} className="welcome-pillar">
            <span className="pillar-icon">{p.icon}</span>
            <div>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="welcome-actions">
        <button className="welcome-cta" onClick={() => navigate('/register')}>
          Create account
        </button>
        <button className="welcome-secondary" onClick={() => navigate('/login')}>
          Sign in
        </button>
      </div>
    </div>
  );
};

export default Welcome;
