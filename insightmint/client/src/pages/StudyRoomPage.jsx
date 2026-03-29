import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  Users, Plus, Lock, Globe, Copy, Check, Send, BookOpen,
  Brain, Map, LogOut, Hash, Sparkles, Share2, Trophy,
  MessageSquare, ChevronLeft, Search, Clock, X, Crown,
  MoreVertical, Smile
} from 'lucide-react';

const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('insightmint_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

const timeAgo = (date) => {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)    return 'just now';
  if (s < 3600)  return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return new Date(date).toLocaleDateString();
};

const COLORS = ['#818cf8','#f87171','#4ade80','#fbbf24','#c084fc','#22d3ee','#fb923c','#34d399'];
const avatarColor = (name = '') => COLORS[name.charCodeAt(0) % COLORS.length];

// ── Avatar ────────────────────────────────────────────────────
function Avatar({ name, size = 8, className = '' }) {
  const s = parseInt(size);
  return (
    <div className={`rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 ${className}`}
         style={{ width: s*4, height: s*4, background: avatarColor(name), fontSize: s <= 8 ? '11px' : '14px' }}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

// ── Message ───────────────────────────────────────────────────
function Message({ msg, isMe, showAvatar }) {
  const attachMeta = {
    note:    { color: '#818cf8', icon: '📝', label: 'Note' },
    quiz:    { color: '#4ade80', icon: '🧠', label: 'Quiz Result' },
    roadmap: { color: '#fbbf24', icon: '🗺️', label: 'Roadmap' },
  };

  if (msg.type === 'system') return (
    <div className="flex justify-center my-2">
      <span className="text-xs font-body px-3 py-1 rounded-full"
            style={{ color: 'var(--text-muted)', background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
        {msg.content}
      </span>
    </div>
  );

  const meta = attachMeta[msg.type];

  return (
    <div className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''} mb-1`}>
      {/* Avatar — only show for first message in group */}
      <div style={{ width: 32, flexShrink: 0 }}>
        {showAvatar && !isMe && <Avatar name={msg.senderName} size={8} />}
      </div>

      <div className={`max-w-[65%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
        {showAvatar && !isMe && (
          <span className="text-xs font-body font-semibold mb-1 px-1"
                style={{ color: 'var(--text-secondary)' }}>
            {msg.senderName}
          </span>
        )}

        <div className="rounded-2xl px-4 py-2.5 max-w-full"
             style={{
               background:          isMe ? 'var(--accent-primary)' : 'var(--bg-card)',
               border:              isMe ? 'none' : '1px solid var(--border-default)',
               borderTopLeftRadius:  !isMe && !showAvatar ? '18px' : isMe ? '18px' : '4px',
               borderTopRightRadius: isMe && !showAvatar ? '18px' : !isMe ? '18px' : '4px',
             }}>

          {/* Attachment card */}
          {msg.attachment && meta && (
            <div className="rounded-xl p-3 mb-2"
                 style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}30` }}>
              <div className="flex items-center gap-1.5 mb-2 text-xs font-mono font-bold"
                   style={{ color: meta.color }}>
                {meta.icon} {meta.label}
                {msg.type === 'quiz' && ` · ${msg.attachment.topic}`}
                {msg.type === 'roadmap' && ` · ${msg.attachment.topic}`}
                {msg.type === 'note' && ` · ${msg.attachment.title}`}
              </div>
              {msg.type === 'quiz' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-body" style={{ color: isMe ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>
                      Score
                    </span>
                    <span className="text-sm font-display font-bold" style={{ color: meta.color }}>
                      {msg.attachment.score}/{msg.attachment.total}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.15)' }}>
                    <div className="h-full rounded-full transition-all"
                         style={{ width: `${(msg.attachment.score/msg.attachment.total)*100}%`, background: meta.color }} />
                  </div>
                  <p className="text-xs mt-1 font-body" style={{ color: isMe ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)' }}>
                    {msg.attachment.difficulty} · {Math.round((msg.attachment.score/msg.attachment.total)*100)}%
                  </p>
                </div>
              )}
              {msg.type === 'roadmap' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-body" style={{ color: isMe ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>Progress</span>
                    <span className="text-xs font-mono font-bold" style={{ color: meta.color }}>
                      {msg.attachment.completedCount}/{msg.attachment.totalCount}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.15)' }}>
                    <div className="h-full rounded-full"
                         style={{ width: `${Math.min(100,(msg.attachment.completedCount/Math.max(1,msg.attachment.totalCount))*100)}%`, background: meta.color }} />
                  </div>
                </div>
              )}
              {msg.type === 'note' && (
                <p className="text-xs font-body line-clamp-2"
                   style={{ color: isMe ? 'rgba(255,255,255,0.85)' : 'var(--text-secondary)' }}>
                  {msg.attachment.content?.slice(0, 120) || '(No preview)'}
                </p>
              )}
            </div>
          )}

          {msg.content && msg.content !== `Shared 📝 Note: ${msg.attachment?.title}`
            && !msg.content.startsWith('Shared ') && (
            <p className="text-sm font-body leading-relaxed break-words"
               style={{ color: isMe ? '#fff' : 'var(--text-primary)' }}>
              {msg.content}
            </p>
          )}
        </div>
        <span className="text-xs font-body mt-1 px-1" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
          {timeAgo(msg.createdAt)}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════
export default function StudyRoomPage() {
  const { user } = useAuth();

  const [view, setView]         = useState('lobby'); // lobby | room | create
  const [activeRoom, setRoom]   = useState(null);
  const [publicRooms, setPub]   = useState([]);
  const [myRooms, setMine]      = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('public');
  const [searchQ, setSearchQ]   = useState('');
  const [joinCode, setJoinCode] = useState('');

  // Create
  const [newName, setNewName]   = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newDesc, setNewDesc]   = useState('');
  const [newVis, setNewVis]     = useState('public');
  const [creating, setCreating] = useState(false);

  // Chat
  const [messages, setMessages] = useState([]);
  const [chatInput, setInput]   = useState('');
  const [sending, setSending]   = useState(false);
  const [loadingMsgs, setLM]    = useState(false);
  const [copied, setCopied]     = useState(false);
  const [showShare, setShare]   = useState(false);
  const [showMembers, setShowM] = useState(false);

  const endRef  = useRef(null);
  const pollRef = useRef(null);
  const inputRef = useRef(null);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    try {
      const [p, m] = await Promise.all([api.get('/study-rooms'), api.get('/study-rooms/my')]);
      setPub(p.data.rooms || []);
      setMine(m.data.rooms || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  const enterRoom = async (room) => {
    setRoom(room); setView('room'); setLM(true);
    try {
      const { data } = await api.get(`/study-rooms/${room.id}/messages`);
      setMessages(data.messages || []);
    } catch {}
    setLM(false);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/study-rooms/${room.id}/messages`);
        setMessages(data.messages || []);
      } catch {}
    }, 3000);
    setTimeout(() => inputRef.current?.focus(), 200);
  };

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const joinRoom = async (roomOrCode) => {
    try {
      const payload = typeof roomOrCode === 'string'
        ? { inviteCode: roomOrCode, userName: user?.name }
        : { roomId: roomOrCode.id, userName: user?.name };
      const { data } = await api.post('/study-rooms/join', payload);
      await loadRooms();
      enterRoom(data.room);
    } catch (err) { alert(err.response?.data?.error || 'Could not join room'); }
  };

  const createRoom = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post('/study-rooms', { name: newName, topic: newTopic, description: newDesc, visibility: newVis });
      await loadRooms();
      setNewName(''); setNewTopic(''); setNewDesc('');
      enterRoom(data.room);
    } catch (err) { alert(err.response?.data?.error || 'Could not create room'); }
    setCreating(false);
  };

  const sendMsg = async (type = 'text', attachment = null) => {
    if (!chatInput.trim() && !attachment) return;
    setSending(true);
    try {
      const { data } = await api.post(`/study-rooms/${activeRoom.id}/messages`, {
        content: chatInput, type, attachment, senderName: user?.name,
      });
      setMessages(p => [...p, data.message]);
      setInput('');
      inputRef.current?.focus();
    } catch {}
    setSending(false);
  };

  const shareContent = async (type) => {
    let data = null, title = '';
    if (type === 'note') {
      const notes = JSON.parse(localStorage.getItem('insightmint_notes_local') || '[]');
      if (!notes.length) return alert('No notes found. Create some first!');
      const n = notes[0];
      data = { title: n.title, content: n.content?.slice(0, 300), topic: n.topic };
      title = n.title;
    } else if (type === 'quiz') {
      const qh = JSON.parse(localStorage.getItem('insightmint_quiz_history') || '[]');
      if (!qh.length) return alert('No quiz results yet. Take a quiz first!');
      const q = qh[0];
      data = { topic: q.topic, score: q.score, total: q.total, difficulty: q.difficulty };
      title = `${q.topic} Quiz`;
    } else if (type === 'roadmap') {
      const rh = JSON.parse(localStorage.getItem('insightmint_roadmap_history') || '[]');
      const rp = JSON.parse(localStorage.getItem('insightmint_roadmap_progress') || '{}');
      if (!rh.length) return alert('No roadmap yet. Generate one first!');
      const r = rh[0];
      const prog = rp[r.topic?.toLowerCase()] || {};
      data = { topic: r.topic, completedCount: prog.completed?.length || 0, totalCount: 20 };
      title = `${r.topic} Roadmap`;
    }
    if (!data) return;
    try {
      await api.post(`/study-rooms/${activeRoom.id}/share`, { type, data, title, sharerName: user?.name });
      const { data: msgs } = await api.get(`/study-rooms/${activeRoom.id}/messages`);
      setMessages(msgs.messages || []);
      setShare(false);
    } catch (err) { alert(err.response?.data?.error || 'Could not share'); }
  };

  const leaveRoom = async () => {
    if (!window.confirm('Leave this room?')) return;
    try {
      await api.delete(`/study-rooms/${activeRoom.id}/leave`);
      if (pollRef.current) clearInterval(pollRef.current);
      setRoom(null); setMessages([]); setView('lobby'); loadRooms();
    } catch (err) { alert(err.response?.data?.error || 'Could not leave'); }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(activeRoom?.inviteCode || '');
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const filtered = publicRooms.filter(r =>
    r.name.toLowerCase().includes(searchQ.toLowerCase()) ||
    (r.topic || '').toLowerCase().includes(searchQ.toLowerCase())
  );

  // ── LOBBY ────────────────────────────────────────────────────
  if (view === 'lobby' || view === 'create') return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="page-top-accent" />
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono mb-4"
               style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8' }}>
            <Users size={12} /> Study Rooms
          </div>
          <h1 className="font-display text-4xl font-bold mb-2"
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Study{' '}
            <span style={{ background: 'linear-gradient(135deg,#818cf8,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Together
            </span>
          </h1>
          <p className="font-body text-sm" style={{ color: 'var(--text-secondary)' }}>
            Join a room to chat, share notes, quiz results and roadmap progress with other learners
          </p>
        </div>

        {/* Top bar */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-2xl min-w-0"
               style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)' }}>
            <Search size={15} style={{ color: 'var(--text-muted)' }} />
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
              placeholder="Search rooms..."
              className="flex-1 bg-transparent outline-none text-sm font-body"
              style={{ color: 'var(--text-primary)' }} />
          </div>
          {/* Join by code */}
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl"
               style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)' }}>
            <Hash size={14} style={{ color: 'var(--text-muted)' }} />
            <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Invite code"
              className="w-28 bg-transparent outline-none text-sm font-mono"
              style={{ color: 'var(--text-primary)' }}
              onKeyDown={e => e.key === 'Enter' && joinCode.trim() && joinRoom(joinCode.trim())} />
            <button onClick={() => joinCode.trim() && joinRoom(joinCode.trim())}
              className="text-xs font-body px-2 py-1 rounded-lg transition-all"
              style={{ background: 'var(--accent-dim)', color: 'var(--accent-primary)', border: '1px solid var(--accent-border)' }}>
              Join
            </button>
          </div>
          <button onClick={() => setView('create')}
            className="btn-primary px-5 py-2.5 text-sm rounded-2xl flex-shrink-0">
            <Plus size={15} /> New Room
          </button>
        </div>

        {/* Create form */}
        {view === 'create' && (
          <div className="glass-card p-6 mb-5 animate-fade-in"
               style={{ border: '1.5px solid rgba(99,102,241,0.25)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                Create Study Room
              </h2>
              <button onClick={() => setView('lobby')}
                className="w-7 h-7 flex items-center justify-center rounded-lg"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                <X size={14} />
              </button>
            </div>
            <div className="space-y-3">
              <input value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="Room name *" className="input-field w-full text-sm" style={{ fontFamily: 'Inter' }} />
              <div className="grid grid-cols-2 gap-3">
                <input value={newTopic} onChange={e => setNewTopic(e.target.value)}
                  placeholder="Topic (e.g. Python)" className="input-field text-sm" style={{ fontFamily: 'Inter' }} />
                <div className="flex gap-2">
                  {[['public', <Globe size={13} />, 'Public'], ['private', <Lock size={13} />, 'Private']].map(([v, icon, label]) => (
                    <button key={v} onClick={() => setNewVis(v)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-body transition-all"
                      style={{
                        background: newVis === v ? 'rgba(99,102,241,0.15)' : 'var(--bg-secondary)',
                        border: `1px solid ${newVis === v ? 'rgba(99,102,241,0.35)' : 'var(--border-default)'}`,
                        color: newVis === v ? '#818cf8' : 'var(--text-muted)',
                      }}>
                      {icon} {label}
                    </button>
                  ))}
                </div>
              </div>
              <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)}
                placeholder="Description (optional)" rows={2}
                className="input-field w-full text-sm resize-none" style={{ fontFamily: 'Inter' }} />
              <div className="flex gap-2">
                <button onClick={() => setView('lobby')} className="btn-ghost flex-1 py-2.5 text-sm">Cancel</button>
                <button onClick={createRoom} disabled={creating || !newName.trim()}
                  className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create Room'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-4"
             style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', width: 'fit-content' }}>
          {[['public','Public'], ['mine','My Rooms']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className="px-5 py-1.5 rounded-lg text-sm font-body transition-all"
              style={{
                background: tab === id ? 'var(--bg-card)' : 'transparent',
                color: tab === id ? 'var(--accent-primary)' : 'var(--text-muted)',
                fontWeight: tab === id ? '600' : '400',
              }}>
              {label} <span className="text-xs font-mono ml-1 opacity-60">
                ({id === 'public' ? filtered.length : myRooms.length})
              </span>
            </button>
          ))}
        </div>

        {/* Room cards */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full animate-spin"
                 style={{ border: '2px solid var(--border-default)', borderTopColor: 'var(--accent-primary)' }} />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {(tab === 'public' ? filtered : myRooms).map(room => {
              const isMember = room.members?.some(m => m.userId === user?.id);
              return (
                <div key={room.id}
                  className="glass-card p-4 cursor-pointer hover:translate-y-[-2px] transition-all group"
                  style={{ borderLeft: `3px solid ${avatarColor(room.name)}40` }}
                  onMouseEnter={e => e.currentTarget.style.borderLeftColor = avatarColor(room.name)}
                  onMouseLeave={e => e.currentTarget.style.borderLeftColor = avatarColor(room.name) + '40'}
                  onClick={() => isMember ? enterRoom(room) : joinRoom(room)}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-lg flex-shrink-0"
                         style={{ background: `${avatarColor(room.name)}20`, color: avatarColor(room.name) }}>
                      {room.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <h3 className="font-display font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                          {room.name}
                        </h3>
                        {room.visibility === 'private'
                          ? <Lock size={10} style={{ color: 'var(--text-muted)' }} />
                          : <Globe size={10} style={{ color: 'var(--text-muted)' }} />}
                      </div>
                      {room.topic && (
                        <span className="inline-block text-xs px-2 py-0.5 rounded-full font-body mb-1"
                              style={{ background: 'var(--accent-dim)', color: 'var(--accent-primary)', border: '1px solid var(--accent-border)' }}>
                          {room.topic}
                        </span>
                      )}
                      <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span className="flex items-center gap-1"><Users size={10} /> {room.memberCount}</span>
                        <span className="flex items-center gap-1"><Clock size={10} /> {timeAgo(room.lastActivity)}</span>
                      </div>
                    </div>
                    <span className="text-xs font-body px-3 py-1.5 rounded-xl flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: 'var(--accent-dim)', color: 'var(--accent-primary)' }}>
                      {isMember ? 'Open →' : 'Join →'}
                    </span>
                  </div>
                </div>
              );
            })}
            {(tab === 'public' ? filtered : myRooms).length === 0 && (
              <div className="col-span-2 glass-card p-12 text-center"
                   style={{ border: '1px dashed var(--border-medium)' }}>
                <Users size={36} className="mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
                <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>
                  {tab === 'public' ? 'No public rooms yet — create the first one!' : "You haven't joined any rooms yet."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // ── ROOM VIEW ────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', paddingTop: '60px', overflow: 'hidden' }}>
      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 px-5 py-3 flex-shrink-0"
           style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-default)', zIndex: 10 }}>
        <button onClick={() => { setView('lobby'); setRoom(null); if (pollRef.current) clearInterval(pollRef.current); }}
          className="w-8 h-8 flex items-center justify-center rounded-xl transition-all flex-shrink-0"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
          <ChevronLeft size={16} />
        </button>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-base flex-shrink-0"
             style={{ background: `${avatarColor(activeRoom?.name || '')}20`, color: avatarColor(activeRoom?.name || '') }}>
          {activeRoom?.name?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
            {activeRoom?.name}
          </h2>
          <p className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              {activeRoom?.memberCount} member{activeRoom?.memberCount !== 1 ? 's' : ''}
              {activeRoom?.topic && ` · ${activeRoom.topic}`}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Invite code pill */}
          {activeRoom?.inviteCode && (
            <button onClick={copyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>
              {copied ? <Check size={11} style={{ color: '#4ade80' }} /> : <Copy size={11} />}
              <span className="hidden sm:inline">{copied ? 'Copied!' : activeRoom.inviteCode}</span>
            </button>
          )}
          {/* Members toggle */}
          <button onClick={() => setShowM(m => !m)}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-all"
            style={{ background: showMembers ? 'var(--accent-dim)' : 'var(--bg-secondary)',
                     color: showMembers ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
            <Users size={15} />
          </button>
          {/* Share */}
          <button onClick={() => setShare(s => !s)}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-all"
            style={{ background: showShare ? 'var(--accent-dim)' : 'var(--bg-secondary)',
                     color: showShare ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
            <Share2 size={15} />
          </button>
          {/* Leave */}
          <button onClick={leaveRoom}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-all"
            style={{ background: 'rgba(248,113,113,0.10)', color: '#f87171' }}>
            <LogOut size={15} />
          </button>
        </div>
      </div>

      {/* ── Body: chat + optional sidebar ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Chat area ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Share panel */}
          {showShare && (
            <div className="flex-shrink-0 px-5 py-3 animate-fade-in"
                 style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-default)' }}>
              <p className="text-xs font-mono uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Share with the room
              </p>
              <div className="flex gap-2 flex-wrap">
                {[
                  { type:'note',    label:'📝 Share Note',          color:'#818cf8' },
                  { type:'quiz',    label:'🧠 Share Quiz Result',    color:'#4ade80' },
                  { type:'roadmap', label:'🗺️ Share Roadmap',       color:'#fbbf24' },
                ].map(s => (
                  <button key={s.type} onClick={() => shareContent(s.type)}
                    className="px-4 py-2 rounded-xl text-xs font-body font-medium transition-all hover:scale-105"
                    style={{ background: `${s.color}15`, color: s.color, border: `1px solid ${s.color}30` }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            {loadingMsgs ? (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 rounded-full animate-spin"
                     style={{ border: '2px solid var(--border-default)', borderTopColor: 'var(--accent-primary)' }} />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-20">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                     style={{ background: 'rgba(99,102,241,0.10)' }}>
                  <MessageSquare size={24} style={{ color: '#818cf8' }} />
                </div>
                <p className="font-display font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  No messages yet
                </p>
                <p className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>
                  Be the first to say hello! 👋
                </p>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => {
                  const prev = messages[i - 1];
                  const showAvatar = !prev || prev.senderId !== msg.senderId || prev.type === 'system';
                  return (
                    <Message key={msg.id} msg={msg}
                      isMe={msg.senderId === user?.id}
                      showAvatar={showAvatar} />
                  );
                })}
                <div ref={endRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="flex-shrink-0 px-4 py-3"
               style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border-default)' }}>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl"
                 style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)' }}>
              <input ref={inputRef}
                value={chatInput} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMsg()}
                placeholder="Type a message..."
                className="flex-1 bg-transparent outline-none text-sm font-body"
                style={{ color: 'var(--text-primary)' }} />
              <button onClick={() => sendMsg()} disabled={sending || !chatInput.trim()}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
                style={{ background: 'var(--accent-primary)' }}>
                <Send size={14} className="text-white" />
              </button>
            </div>
            <p className="text-xs font-body text-center mt-1.5" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
              Press Enter to send · Use Share ↗ to share notes or quiz results
            </p>
          </div>
        </div>

        {/* ── Members sidebar ── */}
        {showMembers && (
          <div className="flex-shrink-0 animate-fade-in"
               style={{ width: '220px', borderLeft: '1px solid var(--border-default)', background: 'var(--bg-secondary)', overflowY: 'auto' }}>
            <div className="p-4">
              <h3 className="text-xs font-mono uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                Members ({activeRoom?.memberCount})
              </h3>
              <div className="space-y-2">
                {activeRoom?.members?.map(m => (
                  <div key={m.userId} className="flex items-center gap-2.5 p-2 rounded-xl transition-all"
                       style={{ background: m.userId === user?.id ? 'var(--accent-dim)' : 'transparent' }}>
                    <div className="relative flex-shrink-0">
                      <Avatar name={m.name} size={8} />
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                            style={{ background: '#4ade80', borderColor: 'var(--bg-secondary)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-body font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {m.name}
                        {m.userId === user?.id && <span style={{ color: 'var(--text-muted)' }}> (you)</span>}
                      </p>
                      <p className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>
                        {m.role === 'owner' ? '👑 Owner' : 'Member'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Room info */}
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-default)' }}>
                <h3 className="text-xs font-mono uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                  Room Info
                </h3>
                <div className="space-y-2 text-xs font-body" style={{ color: 'var(--text-secondary)' }}>
                  <div className="flex items-center gap-2">
                    {activeRoom?.visibility === 'private' ? <Lock size={11} /> : <Globe size={11} />}
                    <span style={{ textTransform: 'capitalize' }}>{activeRoom?.visibility}</span>
                  </div>
                  {activeRoom?.topic && (
                    <div className="flex items-center gap-2">
                      <BookOpen size={11} /> {activeRoom.topic}
                    </div>
                  )}
                  {activeRoom?.inviteCode && (
                    <div>
                      <p style={{ color: 'var(--text-muted)' }} className="mb-1">Invite Code</p>
                      <button onClick={copyCode}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg w-full text-xs font-mono justify-between"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
                        {activeRoom.inviteCode}
                        {copied ? <Check size={11} style={{ color: '#4ade80' }} /> : <Copy size={11} />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}