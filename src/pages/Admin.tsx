import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

interface AdminMatch {
  _id: string;
  users: { userId: string; name: string; photo: string; model: string }[];
  active: boolean;
  createdAt: string;
  endReason: string | null;
}

interface AdminMessage {
  _id: string;
  matchId: string;
  senderId: string;
  text: string;
  createdAt: string;
}

interface SwipeEntry {
  _id: string;
  name: string;
  gender: string;
}

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  gender: string;
  age: number;
  accountabilityScore: number;
  likedUsers: string[];
  passedUsers: string[];
}

type Tab = 'matches' | 'messages' | 'users';

/* ── User row with inline score editor ─────────────────── */
const UserRow = ({ u, onRescore, onManage, onScoreChange }: {
  u: AdminUser;
  onRescore: () => void;
  onManage: () => void;
  onScoreChange: () => void;
}) => {
  const [score, setScore] = useState(u.accountabilityScore ?? 100);
  const [saving, setSaving] = useState(false);

  const saveScore = async () => {
    const clamped = Math.max(1, Math.min(100, score));
    setSaving(true);
    await api.patch(`/admin/users/${u._id}/score`, { score: clamped });
    setSaving(false);
    onScoreChange();
  };

  return (
    <div className="admin-row">
      <div className="admin-row-info">
        <span className="admin-names">{u.name}</span>
        <span className="admin-date">{u.gender} · {u.age} · {u.email}</span>
        <span className="admin-badge ended">
          {u.likedUsers?.length ?? 0} liked · {u.passedUsers?.length ?? 0} passed
        </span>
      </div>
      <div className="admin-row-controls">
        <input
          type="number"
          min={1}
          max={100}
          value={score}
          onChange={(e) => setScore(Number(e.target.value))}
          className="admin-score-input"
        />
        <button className="admin-rescore-btn" style={{ marginTop: 0 }} onClick={saveScore} disabled={saving}>
          {saving ? '…' : 'Set'}
        </button>
        <button className="admin-rescore-btn" style={{ marginTop: 0 }} onClick={onRescore}>↻</button>
        <button className="admin-swipes-btn" onClick={onManage}>Manage swipes</button>
      </div>
    </div>
  );
};

