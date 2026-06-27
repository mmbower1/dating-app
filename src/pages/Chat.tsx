import { useEffect, useState, useRef, useCallback } from 'react';
import type { FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import type { Message, Match } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

type ReportCategory = 'inappropriate_photos' | 'harassment' | 'fake_profile' | 'spam' | 'underage' | 'other';
const REPORT_CATEGORIES: { value: ReportCategory; label: string }[] = [
  { value: 'inappropriate_photos', label: 'Inappropriate photos' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'fake_profile', label: 'Fake profile' },
  { value: 'spam', label: 'Spam' },
  { value: 'underage', label: 'Underage' },
  { value: 'other', label: 'Other' },
];

const ReportModal = ({
  onSubmit,
  onClose,
}: {
  onSubmit: (category: ReportCategory, description: string) => Promise<void>;
  onClose: () => void;
}) => {
  const [category, setCategory] = useState<ReportCategory | ''>('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!category) return;
    setSubmitting(true);
    await onSubmit(category, description);
    setDone(true);
    setTimeout(onClose, 1800);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="report-modal modal-sheet" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <p style={{ fontSize: 18, fontWeight: 600 }}>Report submitted</p>
            <p style={{ fontSize: 14, opacity: 0.7, marginTop: 6 }}>Thank you for keeping Pearl safe.</p>
          </div>
        ) : (
          <>
            <h3 className="modal-title">Report this user</h3>
            <p className="modal-body">Select a reason so our team can review this account.</p>
            <div className="report-categories">
              {REPORT_CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={`report-category-btn${category === c.value ? ' report-category-btn--active' : ''}`}
                  onClick={() => setCategory(c.value)}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <textarea
              className="exit-modal-textarea"
              placeholder="Additional details (optional)"
              maxLength={500}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ marginTop: 12 }}
            />
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button className="modal-cancel" onClick={onClose}>Cancel</button>
              <button
                className="exit-modal-confirm"
                disabled={!category || submitting}
                onClick={handleSubmit}
              >
                {submitting ? 'Submitting…' : 'Submit report'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const IN_PERSON_REASONS = [
  'Something that was said',
  'Mannerisms',
  'Not as expected',
];

const GracefulExitModal = ({
  onConfirm,
  onCancel,
}: {
  onConfirm: (reason: string, metInPerson: boolean) => void;
  onCancel: () => void;
}) => {
  const [reason, setReason] = useState('');
  const [metInPerson, setMetInPerson] = useState(false);
  const canSubmit = reason.trim().length > 0;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-sheet exit-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Not feeling it?</h3>
        <p className="modal-body">
          {metInPerson
            ? "Glad you gave it a real shot. What didn't click?"
            : "Your message will be sent directly to them. Unmatching without a thoughtful reason can lower your Pearl score."}
        </p>

        <button
          className={`met-in-person-toggle ${metInPerson ? 'met-in-person-toggle--on' : ''}`}
          onClick={() => { setMetInPerson((v) => !v); setReason(''); }}
          type="button"
        >
          <span className="met-toggle-dot" />
          Did you meet in person?
        </button>

        {metInPerson ? (
          <div className="exit-reason-options">
            {IN_PERSON_REASONS.map((opt) => (
              <button
                key={opt}
                type="button"
                className={`exit-reason-option${reason === opt ? ' exit-reason-option--active' : ''}`}
                onClick={() => setReason(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <textarea
            className="exit-modal-textarea"
            placeholder="Be honest and specific — it helps them show up better for their next potential match."
            maxLength={300}
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        )}

        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button className="modal-cancel" onClick={onCancel}>Cancel</button>
          <button
            className="exit-modal-confirm"
            disabled={!canSubmit}
            onClick={() => onConfirm(reason.trim(), metInPerson)}
          >
            Unmatch
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
  const [exitRating, setExitRating] = useState<'genuine' | 'not_genuine' | null>(null);
  const [exitRated, setExitRated] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherTyping, setOtherTyping] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showFarewell, setShowFarewell] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<Message[]>(`/messages/${matchId}`),
      api.get<Match[]>('/matches'),
    ]).then(([msgRes, matchRes]) => {
      setMessages(msgRes.data);
      const foundMatch = matchRes.data.find((m) => m._id === matchId) || null;
      setMatch(foundMatch);
      if (foundMatch?.exitRatedBy) setExitRated(true);
      if (foundMatch?.exitRating) setExitRating(foundMatch.exitRating);
      api.post(`/matches/${matchId}/mark-read`).catch(() => {});
    }).finally(() => setLoading(false));
  }, [matchId]);

  useEffect(() => {
    if (!socket || !matchId) return;

    const joinRoom = () => socket.emit('join_match', matchId);
    joinRoom();

    const onMessage = (msg: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      setOtherTyping(false);
    };

    const onTypingStart = () => setOtherTyping(true);
    const onTypingStop = () => setOtherTyping(false);

    // Rejoin the room after a socket reconnect so messages keep flowing
    socket.on('connect', joinRoom);
    socket.on('new_message', onMessage);
    socket.on('typing_start', onTypingStart);
    socket.on('typing_stop', onTypingStop);

    return () => {
      socket.emit('leave_match', matchId);
      socket.off('connect', joinRoom);
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

  const rateExit = async (rating: 'genuine' | 'not_genuine') => {
    setExitRating(rating);
    setExitRated(true);
    await api.patch(`/matches/${matchId}/rate-exit`, { rating });
  };

  const confirmExit = async (reason: string, metInPerson: boolean) => {
    setShowExitModal(false);
    await api.patch(`/matches/${matchId}/exit`, { reason, metInPerson });
    setShowFarewell(true);
    setTimeout(() => navigate('/'), 5000);
  };

  const submitReport = async (category: ReportCategory, description: string) => {
    if (!other) return;
    await api.post('/reports', {
      reportedUserId: other._id,
      reportedGender: other.gender,
      category,
      description,
    });
  };

  const other = match?.users.find((u) => u.userId._id !== user?._id)?.userId;

  if (loading) return <div className="page-center">Loading chat...</div>;

  return (
    <div className="chat-page">
      <div className="chat-header">
        <button className="back-btn" onClick={() => navigate('/matches')}>←</button>
        <span className="chat-name">{other?.name ?? 'Chat'}</span>
        <button className="exit-btn" onClick={() => setShowExitModal(true)} title="Not feeling it?" disabled={!match?.active} style={!match?.active ? { opacity: 0.3, cursor: 'default' } : undefined}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            <line x1="4" y1="4" x2="20" y2="20"/>
          </svg>
        </button>
      </div>

      <div className="chat-messages">
        {messages.map((msg) => {
          if (msg.type === 'graceful_exit') {
            const wasUnmatched = match?.endedBy !== user?._id;
            return (
              <div key={msg._id}>
                <div className="system-message">
                  <span>{msg.text}</span>
                </div>
                {wasUnmatched && (
                  <div className="exit-rating">
                    {exitRated ? (
                      <p className="exit-rating-done">
                        {exitRating === 'genuine' ? 'You marked this as genuine.' : 'Feedback recorded — their score has been adjusted.'}
                      </p>
                    ) : (
                      <>
                        <p className="exit-rating-label">Does this reason feel genuine?</p>
                        <div className="exit-rating-btns">
                          <button className="exit-rating-yes" onClick={() => rateExit('genuine')}>👍 Yes</button>
                          <button className="exit-rating-no" onClick={() => rateExit('not_genuine')}>👎 No</button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          }
          if (msg.type === 'like') {
            const [headline, ...rest] = msg.text.split('\n\n');
            const comment = rest.join('\n\n').replace(/^"|"$/g, '');
            return (
              <div key={msg._id} className="like-context-card">
                <span className="like-context-icon">💜</span>
                <div className="like-context-body">
                  <p className="like-context-headline">{headline}</p>
                  {comment && <p className="like-context-comment">"{comment}"</p>}
                </div>
              </div>
            );
          }
          return (
            <div key={msg._id} className={`message ${msg.senderId === user?._id ? 'mine' : 'theirs'}`}>
              <p>{msg.text}</p>
            </div>
          );
        })}
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
        <div className="chat-closed">
          <span>This conversation has ended.</span>
        </div>
      )}

      {showExitModal && (
        <GracefulExitModal
          onConfirm={confirmExit}
          onCancel={() => setShowExitModal(false)}
        />
      )}

      {showReportModal && (
        <ReportModal
          onSubmit={submitReport}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {showFarewell && (
        <div className="farewell-overlay">
          <div className="farewell-content">
            <p className="farewell-emoji">🌊</p>
            <h2 className="farewell-title">Sorry it didn't work out.</h2>
            <p className="farewell-body">
              Wishing you the best on your next connection —<br />
              hopefully the last one you'll need.
            </p>
            <button className="farewell-btn" onClick={() => navigate('/')}>
              Keep discovering
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
