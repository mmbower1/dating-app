import { useEffect, useState } from 'react';
import api from '../api/axios';
import type { User } from '../types';

const Home = () => {
  const [candidates, setCandidates] = useState<User[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    api.get<User[]>('/users/discover')
      .then((res) => setCandidates(res.data))
      .finally(() => setLoading(false));
  }, []);

  const profile = candidates[current];

  const like = async () => {
    if (!profile) return;
    const res = await api.post<{ matched: boolean; matchId?: string }>(`/matches/like/${profile._id}`);
    if (res.data.matched) {
      setFeedback(`It's a match with ${profile.name}! 🎉`);
      setTimeout(() => setFeedback(''), 3000);
    }
    setCurrent((c) => c + 1);
  };

  const pass = async () => {
    if (!profile) return;
    await api.post(`/matches/pass/${profile._id}`);
    setCurrent((c) => c + 1);
  };

  if (loading) return <div className="page-center">Finding people near you...</div>;

  if (!profile)
    return (
      <div className="page-center">
        <p>No more profiles right now.</p>
        <p>Check back later!</p>
      </div>
    );

  return (
    <div className="home-page">
      {feedback && <div className="match-toast">{feedback}</div>}
      <div className="swipe-card">
        <div className="card-photo">
          {profile.photos[0] ? (
            <img src={profile.photos[0]} alt={profile.name} />
          ) : (
            <div className="no-photo">{profile.name[0]}</div>
          )}
          <div className="card-info">
            <div className="card-name-row">
              <span className="card-name">{profile.name}, {profile.age}</span>
              <span className="score-badge" title="Accountability score">
                {profile.accountabilityScore}
              </span>
            </div>
            {profile.bio && <p className="card-bio">{profile.bio}</p>}
          </div>
        </div>
        <div className="swipe-actions">
          <button className="pass-btn" onClick={pass}>✕</button>
          <button className="like-btn" onClick={like}>♥</button>
        </div>
      </div>
    </div>
  );
};

export default Home;
