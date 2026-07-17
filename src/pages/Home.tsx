import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import FiltersModal from '../components/FiltersModal';
import ProfileCard from '../components/ProfileCard';
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

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  left: `${5 + (i * 4.7) % 90}%`,
  delay: `${(i * 0.17) % 1.8}s`,
  duration: `${1.6 + (i * 0.13) % 1.2}s`,
  size: i % 3 === 0 ? 22 : i % 3 === 1 ? 16 : 12,
}));

const MatchCelebration = ({ matchedProfile, onDone }: { matchedProfile: User; onDone: () => void }) => {
  const [showClose, setShowClose] = useState(false);

  useEffect(() => {
    const t = setTimeout(onDone, 7000);
    const t2 = setTimeout(() => setShowClose(true), 4000);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div className="match-celebration">
      {showClose && (
        <button className="match-celebration-close" onClick={onDone} aria-label="Close">✕</button>
      )}

      <div className="match-celebration-particles">
        {PARTICLES.map((p) => (
          <div
            key={p.id}
            className="match-particle"
            style={{ left: p.left, animationDelay: p.delay, animationDuration: p.duration, width: p.size, height: p.size }}
          />
        ))}
      </div>

      <div className="match-celebration-content">
        <div className="match-celebration-photos">
          <div className="match-celebration-photo">
            {matchedProfile.photos[0]
              ? <img src={matchedProfile.photos[0]} alt={matchedProfile.name} />
              : <div className="match-celebration-initial">{matchedProfile.name[0]}</div>}
          </div>
        </div>

        <h1 className="match-celebration-title">It's a match!</h1>
        <p className="match-celebration-sub">You and <strong>{matchedProfile.name}</strong> liked each other.</p>
        <button className="match-celebration-btn" onClick={onDone}>
          Send a message
        </button>
        <p className="match-celebration-skip">Tap anywhere to continue</p>
      </div>
    </div>
  );
};

const Home = () => {
  const { user } = useAuth();
  const socket = useSocket();
  const [candidates, setCandidates] = useState<User[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<User | null>(null);
  const [pendingMatchId, setPendingMatchId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [undoTarget, setUndoTarget] = useState<{ profile: User; idx: number } | null>(null);
  const [exitDir, setExitDir] = useState<'left' | 'right' | null>(null);
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

  useEffect(() => {
    api.get<{ matchId: string; matchedUser: User } | null>('/matches/pending-celebration')
      .then((res) => {
        if (res.data) {
          setMatchedProfile(res.data.matchedUser);
          setPendingMatchId(res.data.matchId);
          setLocked(true);
        }
      })
      .catch(() => {});
  }, []);

  // Fallback: while locked, poll every 3s so the screen unlocks even if the socket event is missed
  useEffect(() => {
    if (!locked) return;
    const interval = setInterval(() => {
      api.get<User[] | { locked: boolean }>('/users/discover').then((res) => {
        if (Array.isArray(res.data)) {
          setLocked(false);
          setCandidates(res.data);
          setCurrent(0);
        }
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [locked]);

  useEffect(() => {
    if (!socket) return;
    const onNewMatch = (data: { matchedUser: User; matchId?: string }) => {
      setMatchedProfile(data.matchedUser);
      if (data.matchId) setPendingMatchId(data.matchId);
      setLocked(true);
    };
    const onMatchEnded = () => {
      setMatchedProfile(null);
      setPendingMatchId(null);
      setLocked(false);
      setCandidates([]);
      setCurrent(0);
      api.get<User[] | { locked: boolean }>('/users/discover').then((res) => {
        if (Array.isArray(res.data)) setCandidates(res.data);
      });
    };
    socket.on('new_match', onNewMatch);
    socket.on('match_ended', onMatchEnded);
    return () => {
      socket.off('new_match', onNewMatch);
      socket.off('match_ended', onMatchEnded);
    };
  }, [socket]);

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

  const advance = () => setCurrent((c) => c + 1);

  const animateThen = (dir: 'left' | 'right', cb: () => void) => {
    setExitDir(dir);
    setTimeout(() => { setExitDir(null); cb(); }, 380);
  };

  const sendLike = async () => {
    if (!profile || exitDir) return;
    const snapshot = profile;
    animateThen('right', async () => {
      const res = await api.post<{ matched: boolean }>(`/matches/like/${snapshot._id}`, {});
      if (res.data.matched) {
        setMatchedProfile(snapshot);
      } else {
        advance();
      }
    });
  };

  const pass = async () => {
    if (!profile || exitDir) return;
    const passed = profile;
    const idx = current;
    animateThen('left', async () => {
      advance();
      setUndoTarget({ profile: passed, idx });
      await api.post(`/matches/pass/${passed._id}`);
    });
  };

  const undoPass = async () => {
    if (!undoTarget) return;
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
        <h2 className="locked-title">You have an active connection!</h2>
        <p className="locked-body">
          Lockheart is built for genuine connections. Focus on the person you matched with before exploring more.
        </p>
        <button className="locked-cta" onClick={() => navigate('/matches')}>
          Go to your match
        </button>
      </div>
    );
  }

  if (matchedProfile) {
    return <MatchCelebration matchedProfile={matchedProfile} onDone={() => {
      if (pendingMatchId) api.patch(`/matches/${pendingMatchId}/celebration-seen`).catch(() => {});
      setMatchedProfile(null);
      setPendingMatchId(null);
      navigate('/matches');
    }} />;
  }

  return (
    <>
      <div className="home-page">
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
          />
        )}
      </div>

      {profile && (
        <div className="pass-bar">
          <button className="pass-btn" onClick={pass} aria-label="Pass">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <button className="like-btn" onClick={sendLike} aria-label="Like">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