/* ── Swipe history panel for one user ──────────────────── */
const SwipePanel = ({ user, onClose }: { user: AdminUser; onClose: () => void }) => {
  const [liked, setLiked] = useState<SwipeEntry[]>([]);
  const [passed, setPassed] = useState<SwipeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ liked: SwipeEntry[]; passed: SwipeEntry[] }>(`/admin/users/${user._id}/swipes`)
      .then((r) => { setLiked(r.data.liked); setPassed(r.data.passed); })
      .finally(() => setLoading(false));
  }, [user._id]);

  const remove = async (list: 'liked' | 'passed', targetId: string) => {
    await api.delete(`/admin/users/${user._id}/swipes/${list}/${targetId}`);
    if (list === 'liked') setLiked((p) => p.filter((x) => x._id !== targetId));
    else setPassed((p) => p.filter((x) => x._id !== targetId));
  };

  const clearAll = async () => {
    if (!window.confirm(`Clear ALL swipes for ${user.name}?`)) return;
    await api.delete(`/admin/users/${user._id}/swipes`);
    setLiked([]);
    setPassed([]);
  };

  return (
    <div className="swipe-panel">
      <div className="swipe-panel-header">
        <span className="swipe-panel-title">Swipe history — {user.name}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="admin-clear-btn" onClick={clearAll}>Clear all</button>
          <button className="admin-close-btn" onClick={onClose}>✕</button>
        </div>
      </div>

      {loading ? <p className="admin-empty">Loading…</p> : (
        <>
          <p className="swipe-list-label">Liked ({liked.length})</p>
          {liked.length === 0 ? <p className="admin-empty">None</p> : (
            <div className="swipe-list">
              {liked.map((u) => (
                <div key={u._id} className="swipe-entry">
                  <span>{u.name} <span className="swipe-entry-gender">({u.gender})</span></span>
                  <button className="swipe-remove-btn" onClick={() => remove('liked', u._id)}>Remove</button>
                </div>
              ))}
            </div>
          )}

          <p className="swipe-list-label" style={{ marginTop: 14 }}>Passed ({passed.length})</p>
          {passed.length === 0 ? <p className="admin-empty">None</p> : (
            <div className="swipe-list">
              {passed.map((u) => (
                <div key={u._id} className="swipe-entry">
                  <span>{u.name} <span className="swipe-entry-gender">({u.gender})</span></span>
                  <button className="swipe-remove-btn" onClick={() => remove('passed', u._id)}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

/* ── Main Admin page ──────────────────────────────────── */
const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('matches');
  const [matches, setMatches] = useState<AdminMatch[]>([]);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.isAdmin) { navigate('/'); return; }
    fetchAll();
  }, [user]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [mRes, msgRes, uRes] = await Promise.all([
        api.get<AdminMatch[]>('/admin/matches'),
        api.get<AdminMessage[]>('/admin/messages'),
        api.get<{ males: AdminUser[]; females: AdminUser[]; others: AdminUser[] }>('/admin/users'),
      ]);
      setMatches(mRes.data);
      setMessages(msgRes.data);
      setUsers([...uRes.data.males, ...uRes.data.females, ...uRes.data.others]);
    } catch {
      setError('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const deleteMatch = async (id: string) => {
    if (!window.confirm('Delete this match and all its messages?')) return;
    await api.delete(`/admin/matches/${id}`);
    setMatches((prev) => prev.filter((m) => m._id !== id));
    setMessages((prev) => prev.filter((m) => m.matchId !== id));
  };

  const deleteMessage = async (id: string) => {
    if (!window.confirm('Delete this message?')) return;
    await api.delete(`/admin/messages/${id}`);
    setMessages((prev) => prev.filter((m) => m._id !== id));
  };

  const fullWipe = async () => {
    if (!window.confirm('⚠️ Full wipe: delete ALL matches, messages, and swipe history for every user? This cannot be undone.')) return;
    await api.delete('/admin/wipe');
    setMatches([]);
    setMessages([]);
  };

  const rescoreAll = async () => {
    const res = await api.post<{ rescored: number }>('/admin/rescore');
    alert(`Rescored ${res.data.rescored} users.`);
    fetchAll();
  };

  if (!user?.isAdmin) return null;
  if (loading) return <div className="page-center">Loading...</div>;
  if (error) return <div className="page-center">{error}</div>;

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Admin Panel</h1>
        <p className="admin-counts">
          {matches.length} matches &nbsp;·&nbsp; {messages.length} messages &nbsp;·&nbsp; {users.length} users
        </p>
        <button className="admin-rescore-btn" onClick={rescoreAll}>
          ↻ Rescore all
        </button>
        <button className="admin-wipe-btn" onClick={fullWipe}>
          🗑 Full wipe
        </button>
      </div>

      <div className="admin-tabs">
        <button className={`admin-tab ${tab === 'matches' ? 'active' : ''}`} onClick={() => setTab('matches')}>
          Matches ({matches.length})
        </button>
        <button className={`admin-tab ${tab === 'messages' ? 'active' : ''}`} onClick={() => setTab('messages')}>
          Messages ({messages.length})
        </button>
        <button className={`admin-tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
          Users ({users.length})
        </button>
      </div>

      {tab === 'matches' && (
        <div className="admin-list">
          {matches.length === 0 && <p className="admin-empty">No matches yet.</p>}
          {matches.map((match) => (
            <div key={match._id} className="admin-row">
              <div className="admin-row-info">
                <span className={`admin-badge ${match.active ? 'active' : 'ended'}`}>
                  {match.active ? 'Active' : match.endReason ?? 'Ended'}
                </span>
                <span className="admin-names">{match.users.map((u) => u.name).join(' & ')}</span>
                <span className="admin-date">{new Date(match.createdAt).toLocaleDateString()}</span>
              </div>
              <button className="admin-delete-btn" onClick={() => deleteMatch(match._id)}>Delete</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'messages' && (
        <div className="admin-list">
          {messages.length === 0 && <p className="admin-empty">No messages yet.</p>}
          {messages.map((msg) => (
            <div key={msg._id} className="admin-row">
              <div className="admin-row-info">
                <span className="admin-msg-text">"{msg.text}"</span>
                <span className="admin-date">{new Date(msg.createdAt).toLocaleDateString()}</span>
              </div>
              <button className="admin-delete-btn" onClick={() => deleteMessage(msg._id)}>Delete</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'users' && (
        <div className="admin-list">
          {users.length === 0 && <p className="admin-empty">No users.</p>}
          {users.map((u) => (
            <UserRow key={u._id} u={u} onRescore={async () => { await api.post(`/admin/rescore?userId=${u._id}`); fetchAll(); }} onManage={() => setSelectedUser(u)} onScoreChange={fetchAll} />
          ))}
        </div>
      )}

      {selectedUser && (
        <div className="swipe-panel-overlay" onClick={() => setSelectedUser(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            <SwipePanel user={selectedUser} onClose={() => setSelectedUser(null)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
