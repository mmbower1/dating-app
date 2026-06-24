import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import type { Match } from '../types';
import { useAuth } from '../context/AuthContext';

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

  if (loading) return <div className="page-center">Loading matches...</div>;

  if (!matches.length)
    return (
      <div className="page-center">
        <p>No matches yet.</p>
        <p>Keep swiping!</p>
      </div>
    );

  return (
    <div className="matches-page">
      <h2>Your Matches</h2>
      <div className="match-list">
        {matches.map((match) => {
          const other = match.users.find((u) => u._id !== user?._id);
          if (!other) return null;
          return (
            <div
              key={match._id}
              className="match-item"
              onClick={() => navigate(`/chat/${match._id}`)}
            >
              <div className="match-avatar">
                {other.photos[0] ? (
                  <img src={other.photos[0]} alt={other.name} />
                ) : (
                  <div className="no-photo-sm">{other.name[0]}</div>
                )}
              </div>
              <div className="match-details">
                <span className="match-name">{other.name}</span>
                <span className="match-score" title="Accountability score">
                  ★ {other.accountabilityScore}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Matches;
