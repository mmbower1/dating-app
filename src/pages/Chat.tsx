import { useEffect, useState, useRef, useCallback } from 'react';
import type { FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import type { Message, Match } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const EXIT_REASONS = [
  "Not enough in common",
  "Conversation fizzled out",
  "Met someone else",
  "Just not feeling the connection",
];

const GracefulExitModal = ({
  onConfirm,
  onCancel,
}: {
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) => {
  const [selected, setSelected] = useState('');
  const [custom, setCustom] = useState('');

  const reason = custom.trim() || selected;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-sheet exit-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Not feeling it?</h3>
        <p className="modal-body">
          Unmatching can lower your Pearl score. Giving a reason helps the other person grow — and keeps your score intact.
        </p>

        <p className="exit-modal-section-label">Quick reasons</p>
        <div className="exit-modal-pills">
          {EXIT_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              className={`exit-reason-pill ${selected === r && !custom ? 'active' : ''}`}
              onClick={() => { setSelected(r); setCustom(''); }}
            >
              {r}
            </button>
          ))}
        </div>

        <p className="exit-modal-section-label" style={{ marginTop: 14 }}>Or write your own</p>
        <textarea
          className="exit-modal-textarea"
          placeholder="Add a personal note (optional)…"
          maxLength={200}
          rows={3}
          value={custom}
          onChange={(e) => { setCustom(e.target.value); if (e.target.value) setSelected(''); }}
        />

        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button className="modal-cancel" onClick={onCancel}>Cancel</button>
          <button
            className="exit-modal-confirm"
            onClick={() => onConfirm(reason)}
          >
            End conversation
          </button>
        </div>
      </div>
    </div>
  );
};

const Chat = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const { user } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [match, setMatch] = useState<Match | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherTyping, setOtherTyping] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<Message[]>(`/messages/${matchId}`),
      api.get<Match[]>('/matches'),
    ]).then(([msgRes, matchRes]) => {
      setMessages(msgRes.data);
      setMatch(matchRes.data.find((m) => m._id === matchId) || null);
      api.post(`/matches/${matchId}/mark-read`).catch(() => {});
    }).finally(() => setLoading(false));
  }, [matchId]);

  useEffect(() => {
    if (!socket || !matchId) return;
    socket.emit('join_match', matchId);

    const onMessage = (msg: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      setOtherTyping(false);
    };

    const onTypingStart = () => setOtherTyping(true);
    const onTypingStop = () => setOtherTyping(false);

    socket.on('new_message', onMessage);
    socket.on('typing_start', onTypingStart);
    socket.on('typing_stop', onTypingStop);

    return () => {
      socket.emit('leave_match', matchId);
      socket.off('new_message', onMessage);
      socket.off('typing_start', onTypingStart);
      socket.off('typing_stop', onTypingStop);
    };
  }, [socket, matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherTyping]);

  const handleTyping = useCallback((val: string) => {
    setText(val);
    if (!socket || !matchId) return;
    socket.emit('typing_start', matchId);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_stop', matchId);
    }, 1500);
  }, [socket, matchId]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (socket && matchId) socket.emit('typing_stop', matchId);
    const res = await api.post<Message>(`/messages/${matchId}`, { text });
    setMessages((m) => {
      if (m.some((msg) => msg._id === res.data._id)) return m;
      return [...m, res.data];
    });
    setText('');
  };

  const confirmExit = async (reason: string) => {
    setShowExitModal(false);
    await api.patch(`/matches/${matchId}/exit`, { reason });
    navigate('/matches');
  };

  const other = match?.users.find((u) => u.userId._id !== user?._id)?.userId;

  if (loading) return <div className="page-center">Loading chat...</div>;

  return (
    <div className="chat-page">
      <div className="chat-header">
        <button className="back-btn" onClick={() => navigate('/matches')}>←</button>
        <span className="chat-name">{other?.name ?? 'Chat'}</span>
        <button className="exit-btn" onClick={() => setShowExitModal(true)} title="End conversation">
          Not feeling it
        </button>
      </div>

      <div className="chat-messages">
        {messages.map((msg) =>
          msg.type === 'graceful_exit' ? (
            <div key={msg._id} className="system-message">
              <span>{msg.text}</span>
            </div>
          ) : (
            <div key={msg._id} className={`message ${msg.senderId === user?._id ? 'mine' : 'theirs'}`}>
              <p>{msg.text}</p>
            </div>
          )
        )}
        {otherTyping && (
          <div className="message theirs typing-indicator">
            <span /><span /><span />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {match?.active ? (
        <form className="chat-input" onSubmit={send}>
          <input
            value={text}
            onChange={(e) => handleTyping(e.target.value)}
            placeholder="Type a message..."
          />
          <button type="submit">Send</button>
        </form>
      ) : (
        <div className="chat-closed">This conversation has ended.</div>
      )}

      {showExitModal && (
        <GracefulExitModal
          onConfirm={confirmExit}
          onCancel={() => setShowExitModal(false)}
        />
      )}
    </div>
  );
};

export default Chat;
