import { useEffect, useState, useRef } from 'react';
import type { FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import type { Message, Match } from '../types';
import { useAuth } from '../context/AuthContext';

const Chat = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [match, setMatch] = useState<Match | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      api.get<Message[]>(`/messages/${matchId}`),
      api.get<Match[]>('/matches'),
    ]).then(([msgRes, matchRes]) => {
      setMessages(msgRes.data);
      setMatch(matchRes.data.find((m) => m._id === matchId) || null);
    }).finally(() => setLoading(false));
  }, [matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const res = await api.post<Message>(`/messages/${matchId}`, { text });
    setMessages((m) => [...m, res.data]);
    setText('');
  };

  const gracefulExit = async () => {
    if (!window.confirm('End this conversation with a polite goodbye?')) return;
    await api.patch(`/matches/${matchId}/exit`);
    navigate('/matches');
  };

  const other = match?.users.find((u) => u.userId._id !== user?._id)?.userId;

  if (loading) return <div className="page-center">Loading chat...</div>;

  return (
    <div className="chat-page">
      <div className="chat-header">
        <button className="back-btn" onClick={() => navigate('/matches')}>←</button>
        <span className="chat-name">{other?.name ?? 'Chat'}</span>
        <button className="exit-btn" onClick={gracefulExit} title="Politely end conversation">
          👋 Not feeling it
        </button>
      </div>

      <div className="chat-messages">
        {messages.map((msg) =>
          msg.type === 'graceful_exit' ? (
            <div key={msg._id} className="system-message">
              <span>{msg.text}</span>
            </div>
          ) : (
            <div
              key={msg._id}
              className={`message ${msg.senderId === user?._id ? 'mine' : 'theirs'}`}
            >
              <p>{msg.text}</p>
            </div>
          )
        )}
        <div ref={bottomRef} />
      </div>

      {match?.active ? (
        <form className="chat-input" onSubmit={send}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
          />
          <button type="submit">Send</button>
        </form>
      ) : (
        <div className="chat-closed">This conversation has ended.</div>
      )}
    </div>
  );
};

export default Chat;
