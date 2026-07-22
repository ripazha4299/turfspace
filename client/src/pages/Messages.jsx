import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { PLAYER_ICON, TURF_ICON } from '../constants';

function roleIcon(role) {
  return role === 'owner' ? TURF_ICON : PLAYER_ICON;
}

export default function Messages() {
  const { userId } = useParams(); // present when a specific thread is open
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [thread, setThread] = useState(null); // { other_user, messages }
  const [loadingThread, setLoadingThread] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  function loadConversations() {
    api.conversations(token).then((data) => setConversations(data.conversations)).finally(() => setLoadingList(false));
  }

  function loadThread(id) {
    setLoadingThread(true);
    api.messagesWith(id, token)
      .then((data) => setThread(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoadingThread(false));
  }

  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (userId) loadThread(userId);
    else setThread(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Light polling so an open thread feels reasonably live, matching the
  // notification bell's polling pattern rather than adding a websocket layer.
  useEffect(() => {
    const interval = setInterval(() => {
      loadConversations();
      if (userId) loadThread(userId);
    }, 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  async function handleSend(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    setSending(true);
    setError('');
    try {
      await api.sendMessage(userId, draft.trim(), token);
      setDraft('');
      loadThread(userId);
      loadConversations();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="page">
      <h1>Messages</h1>
      <div className="messages-layout">
        <div className={`messages-list-pane ${userId ? 'hide-on-mobile' : ''}`}>
          {loadingList ? (
            <p className="subtle">Loading…</p>
          ) : conversations.length === 0 ? (
            <p className="subtle" style={{ padding: '5px' }}>No conversations yet. Message someone from their profile to start one.</p>
          ) : (
            conversations.map((c) => (
              <div
                key={c.user.id}
                className={`conversation-row ${userId === c.user.id ? 'active' : ''}`}
                onClick={() => navigate(`/messages/${c.user.id}`)}
              >
                <div>
                  <strong>{roleIcon(c.user.role)} {c.user.name}</strong>
                  <div className="subtle small">{c.last_message?.content}</div>
                </div>
                {c.unread_count > 0 && <span className="notif-badge" style={{ position: 'static' }}>{c.unread_count}</span>}
              </div>
            ))
          )}
        </div>

        <div className={`messages-thread-pane ${!userId ? 'hide-on-mobile' : ''}`}>
          {!userId && <p className="subtle" style={{ padding: '5px' }}>Select a conversation to view it.</p>}
          {userId && loadingThread && <p className="subtle">Loading…</p>}
          {userId && thread && (
            <>
              <div className="messages-thread-header">
                <button className="pdp-back-btn" onClick={() => navigate('/messages')}>← Back</button>
                <Link to={`/users/${thread.other_user.id}`}>
                  <strong>{roleIcon(thread.other_user.role)} {thread.other_user.name}</strong>
                </Link>
              </div>
              <div className="messages-thread-body">
                {thread.messages.map((m) => (
                  <div key={m.id} className={`message-bubble ${m.sender_id === user.id ? 'mine' : 'theirs'}`}>
                    {m.content}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              {error && <div className="error-text">{error}</div>}
              <form className="messages-compose" onSubmit={handleSend}>
                <input
                  placeholder="Write a message…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="select-btn-primary"
                />
                <button className="btn-primary" disabled={sending} type="submit">Send</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
