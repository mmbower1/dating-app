import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import type { Match } from '../types';
import { useAuth } from '../context/AuthContext';

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

const Matches = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Match[]>('/matches')
      .then((res) => setMatches(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-center">Loading...</div>;

  const match = matches[0] ?? null;
  const otherEntry = match?.users.find((u) => u.userId._id !== user?._id);
  const other = otherEntry?.userId ?? null;

  if (!match || !other) {
    return (
      <div className="page-center">
        <div className="no-match-icon">💜</div>
        <p className="no-match-title">No match yet</p>
        <p className="no-match-sub">Keep discovering — your next connection is out there.</p>
      </div>
    );
  }

  const hrsLeft = hoursUntilExpiry(match.createdAt, match.lastMessageAt);

  return (
    <div className="matches-page">
      <h2>Your Match</h2>

      <div className="match-card">
        {/* Photo */}
        <div className="match-card-photo">
          {other.photos[0] ? (
            <img src={other.photos[0]} alt={other.name} />
          ) : (
            <div className="match-card-no-photo">{other.name[0]}</div>
          )}
          <div className="match-card-photo-overlay">
            <span className="match-card-name">{other.name}{other.age ? `, ${other.age}` : ''}</span>
            <span className="match-card-score">★ {other.accountabilityScore}</span>
          </div>
        </div>

        {/* Body */}
        <div className="match-card-body">
          <div className="match-card-meta">
            <span className="match-card-time">Matched {timeAgo(match.createdAt)}</span>
            {hrsLeft !== null && hrsLeft <= 24 && (
              <span className="match-card-expiry">
                ⚠ {hrsLeft}h left to say hi
              </span>
            )}
          </div>

          {other.bio ? (
            <p className="match-card-bio">{other.bio}</p>
          ) : null}

          <button
            className="match-card-cta"
            onClick={() => navigate(`/chat/${match._id}`)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Start chatting
          </button>
        </div>
      </div>
    </div>
  );
};

export default Matches;
