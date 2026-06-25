import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import FiltersModal from '../components/FiltersModal';
import type { User } from '../types';

/* ── Icons ──────────────────────────────────────────── */
const SlidersIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
    <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
    <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/>
    <line x1="17" y1="16" x2="23" y2="16"/>
  </svg>
);


const HeartIcon = ({ filled = false }: { filled?: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

/* ── Helpers ─────────────────────────────────────────── */
function inToDisplay(inches: number) {
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

function buildAbout(profile: User): string[] {
  const chips: string[] = [];
  chips.push(`${profile.age}`);
  chips.push(profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1));
  if (profile.height) chips.push(inToDisplay(profile.height));
  if (profile.location?.city) chips.push(`${profile.location.city}${profile.location.state ? `, ${profile.location.state}` : ''}`);
  if (profile.hasChildren != null) chips.push(profile.hasChildren ? 'Has kids' : 'No kids');
  if (profile.pets) chips.push(profile.pets);
  if (profile.zodiacSign) chips.push(profile.zodiacSign);
  return chips;
}

function buildDetails(profile: User): string[] {
  const chips: string[] = [];
  if (profile.educationLevel) chips.push(profile.educationLevel);
  if (profile.jobTitle) chips.push(profile.jobTitle);
  if (profile.drinks) chips.push(`Drinks ${profile.drinks.toLowerCase()}`);
  if (profile.smokes) chips.push(`Smokes ${profile.smokes.toLowerCase()}`);
  if (profile.religion) chips.push(profile.religion);
  if (profile.politicalAssociation) chips.push(profile.politicalAssociation);
  if (profile.familyPlans) chips.push(profile.familyPlans);
  return chips;
}

/* ── Like sheet ──────────────────────────────────────── */
interface LikeSheetProps {
  label: string;
  onSend: (comment: string) => void;
  onCancel: () => void;
}

const LikeSheet = ({ label, onSend, onCancel }: LikeSheetProps) => {
  const [comment, setComment] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 120);
  }, []);

  return (
    <div className="like-sheet-overlay" onClick={onCancel}>
      <div className="like-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="like-sheet-label">
          <span className="like-sheet-heart"><HeartIcon filled /></span>
          <span>{label}</span>
        </div>
        <textarea
          ref={inputRef}
          className="like-sheet-input"
          placeholder="Add a comment… (optional)"
          maxLength={200}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(comment); } }}
        />
        <div className="like-sheet-actions">
          <button className="like-sheet-cancel" onClick={onCancel}>Cancel</button>
          <button className="like-sheet-send" onClick={() => onSend(comment)}>
            <HeartIcon filled /> Send
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Heart button ─────────────────────────────────────── */
const HeartBtn = ({ onClick, onPhoto = false }: { onClick: () => void; onPhoto?: boolean }) => (
  <button
    className={`heart-btn ${onPhoto ? 'heart-btn--photo' : ''}`}
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    aria-label="Like"
  >
    <HeartIcon />
  </button>
);

/* ── Main component ───────────────────────────────────── */
const Home = () => {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<User[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [likeTarget, setLikeTarget] = useState<string | null>(null);
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

  const advance = () => {
    setCurrent((c) => c + 1);
    setLikeTarget(null);
  };

  const sendLike = async (comment: string) => {
    if (!profile) return;
    const res = await api.post<{ matched: boolean }>(`/matches/like/${profile._id}`, {
      comment: comment.trim() || undefined,
    });
    if (res.data.matched) {
      setFeedback(`It's a match with ${profile.name}! 💜`);
      setTimeout(() => setFeedback(''), 3500);
    }
    advance();
  };

  const pass = async () => {
    if (!profile) return;
    await api.post(`/matches/pass/${profile._id}`);
    advance();
  };


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
          const about = buildAbout(profile);
          const details = buildDetails(profile);
          const extraPhotos = profile.photos.slice(1);
          return (
            <div className="pcard-stack">

              {/* Photo 1 */}
              <div className="pcard-item pcard-item--photo">
                {profile.photos.length > 0 ? (
                  <img src={profile.photos[0]} alt={profile.name} className="pcard-photo-img" />
                ) : (
                  <div className="pcard-no-photo">{profile.name[0]}</div>
                )}
                <HeartBtn onPhoto onClick={() => setLikeTarget(`${profile.name}'s photo`)} />
              </div>

              {/* Identity */}
              <div className="pcard-item pcard-item--identity">
                <div className="pcard-name-row">
                  <span className="pcard-name">{profile.name}</span>
                  <span className="pcard-score" title="Accountability score">{profile.accountabilityScore}</span>
                </div>
              </div>

              {/* About — age, gender, height, location, kids, pets, zodiac */}
              <div className="pcard-item pcard-item--text">
                <div className="pcard-detail-chips">
                  {about.map((label) => (
                    <span key={label} className="pcard-detail-chip">{label}</span>
                  ))}
                </div>
              </div>

              {/* Photo 2 */}
              {extraPhotos[0] && (
                <div className="pcard-item pcard-item--photo">
                  <img src={extraPhotos[0]} alt={`${profile.name} 2`} className="pcard-photo-img" />
                  <HeartBtn onPhoto onClick={() => setLikeTarget(`${profile.name}'s photo`)} />
                </div>
              )}

              {/* Bio — below photo 2 */}
              {profile.bio && (
                <div className="pcard-item pcard-item--text">
                  <div className="pcard-section-heart-row">
                    <HeartBtn onClick={() => setLikeTarget(`${profile.name}'s bio`)} />
                  </div>
                  <p className="pcard-bio">{profile.bio}</p>
                </div>
              )}

              {/* Photo 3+ */}
              {extraPhotos.slice(1).map((photo, i) => (
                <div key={i} className="pcard-item pcard-item--photo">
                  <img src={photo} alt={`${profile.name} ${i + 3}`} className="pcard-photo-img" />
                  <HeartBtn onPhoto onClick={() => setLikeTarget(`${profile.name}'s photo`)} />
                </div>
              ))}

              {/* Lifestyle details */}
              {details.length > 0 && (
                <div className="pcard-item pcard-item--text">
                  <div className="pcard-section-heart-row">
                    <HeartBtn onClick={() => setLikeTarget(`${profile.name}'s details`)} />
                  </div>
                  <div className="pcard-detail-chips">
                    {details.map((label) => (
                      <span key={label} className="pcard-detail-chip">{label}</span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ height: 8 }} />
            </div>
          );
        })()}
      </div>

      {/* Fixed pass button — bottom left */}
      {profile && (
        <div className="pass-bar">
          <button className="pass-btn" onClick={pass} aria-label="Pass">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      {/* Like sheet */}
      {likeTarget && (
        <LikeSheet
          label={likeTarget}
          onSend={sendLike}
          onCancel={() => setLikeTarget(null)}
        />
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
