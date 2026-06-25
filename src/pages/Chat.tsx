import { useEffect, useState, useRef, useCallback } from 'react';
import type { FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import type { Message, Match } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

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
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<Message[]>(`/messages/${matchId}`),
      api.get<Match[]>('/matches'),
    ]).then(([msgRes, matchRes]) => {
      setMessages(msgRes.data);
      setMatch(matchRes.data.find((m) => m._id === matchId) || null);
    }).finally(() => setLoading(false));
  }, [matchId]);

  // Join socket room and listen for real-time events
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
    </div>
  );
};

export default Chat;
