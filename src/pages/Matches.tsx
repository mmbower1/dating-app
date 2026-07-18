import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import type { Match } from '../types';
import { useAuth } from '../context/AuthContext';
import ProfileCard from '../components/ProfileCard';

function scoreColor(score: number): string {
  if (score >= 95) return '#48bb78';
  if (score >= 90) return '#68d391';
  if (score >= 85) return '#9ae05a';
  if (score >= 80) return '#c6e04a';
  if (score >= 75) return '#ecc94b';
  if (score >= 70) return '#ed8936';
  return '#fc8181';
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hrs = Math.floor(diff / 36e5);
  if (hrs < 1) return 'just now';
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
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
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState<string | null>(null);

  useEffect(() => {
    api.get<Match[]>('/matches')
      .then((res) => setMatches(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-center">Loading...</div>;

  if (matches.length === 0) {
    return (
      <div className="page-center">
        <div className="no-match-icon">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M32 56S6 38.5 6 20.5C6 13.1 11.8 7 19 7c4.8 0 9 2.6 11.5 6.5L32 16l1.5-2.5C36 9.6 40.2 7 45 7c7.2 0 13 6.1 13 13.5C58 38.5 32 56 32 56Z" fill="none" stroke="white" strokeWidth="3" strokeLinejoin="round"/>
          </svg>
        </div>
        <p className="no-match-title">No matches yet</p>
        <p className="no-match-sub">The right person is worth the wait.</p>
        <p className="no-match-note">Once you have 2 active matches, swiping pauses so you can give them your full attention.</p>
      </div>
    );
  }

  const emptySlots = MAX_MATCHES - matches.length;
  const profileMatch = showProfile ? matches.find((m) => m._id === showProfile) : null;
  const profileOther = profileMatch?.users.find((u) => u.userId._id !== user?._id)?.userId ?? null;

  return (
    <div className="matches-page">
      <h2>Your Matches</h2>

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
                  <span className="match-card-time">Matched {timeAgo(match.createdAt)}</span>
                  {hrsLeft !== null && hrsLeft <= 24 && (
                    <span className="match-card-expiry">⚠ {hrsLeft}h left to say hi</span>
                  )}
                </div>
                {other.bio && <p className="match-card-bio">{other.bio}</p>}
                <button className="match-card-cta" onClick={() => navigate(`/chat/${match._id}`)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  Send message
                </button>
              </div>
            </div>
          );
        })}

        {Array.from({ length: emptySlots }).map((_, i) => (
          <div key={`empty-${i}`} className="match-card match-card--empty">
            <div className="match-card-empty-inner">
              <div className="match-card-empty-plus">+</div>
              <p className="match-card-empty-text">1 more match available</p>
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
    </div>
  );
};

export default Matches;
