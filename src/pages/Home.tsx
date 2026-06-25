import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import type { User } from '../types';

const Home = () => {
  const [candidates, setCandidates] = useState<User[]>([]);
  const [current, setCurrent] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get<User[] | { locked: boolean }>('/users/discover')
      .then((res) => {
        if (!Array.isArray(res.data) && res.data.locked) {
          setLocked(true);
        } else {
          setCandidates(res.data as User[]);
        }
      })
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
    setPhotoIndex(0);
  };

  const pass = async () => {
    if (!profile) return;
    await api.post(`/matches/pass/${profile._id}`);
    setCurrent((c) => c + 1);
    setPhotoIndex(0);
  };

  const prevPhoto = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIndex((i) => Math.max(0, i - 1));
  }, []);

  const nextPhoto = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!profile) return;
    setPhotoIndex((i) => Math.min(profile.photos.length - 1, i + 1));
  }, [profile]);

  if (loading) return <div className="page-center">Finding people near you...</div>;

  if (locked) {
    return (
      <div className="page-center locked-state">
        <div className="locked-icon">💜</div>
        <h2 className="locked-title">You have an active connection</h2>
        <p className="locked-body">
          Pearl is built for genuine connections. Focus on the person you matched with before exploring more.
        </p>
        <button className="locked-cta" onClick={() => navigate('/matches')}>
          Go to your match
        </button>
      </div>
    );
  }

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
          {profile.photos.length > 0 ? (
            <>
              <img src={profile.photos[photoIndex]} alt={profile.name} />
              {profile.photos.length > 1 && (
                <>
                  <div className="photo-dots">
                    {profile.photos.map((_, i) => (
                      <span key={i} className={`photo-dot ${i === photoIndex ? 'active' : ''}`} />
                    ))}
                  </div>
                  {photoIndex > 0 && (
                    <button className="photo-nav photo-nav-left" onClick={prevPhoto}>‹</button>
                  )}
                  {photoIndex < profile.photos.length - 1 && (
                    <button className="photo-nav photo-nav-right" onClick={nextPhoto}>›</button>
                  )}
                </>
              )}
            </>
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
