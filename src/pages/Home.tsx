import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import FiltersModal from '../components/FiltersModal';
import ProfileCard from '../components/ProfileCard';
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
  const [undoTarget, setUndoTarget] = useState<{ profile: User; idx: number } | null>(null);
  const [exitDir, setExitDir] = useState<'left' | 'right' | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const animateThen = (dir: 'left' | 'right', cb: () => void) => {
    setExitDir(dir);
    setTimeout(() => {
      setExitDir(null);
      cb();
    }, 380);
  };

  const sendLike = async (comment: string) => {
    if (!profile || exitDir) return;
    const snapshot = profile;
    animateThen('right', async () => {
      const res = await api.post<{ matched: boolean }>(`/matches/like/${snapshot._id}`, {
        comment: comment.trim() || undefined,
      });
      if (res.data.matched) {
        setFeedback(`It's a match with ${snapshot.name}! 💜`);
        setTimeout(() => setFeedback(''), 3500);
      }
      advance();
    });
  };

  const pass = async () => {
    if (!profile || exitDir) return;
    const passed = profile;
    const idx = current;
    animateThen('left', async () => {
      advance();
      setUndoTarget({ profile: passed, idx });
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => setUndoTarget(null), 5000);
      await api.post(`/matches/pass/${passed._id}`);
    });
  };

  const undoPass = async () => {
    if (!undoTarget) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    try {
      await api.delete(`/matches/pass/${undoTarget.profile._id}`);
      setCandidates((prev) => {
        const next = [...prev];
        next.splice(undoTarget.idx, 0, undoTarget.profile);
        return next;
      });
      setCurrent(undoTarget.idx);
    } finally {
      setUndoTarget(null);
    }
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
          <button
            className={`undo-btn ${undoTarget ? 'undo-btn--active' : ''}`}
            onClick={undoPass}
            disabled={!undoTarget}
            aria-label="Undo pass"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
          </button>
        </div>

        {!profile ? (
          <div className="page-center" style={{ flex: 1 }}>
            <p>No more profiles right now.</p>
            <p>Check back later!</p>
          </div>
        ) : (
          <ProfileCard
            profile={profile}
            className={exitDir ? `pcard-stack--exit-${exitDir}` : undefined}
            onHeart={(label) => setLikeTarget(label)}
          />
        )}
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
