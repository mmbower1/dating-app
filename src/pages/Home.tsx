import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import FiltersModal from '../components/FiltersModal';
import type { User } from '../types';

const SlidersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
    <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
    <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/>
    <line x1="17" y1="16" x2="23" y2="16"/>
  </svg>
);

const Home = () => {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<User[]>([]);
  const [current, setCurrent] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  const fetchCandidates = useCallback(() => {
    setLoading(true);
    api.get<User[] | { locked: boolean }>('/users/discover')
      .then((res) => {
        if (!Array.isArray(res.data) && res.data.locked) {
          setLocked(true);
        } else {
          setCandidates(res.data as User[]);
          setCurrent(0);
          setPhotoIndex(0);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);

  const activeFilterCount = (() => {
    if (!user) return 0;
    let n = 0;
    if (user.interestedIn?.length > 0 && user.interestedIn.length < 4) n++;
    if (user.agePreference && (user.agePreference.min > 18 || user.agePreference.max < 99)) n++;
    const f = user.filters;
    if (!f) return n;
    if (f.maxDistance != null) n++;
    if (f.ethnicities?.length) n++;
    if (f.religions?.length) n++;
    if (f.heightMin != null || f.heightMax != null) n++;
    if (f.hasChildren && f.hasChildren !== 'any') n++;
    if (f.drinks?.length) n++;
    if (f.smokes?.length) n++;
    if (f.politicalAssociations?.length) n++;
    if (f.educationLevels?.length) n++;
    return n;
  })();

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

  return (
    <>
      <div className="home-page">
        {feedback && <div className="match-toast">{feedback}</div>}

        <div className="discover-topbar">
          <button className="filter-btn" onClick={() => setShowFilters(true)}>
            <SlidersIcon />
            Filters
            {activeFilterCount > 0 && <span className="filter-badge">{activeFilterCount}</span>}
          </button>
        </div>

        {!profile ? (
          <div className="page-center" style={{ flex: 1 }}>
            <p>No more profiles right now.</p>
            <p>Check back later!</p>
          </div>
        ) : (
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
        )}
      </div>

      {showFilters && (
        <FiltersModal
          onClose={() => setShowFilters(false)}
          onApply={() => { setShowFilters(false); fetchCandidates(); }}
        />
      )}
    </>
  );
};

export default Home;
