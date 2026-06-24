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

type Tab = 'matches' | 'messages';

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('matches');
  const [matches, setMatches] = useState<AdminMatch[]>([]);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.isAdmin) { navigate('/'); return; }
    fetchAll();
  }, [user]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [mRes, msgRes] = await Promise.all([
        api.get<AdminMatch[]>('/admin/matches'),
        api.get<AdminMessage[]>('/admin/messages'),
      ]);
      setMatches(mRes.data);
      setMessages(msgRes.data);
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

  if (!user?.isAdmin) return null;
  if (loading) return <div className="page-center">Loading...</div>;
  if (error) return <div className="page-center">{error}</div>;

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Admin Panel</h1>
        <p className="admin-counts">
          {matches.length} matches &nbsp;·&nbsp; {messages.length} messages
        </p>
      </div>

      <div className="admin-tabs">
        <button
          className={`admin-tab ${tab === 'matches' ? 'active' : ''}`}
          onClick={() => setTab('matches')}
        >
          Matches ({matches.length})
        </button>
        <button
          className={`admin-tab ${tab === 'messages' ? 'active' : ''}`}
          onClick={() => setTab('messages')}
        >
          Messages ({messages.length})
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
                <span className="admin-names">
                  {match.users.map((u) => u.name).join(' & ')}
                </span>
                <span className="admin-date">
                  {new Date(match.createdAt).toLocaleDateString()}
                </span>
              </div>
              <button className="admin-delete-btn" onClick={() => deleteMatch(match._id)}>
                Delete
              </button>
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
                <span className="admin-date">
                  {new Date(msg.createdAt).toLocaleDateString()}
                </span>
              </div>
              <button className="admin-delete-btn" onClick={() => deleteMessage(msg._id)}>
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Admin;
