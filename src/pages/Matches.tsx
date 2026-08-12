import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import type { Match, User } from '../types';
import { useAuth } from '../context/AuthContext';
import ProfileCard from '../components/ProfileCard';
import { useLanguage } from '../context/LanguageContext';

function scoreColor(score: number): string {
  if (score >= 95) return '#48bb78';
  if (score >= 90) return '#68d391';
  if (score >= 85) return '#9ae05a';
  if (score >= 80) return '#c6e04a';
  if (score >= 75) return '#ecc94b';
  if (score >= 70) return '#ed8936';
  return '#fc8181';
}

function formatMatchDate(dateStr: string) {
  const d = new Date(dateStr);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(2);
  return `on ${mm}/${dd}/${yy}`;
}

function hoursUntilExpiry(createdAt: string, lastMessageAt: string | null) {
  if (lastMessageAt) return null;
  const matchedAt = new Date(createdAt).getTime();
  const expiresAt = matchedAt + 72 * 60 * 60 * 1000;
  const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 36e5));
  return remaining;
}

const MAX_MATCHES = 2;

const Matches = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [matches, setMatches] = useState<Match[]>([]);
  const [likedMe, setLikedMe] = useState<User[]>([]);
  const [likedMeAction, setLikedMeAction] = useState<string | null>(null);
  const [likedMeError, setLikedMeError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState<string | null>(null);
  const [likedMePreview, setLikedMePreview] = useState<User | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<Match[]>('/matches'),
      api.get<User[]>('/matches/liked-me'),
    ]).then(([matchRes, likedRes]) => {
      setMatches(matchRes.data);
      setLikedMe(likedRes.data);
    }).finally(() => setLoading(false));
  }, []);

  const handleLikeBack = async (target: User) => {
    setLikedMeAction(target._id);
    setLikedMeError(null);
    try {
      await api.post(`/matches/like/${target._id}`);
      setLikedMe((prev) => prev.filter((u) => u._id !== target._id));
      const res = await api.get<Match[]>('/matches');
      setMatches(res.data);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        setLikedMeError('You have 2 active matches — close one before liking someone new.');
      } else {
        setLikedMeError('Something went wrong. Please try again.');
      }
    } finally {
      setLikedMeAction(null);
    }
  };

  const handlePass = async (target: User) => {
    setLikedMeAction(target._id);
    try {
      await api.post(`/matches/pass/${target._id}`);
    } finally {
      setLikedMe((prev) => prev.filter((u) => u._id !== target._id));
      setLikedMeAction(null);
    }
  };

  if (loading) return <div className="page-center">{t.common.loading}</div>;

  const emptySlots = MAX_MATCHES - matches.length;
  const profileMatch = showProfile ? matches.find((m) => m._id === showProfile) : null;
  const profileOther = profileMatch?.users.find((u) => u.userId._id !== user?._id)?.userId ?? null;

  return (
    <div className="matches-page">

      {/* ── Liked You ── */}
      {likedMeError && (
        <div className="liked-me-error">{likedMeError}</div>
      )}
      {likedMe.length > 0 && (
        <div className="liked-me-section">
          <h3 className="liked-me-heading">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            {t.matches.likedYou}
          </h3>
          {likedMe.map((person) => (
            <div key={person._id} className="liked-me-card">
              <div className="liked-me-photo" onClick={() => setLikedMePreview(person)}>
                {person.photos[0]
                  ? <img src={person.photos[0]} alt={person.name} />
                  : <div className="liked-me-initial">{person.name[0]}</div>}
              </div>
              <div className="liked-me-info" onClick={() => setLikedMePreview(person)}>
                <span className="liked-me-name">{person.name}, {person.age}</span>
                {person.bio && <p className="liked-me-bio">{person.bio}</p>}
              </div>
              <div className="liked-me-actions">
                <button
                  className="liked-me-btn liked-me-btn--pass"
                  disabled={likedMeAction === person._id}
                  onClick={() => handlePass(person)}
                  aria-label="Pass"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
                <button
                  className="liked-me-btn liked-me-btn--like"
                  disabled={likedMeAction === person._id}
                  onClick={() => handleLikeBack(person)}
                  aria-label="Like back"
                >
                  {likedMeAction === person._id ? '…' : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2>{matches.length === 0 && likedMe.length === 0 ? '' : t.matches.yourMatches}</h2>

      {matches.length === 0 && likedMe.length === 0 && (
        <div className="page-center">
          <div className="no-match-icon">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M32 56S6 38.5 6 20.5C6 13.1 11.8 7 19 7c4.8 0 9 2.6 11.5 6.5L32 16l1.5-2.5C36 9.6 40.2 7 45 7c7.2 0 13 6.1 13 13.5C58 38.5 32 56 32 56Z" fill="none" stroke="white" strokeWidth="3" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="no-match-title">{t.matches.noMatchesYet}</p>
          <p className="no-match-sub">{t.matches.rightPersonWorth}</p>
          <p className="no-match-note">{t.matches.focusNote}</p>
        </div>
      )}

      <div className="matches-grid">
        {matches.map((match) => {
          const otherEntry = match.users.find((u) => u.userId._id !== user?._id);
          const other = otherEntry?.userId ?? null;
          if (!other) return null;
          const hrsLeft = hoursUntilExpiry(match.createdAt, match.lastMessageAt);

          return (
            <div key={match._id} className="match-card">
              <div className="match-card-photo">
                {other.photos[0] ? (
                  <img src={other.photos[0]} alt={other.name} />
                ) : (
                  <div className="match-card-no-photo">{other.name[0]}</div>
                )}
                {match.unreadCount > 0 && (
                  <div className="match-card-unread-badge">{match.unreadCount}</div>
                )}
                <div className="match-card-photo-overlay">
                  <span className="match-card-name">{other.name}{other.age ? `, ${other.age}` : ''}</span>
                  <span className="match-card-score" style={{ color: scoreColor(other.accountabilityScore) }}>{other.accountabilityScore}</span>
                </div>
                <button className="match-card-view-btn" onClick={() => setShowProfile(match._id)} aria-label="View profile">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
              </div>

              <div className="match-card-body">
                <div className="match-card-meta">
                  <span className="match-card-time">{t.matches.matchedOn} {formatMatchDate(match.createdAt)}</span>
                  {hrsLeft !== null && hrsLeft <= 24 && (
                    <span className="match-card-expiry">⚠ {hrsLeft}{t.matches.hoursLeft}</span>
                  )}
                </div>
                {other.bio && <p className="match-card-bio">{other.bio}</p>}
                <button className="match-card-cta" onClick={() => navigate(`/chat/${match._id}`)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  {t.matches.sendMessage}
                </button>
              </div>
            </div>
          );
        })}

        {Array.from({ length: emptySlots }).map((_, i) => (
          <div key={`empty-${i}`} className="match-card match-card--empty">
            <div className="match-card-empty-inner">
              <div className="match-card-empty-plus">+</div>
              <p className="match-card-empty-text">{t.matches.oneMoreAvailable}</p>
            </div>
          </div>
        ))}
      </div>

      {profileOther && (
        <div className="preview-overlay">
          <div className="preview-overlay-header">
            <span className="preview-overlay-label">{profileOther.name}'s profile</span>
            <button className="preview-close-btn" onClick={() => setShowProfile(null)}>✕ Close</button>
          </div>
          <div className="preview-scroll">
            <ProfileCard profile={profileOther} />
          </div>
        </div>
      )}

      {likedMePreview && (
        <div className="preview-overlay">
          <div className="preview-overlay-header">
            <span className="preview-overlay-label">{likedMePreview.name}'s profile</span>
            <button className="preview-close-btn" onClick={() => setLikedMePreview(null)}>✕ Close</button>
          </div>
          <div className="preview-scroll">
            <ProfileCard profile={likedMePreview} />
          </div>
          <div className="liked-me-preview-actions">
            <button
              className="liked-me-btn liked-me-btn--pass liked-me-btn--lg"
              onClick={() => { handlePass(likedMePreview); setLikedMePreview(null); }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Pass
            </button>
            <button
              className="liked-me-btn liked-me-btn--like liked-me-btn--lg"
              onClick={() => { handleLikeBack(likedMePreview); setLikedMePreview(null); }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              Like back
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Matches;
