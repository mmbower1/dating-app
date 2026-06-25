import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import FiltersModal from '../components/FiltersModal';
import type { User } from '../types';

const SlidersIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
    <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
    <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/>
    <line x1="17" y1="16" x2="23" y2="16"/>
  </svg>
);

const LocationIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);

function inToDisplay(inches: number) {
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

const DETAIL_ICONS: Record<string, string> = {
  height: '↕',
  education: '🎓',
  drinks: '🍷',
  smokes: '🚬',
  children: '👶',
  religion: '✦',
  politics: '🗳',
};

interface DetailChip { icon: string; label: string; }

function buildDetails(profile: User): DetailChip[] {
  const chips: DetailChip[] = [];
  if (profile.height) chips.push({ icon: DETAIL_ICONS.height, label: inToDisplay(profile.height) });
  if (profile.educationLevel) chips.push({ icon: DETAIL_ICONS.education, label: profile.educationLevel });
  if (profile.drinks) chips.push({ icon: DETAIL_ICONS.drinks, label: profile.drinks });
  if (profile.smokes) chips.push({ icon: DETAIL_ICONS.smokes, label: profile.smokes });
  if (profile.hasChildren != null) chips.push({ icon: DETAIL_ICONS.children, label: profile.hasChildren ? 'Has kids' : 'No kids' });
  if (profile.religion) chips.push({ icon: DETAIL_ICONS.religion, label: profile.religion });
  if (profile.politicalAssociation) chips.push({ icon: DETAIL_ICONS.politics, label: profile.politicalAssociation });
  return chips;
}

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

  const tapPhoto = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!profile || profile.photos.length <= 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 2) {
      setPhotoIndex((i) => Math.max(0, i - 1));
    } else {
      setPhotoIndex((i) => Math.min(profile.photos.length - 1, i + 1));
    }
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
        ) : (() => {
          const details = buildDetails(profile);
          return (
            <div className="pcard">
              {/* Primary photo with tap zones */}
              <div className="pcard-photo-wrap" onClick={tapPhoto}>
                {profile.photos.length > 0 ? (
                  <img src={profile.photos[photoIndex]} alt={profile.name} className="pcard-photo-img" />
                ) : (
                  <div className="pcard-no-photo">{profile.name[0]}</div>
                )}
                {profile.photos.length > 1 && (
                  <div className="pcard-photo-bars">
                    {profile.photos.map((_, i) => (
                      <span key={i} className={`pcard-bar ${i === photoIndex ? 'active' : ''}`} />
                    ))}
                  </div>
                )}
              </div>

              {/* Identity */}
              <div className="pcard-identity">
                <div className="pcard-name-row">
                  <span className="pcard-name">{profile.name}, {profile.age}</span>
                  <span className="pcard-score" title="Accountability score">{profile.accountabilityScore}</span>
                </div>
                {profile.location?.city && (
                  <span className="pcard-location">
                    <LocationIcon />
                    {profile.location.city}{profile.location.state ? `, ${profile.location.state}` : ''}
                  </span>
                )}
              </div>

              {/* Bio */}
              {profile.bio && (
                <div className="pcard-section pcard-bio-section">
                  <p className="pcard-bio">{profile.bio}</p>
                </div>
              )}

              {/* Details chips */}
              {details.length > 0 && (
                <div className="pcard-section pcard-details-section">
                  <div className="pcard-detail-chips">
                    {details.map((d) => (
                      <span key={d.label} className="pcard-detail-chip">
                        <span className="pcard-chip-icon">{d.icon}</span>
                        {d.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional photos shown below as sections */}
              {profile.photos.slice(1).map((photo, i) => (
                <div key={i} className="pcard-extra-photo">
                  <img src={photo} alt={`${profile.name} ${i + 2}`} />
                </div>
              ))}

              {/* Spacer so content isn't hidden behind fixed buttons */}
              <div className="pcard-bottom-space" />
            </div>
          );
        })()}
      </div>

      {/* Fixed action bar */}
      {profile && (
        <div className="swipe-actions-fixed">
          <button className="pass-btn" onClick={pass} aria-label="Pass">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <button className="like-btn" onClick={like} aria-label="Like">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>
      )}

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
