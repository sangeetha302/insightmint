import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  Users, Brain, Zap, Search, UserPlus, CheckCircle2,
  Star, ArrowRight, Loader2, AlertCircle, Sparkles,
  BookOpen, Activity, Clock, Heart, Trophy, RefreshCw,
  ChevronDown, ChevronUp, Mail, X, UserCheck, Swords,
  Handshake, Crown
} from 'lucide-react';

const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('insightmint_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// ── Constants ─────────────────────────────────────────────
const TOPICS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
  'Machine Learning', 'Web Development', 'Data Science', 'History',
  'Literature', 'Economics', 'Psychology', 'Philosophy', 'Law', 'Medicine',
  'Engineering', 'Design', 'Business', 'Language Learning', 'Music',
];

const SPEEDS = [
  { id: 'slow',   label: 'Slow & Steady',  desc: 'I take my time to deeply understand', icon: '🐢', color: '#4ade80' },
  { id: 'medium', label: 'Balanced',        desc: 'Mix of understanding and pace',       icon: '🦊', color: '#818cf8' },
  { id: 'fast',   label: 'Fast Learner',    desc: 'I move quickly and iterate',          icon: '🚀', color: '#f87171' },
];

const ACTIVITY = [
  { id: 'low',    label: 'Casual',    desc: '1–3 hrs/week',   icon: '🌙', color: '#818cf8' },
  { id: 'medium', label: 'Regular',   desc: '4–8 hrs/week',   icon: '☀️',  color: '#fbbf24' },
  { id: 'high',   label: 'Intensive', desc: '9+ hrs/week',    icon: '🔥', color: '#f87171' },
];

const SCORE_COLOR = (s) => s >= 80 ? '#4ade80' : s >= 60 ? '#818cf8' : s >= 40 ? '#fbbf24' : '#f87171';
const SCORE_LABEL = (s) => s >= 85 ? 'Perfect Match! 🎯' : s >= 70 ? 'Great Match! ✨' : s >= 55 ? 'Good Match 👍' : s >= 40 ? 'Decent Match' : 'Low Match';

// ── Animated score ring ───────────────────────────────────
function ScoreRing({ score, size = 100, label }) {
  const r = 38, cx = 50, cy = 50;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = SCORE_COLOR(score);
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border-default)" strokeWidth="7" />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="7"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display font-black leading-none" style={{ color, fontSize: size * 0.24 }}>{score}%</span>
        </div>
      </div>
      {label && <p className="text-xs font-mono text-center" style={{ color }}>{label}</p>}
    </div>
  );
}

// ── User avatar placeholder ───────────────────────────────
function Avatar({ name, size = 40, color = '#818cf8' }) {
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  return (
    <div className="rounded-xl flex items-center justify-center font-display font-bold flex-shrink-0"
         style={{ width: size, height: size, background: `${color}20`, border: `1.5px solid ${color}40`, color, fontSize: size * 0.38 }}>
      {initials}
    </div>
  );
}

// ── Compatibility bar ─────────────────────────────────────
function CompatBar({ label, value, max = 100 }) {
  const color = SCORE_COLOR((value / max) * 100);
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span className="text-xs font-mono font-bold" style={{ color }}>{Math.round((value / max) * 100)}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-default)' }}>
        <div className="h-full rounded-full transition-all duration-1000"
             style={{ width: `${(value / max) * 100}%`, background: color }} />
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────
export default function StudyBuddyPage() {
  const { user } = useAuth();

  // Step: 'profile' | 'matching' | 'results'
  const [step, setStep]           = useState('profile');

  // My profile form
  const [myTopics, setMyTopics]   = useState([]);
  const [mySpeed, setMySpeed]     = useState('');
  const [myActivity, setMyActivity] = useState('');
  const [topicSearch, setTopicSearch] = useState('');

  // Friend invite
  const [friendMode, setFriendMode] = useState(''); // 'search' | 'manual'
  const [friendQuery, setFriendQuery] = useState('');
  const [friendResults, setFriendResults] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [friendSearching, setFriendSearching] = useState(false);
  // Manual friend entry
  const [manualFriend, setManualFriend] = useState({ name: '', topics: [], speed: '', activity: '' });
  const [manualTopicSearch, setManualTopicSearch] = useState('');

  // Results
  const [result, setResult]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const filteredTopics  = TOPICS.filter(t => t.toLowerCase().includes(topicSearch.toLowerCase()) && !myTopics.includes(t));
  const filteredMTopics = TOPICS.filter(t => t.toLowerCase().includes(manualTopicSearch.toLowerCase()) && !manualFriend.topics.includes(t));

  // ── Search existing users ──
  const searchFriends = async (q) => {
    setFriendQuery(q);
    if (q.length < 2) { setFriendResults([]); return; }
    setFriendSearching(true);
    try {
      const { data } = await api.get(`/study-buddy/search-users?q=${encodeURIComponent(q)}`);
      setFriendResults(data.users || []);
    } catch { setFriendResults([]); }
    finally { setFriendSearching(false); }
  };

  // ── Submit for matching ──
  const findMatch = async () => {
    if (myTopics.length === 0) { setError('Please select at least one topic.'); return; }
    if (!mySpeed)              { setError('Please select your learning speed.'); return; }
    if (!myActivity)           { setError('Please select your activity level.'); return; }
    setError(''); setLoading(true);

    const myProfile = {
      name:     user?.name || 'You',
      topics:   myTopics,
      speed:    mySpeed,
      activity: myActivity,
    };

    const friend = friendMode === 'search' && selectedFriend
      ? selectedFriend
      : friendMode === 'manual' && manualFriend.name && manualFriend.topics.length > 0
        ? manualFriend
        : null;

    try {
      const { data } = await api.post('/study-buddy/match', { myProfile, friend });
      setResult(data);
      setStep('results');
    } catch (err) {
      setError(err.response?.data?.error || 'Matching failed. Please try again.');
    } finally { setLoading(false); }
  };

  const reset = () => {
    setStep('profile'); setMyTopics([]); setMySpeed(''); setMyActivity('');
    setSelectedFriend(null); setManualFriend({ name: '', topics: [], speed: '', activity: '' });
    setFriendMode(''); setResult(null); setError('');
  };

  // ══════════════════════════════════════════════════════
  // STEP: PROFILE SETUP
  // ══════════════════════════════════════════════════════
  if (step === 'profile') return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="page-top-accent" />
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono mb-4"
               style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8' }}>
            <Users size={12} /> AI Study Buddy Matcher
          </div>
          <h1 className="font-display text-4xl font-bold mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Find Your{' '}
            <span style={{ background: 'linear-gradient(135deg,#818cf8,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Study Buddy
            </span>
          </h1>
          <p className="font-body text-base" style={{ color: 'var(--text-secondary)' }}>
            Tell us about yourself — AI will find your best learning partner
          </p>
        </div>

        <div className="space-y-5 animate-fade-in">

          {/* Topics */}
          <div className="glass-card p-5">
            <p className="text-xs font-mono uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
              Step 1 · Your Study Topics
            </p>
            <p className="text-xs font-body mb-3" style={{ color: 'var(--text-muted)' }}>Pick all subjects you study or want to study</p>

            {/* Selected chips */}
            {myTopics.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {myTopics.map(t => (
                  <span key={t} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-body font-medium"
                        style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)', color: '#818cf8' }}>
                    {t}
                    <button onClick={() => setMyTopics(prev => prev.filter(x => x !== t))}>
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <input value={topicSearch} onChange={e => setTopicSearch(e.target.value)}
              placeholder="Search topics..." className="input-field w-full text-sm mb-2" />

            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
              {filteredTopics.map(t => (
                <button key={t} onClick={() => { setMyTopics(prev => [...prev, t]); setTopicSearch(''); }}
                  className="px-3 py-1 rounded-full text-xs font-body transition-all hover:scale-105"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; e.currentTarget.style.color = '#818cf8'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
                  + {t}
                </button>
              ))}
            </div>
          </div>

          {/* Learning Speed */}
          <div className="glass-card p-5">
            <p className="text-xs font-mono uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
              Step 2 · Your Learning Speed
            </p>
            <div className="grid grid-cols-3 gap-3">
              {SPEEDS.map(s => (
                <button key={s.id} onClick={() => setMySpeed(s.id)}
                  className="p-4 rounded-xl text-center transition-all"
                  style={{
                    background: mySpeed === s.id ? `${s.color}15` : 'var(--bg-secondary)',
                    border: `1.5px solid ${mySpeed === s.id ? s.color + '50' : 'var(--border-default)'}`,
                    transform: mySpeed === s.id ? 'scale(1.02)' : 'scale(1)',
                  }}>
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <p className="text-xs font-display font-bold mb-0.5" style={{ color: mySpeed === s.id ? s.color : 'var(--text-primary)' }}>{s.label}</p>
                  <p className="text-xs font-body" style={{ color: 'var(--text-muted)', fontSize: 10 }}>{s.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Activity Level */}
          <div className="glass-card p-5">
            <p className="text-xs font-mono uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
              Step 3 · Your Activity Level
            </p>
            <div className="grid grid-cols-3 gap-3">
              {ACTIVITY.map(a => (
                <button key={a.id} onClick={() => setMyActivity(a.id)}
                  className="p-4 rounded-xl text-center transition-all"
                  style={{
                    background: myActivity === a.id ? `${a.color}15` : 'var(--bg-secondary)',
                    border: `1.5px solid ${myActivity === a.id ? a.color + '50' : 'var(--border-default)'}`,
                    transform: myActivity === a.id ? 'scale(1.02)' : 'scale(1)',
                  }}>
                  <div className="text-2xl mb-1">{a.icon}</div>
                  <p className="text-xs font-display font-bold mb-0.5" style={{ color: myActivity === a.id ? a.color : 'var(--text-primary)' }}>{a.label}</p>
                  <p className="text-xs font-body" style={{ color: 'var(--text-muted)', fontSize: 10 }}>{a.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Invite a Friend (optional) */}
          <div className="glass-card p-5">
            <p className="text-xs font-mono uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
              Step 4 · Invite a Friend <span className="normal-case" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>(optional)</span>
            </p>
            <p className="text-xs font-body mb-4" style={{ color: 'var(--text-muted)' }}>
              Compare AI's match vs your friend's compatibility
            </p>

            {!friendMode && (
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setFriendMode('search')}
                  className="p-4 rounded-xl text-left transition-all"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.35)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-default)'}>
                  <Search size={16} style={{ color: '#818cf8', marginBottom: 6 }} />
                  <p className="text-sm font-display font-bold" style={{ color: 'var(--text-primary)' }}>Search User</p>
                  <p className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>Find by name or email</p>
                </button>
                <button onClick={() => setFriendMode('manual')}
                  className="p-4 rounded-xl text-left transition-all"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.35)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-default)'}>
                  <UserPlus size={16} style={{ color: '#c084fc', marginBottom: 6 }} />
                  <p className="text-sm font-display font-bold" style={{ color: 'var(--text-primary)' }}>Enter Details</p>
                  <p className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>Fill in friend's info manually</p>
                </button>
              </div>
            )}

            {/* Search mode */}
            {friendMode === 'search' && (
              <div className="animate-fade-in">
                <div className="flex items-center gap-2 mb-3">
                  <button onClick={() => { setFriendMode(''); setSelectedFriend(null); setFriendQuery(''); setFriendResults([]); }}
                    className="p-1.5 rounded-lg" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                    <X size={13} />
                  </button>
                  <p className="text-xs font-mono" style={{ color: '#818cf8' }}>Search existing users</p>
                </div>

                {selectedFriend ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl"
                       style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)' }}>
                    <Avatar name={selectedFriend.name} size={36} color="#4ade80" />
                    <div className="flex-1">
                      <p className="text-sm font-display font-bold" style={{ color: 'var(--text-primary)' }}>{selectedFriend.name}</p>
                      <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{selectedFriend.email}</p>
                    </div>
                    <button onClick={() => setSelectedFriend(null)} style={{ color: 'var(--text-muted)' }}><X size={14} /></button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                    <input value={friendQuery} onChange={e => searchFriends(e.target.value)}
                      placeholder="Search by name or email..."
                      className="input-field w-full text-sm pl-9" />
                    {friendSearching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin" style={{ color: 'var(--text-muted)' }} />}
                    {friendResults.length > 0 && (
                      <div className="mt-2 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
                        {friendResults.map(u => (
                          <button key={u._id} onClick={() => { setSelectedFriend(u); setFriendResults([]); }}
                            className="w-full flex items-center gap-3 p-3 text-left transition-all"
                            style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-default)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-secondary)'}>
                            <Avatar name={u.name} size={32} />
                            <div>
                              <p className="text-sm font-body font-medium" style={{ color: 'var(--text-primary)' }}>{u.name}</p>
                              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {friendQuery.length >= 2 && !friendSearching && friendResults.length === 0 && (
                      <p className="text-xs font-mono mt-2" style={{ color: 'var(--text-muted)' }}>No users found</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Manual mode */}
            {friendMode === 'manual' && (
              <div className="space-y-3 animate-fade-in">
                <div className="flex items-center gap-2 mb-1">
                  <button onClick={() => { setFriendMode(''); setManualFriend({ name: '', topics: [], speed: '', activity: '' }); }}
                    className="p-1.5 rounded-lg" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                    <X size={13} />
                  </button>
                  <p className="text-xs font-mono" style={{ color: '#c084fc' }}>Enter friend's details</p>
                </div>

                <input value={manualFriend.name} onChange={e => setManualFriend(f => ({ ...f, name: e.target.value }))}
                  placeholder="Friend's name" className="input-field w-full text-sm" />

                {/* Friend topics */}
                <div>
                  {manualFriend.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {manualFriend.topics.map(t => (
                        <span key={t} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                              style={{ background: 'rgba(192,132,252,0.15)', border: '1px solid rgba(192,132,252,0.30)', color: '#c084fc' }}>
                          {t} <button onClick={() => setManualFriend(f => ({ ...f, topics: f.topics.filter(x => x !== t) }))}><X size={9} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                  <input value={manualTopicSearch} onChange={e => setManualTopicSearch(e.target.value)}
                    placeholder="Search friend's topics..." className="input-field w-full text-sm mb-2" />
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {filteredMTopics.slice(0, 12).map(t => (
                      <button key={t} onClick={() => { setManualFriend(f => ({ ...f, topics: [...f.topics, t] })); setManualTopicSearch(''); }}
                        className="px-2 py-1 rounded-full text-xs font-body transition-all"
                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
                        + {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Friend speed */}
                <div className="grid grid-cols-3 gap-2">
                  {SPEEDS.map(s => (
                    <button key={s.id} onClick={() => setManualFriend(f => ({ ...f, speed: s.id }))}
                      className="py-2 px-2 rounded-xl text-center text-xs font-body transition-all"
                      style={{
                        background: manualFriend.speed === s.id ? `${s.color}15` : 'var(--bg-secondary)',
                        border: `1px solid ${manualFriend.speed === s.id ? s.color + '50' : 'var(--border-default)'}`,
                        color: manualFriend.speed === s.id ? s.color : 'var(--text-muted)',
                      }}>
                      {s.icon} {s.label}
                    </button>
                  ))}
                </div>

                {/* Friend activity */}
                <div className="grid grid-cols-3 gap-2">
                  {ACTIVITY.map(a => (
                    <button key={a.id} onClick={() => setManualFriend(f => ({ ...f, activity: a.id }))}
                      className="py-2 px-2 rounded-xl text-center text-xs font-body transition-all"
                      style={{
                        background: manualFriend.activity === a.id ? `${a.color}15` : 'var(--bg-secondary)',
                        border: `1px solid ${manualFriend.activity === a.id ? a.color + '50' : 'var(--border-default)'}`,
                        color: manualFriend.activity === a.id ? a.color : 'var(--text-muted)',
                      }}>
                      {a.icon} {a.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl text-sm"
                 style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }}>
              <AlertCircle size={15} /> {error}
            </div>
          )}

          <button onClick={findMatch} disabled={loading}
            className="btn-primary w-full justify-center py-4 text-base disabled:opacity-50">
            {loading
              ? <><Loader2 size={18} className="animate-spin" /> AI is finding your match...</>
              : <><Sparkles size={18} /> Find My Study Buddy</>}
          </button>
        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════
  // STAGE: RESULTS
  // ══════════════════════════════════════════════════════
  if (step === 'results' && result) {
    const { aiMatch, friendMatch, recommendation } = result;
    const recColor = recommendation?.type === 'ai' ? '#818cf8' : recommendation?.type === 'friend' ? '#4ade80' : '#fbbf24';
    const RecIcon  = recommendation?.type === 'ai' ? Crown : recommendation?.type === 'friend' ? Heart : Handshake;

    return (
      <div className="min-h-screen pt-20 pb-16 px-4">
        <div className="page-top-accent" />
        <div className="max-w-2xl mx-auto animate-fade-in">

          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="font-display font-bold text-3xl mb-1" style={{ color: 'var(--text-primary)' }}>
              Your Match Results ✨
            </h2>
            <p className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>
              Based on topics, learning speed & activity level
            </p>
          </div>

          {/* Recommendation banner */}
          <div className="glass-card p-5 mb-4"
               style={{ border: `1.5px solid ${recColor}35`, background: `${recColor}0d` }}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                   style={{ background: `${recColor}20`, border: `1px solid ${recColor}40` }}>
                <RecIcon size={18} style={{ color: recColor }} />
              </div>
              <div>
                <p className="text-xs font-mono uppercase tracking-wider mb-1" style={{ color: recColor }}>
                  AI Recommendation
                </p>
                <p className="font-display font-bold text-base mb-1" style={{ color: 'var(--text-primary)' }}>
                  {recommendation?.title}
                </p>
                <p className="text-sm font-body leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {recommendation?.explanation}
                </p>
              </div>
            </div>
          </div>

          {/* AI Match card */}
          {aiMatch && (
            <div className="glass-card p-5 mb-4" style={{ border: '1px solid rgba(129,140,248,0.25)' }}>
              <div className="flex items-center gap-2 mb-4">
                <Brain size={14} style={{ color: '#818cf8' }} />
                <p className="text-xs font-mono uppercase tracking-wider" style={{ color: '#818cf8' }}>AI Best Match</p>
                {recommendation?.type === 'ai' && (
                  <span className="ml-auto text-xs font-mono px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(129,140,248,0.15)', color: '#818cf8', border: '1px solid rgba(129,140,248,0.30)' }}>
                    ⭐ Recommended
                  </span>
                )}
              </div>

              <div className="flex items-center gap-5 mb-5">
                <ScoreRing score={aiMatch.compatibility} size={90} label={SCORE_LABEL(aiMatch.compatibility)} />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <Avatar name={aiMatch.name} size={40} color="#818cf8" />
                    <div>
                      <p className="font-display font-bold text-base" style={{ color: 'var(--text-primary)' }}>{aiMatch.name}</p>
                      {aiMatch.email && <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{aiMatch.email}</p>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {aiMatch.topics?.slice(0, 4).map(t => (
                      <span key={t} className="text-xs font-body px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(129,140,248,0.12)', color: '#818cf8', border: '1px solid rgba(129,140,248,0.25)' }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2 p-4 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                <CompatBar label="Topic Similarity"   value={aiMatch.breakdown?.topics    || 0} />
                <CompatBar label="Learning Speed"     value={aiMatch.breakdown?.speed     || 0} />
                <CompatBar label="Activity Level"     value={aiMatch.breakdown?.activity  || 0} />
              </div>

              {aiMatch.commonTopics?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-mono mb-2" style={{ color: 'var(--text-muted)' }}>Common topics:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {aiMatch.commonTopics.map(t => (
                      <span key={t} className="text-xs font-body px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}>
                        ✓ {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Friend Match card */}
          {friendMatch && (
            <div className="glass-card p-5 mb-4" style={{ border: '1px solid rgba(74,222,128,0.20)' }}>
              <div className="flex items-center gap-2 mb-4">
                <Heart size={14} style={{ color: '#4ade80' }} />
                <p className="text-xs font-mono uppercase tracking-wider" style={{ color: '#4ade80' }}>Your Friend</p>
                {recommendation?.type === 'friend' && (
                  <span className="ml-auto text-xs font-mono px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.30)' }}>
                    ⭐ Recommended
                  </span>
                )}
                {recommendation?.type === 'both' && (
                  <span className="ml-auto text-xs font-mono px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.30)' }}>
                    🤝 Group Study
                  </span>
                )}
              </div>

              <div className="flex items-center gap-5 mb-5">
                <ScoreRing score={friendMatch.compatibility} size={90} label={SCORE_LABEL(friendMatch.compatibility)} />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <Avatar name={friendMatch.name} size={40} color="#4ade80" />
                    <div>
                      <p className="font-display font-bold text-base" style={{ color: 'var(--text-primary)' }}>{friendMatch.name}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {friendMatch.topics?.slice(0, 4).map(t => (
                      <span key={t} className="text-xs font-body px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(74,222,128,0.10)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.20)' }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2 p-4 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                <CompatBar label="Topic Similarity"  value={friendMatch.breakdown?.topics   || 0} />
                <CompatBar label="Learning Speed"    value={friendMatch.breakdown?.speed    || 0} />
                <CompatBar label="Activity Level"    value={friendMatch.breakdown?.activity || 0} />
              </div>

              {/* Head to head comparison if both exist */}
              {aiMatch && (
                <div className="mt-3 p-3 rounded-xl flex items-center justify-between"
                     style={{ background: aiMatch.compatibility >= friendMatch.compatibility ? 'rgba(129,140,248,0.08)' : 'rgba(74,222,128,0.08)', border: '1px solid var(--border-default)' }}>
                  <div className="text-center">
                    <p className="text-xs font-mono mb-0.5" style={{ color: 'var(--text-muted)' }}>AI Match</p>
                    <p className="font-display font-bold text-lg" style={{ color: '#818cf8' }}>{aiMatch.compatibility}%</p>
                  </div>
                  <Swords size={18} style={{ color: 'var(--text-muted)' }} />
                  <div className="text-center">
                    <p className="text-xs font-mono mb-0.5" style={{ color: 'var(--text-muted)' }}>Friend</p>
                    <p className="font-display font-bold text-lg" style={{ color: '#4ade80' }}>{friendMatch.compatibility}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-mono mb-0.5" style={{ color: 'var(--text-muted)' }}>Winner</p>
                    <p className="text-sm font-display font-bold"
                       style={{ color: aiMatch.compatibility >= friendMatch.compatibility ? '#818cf8' : '#4ade80' }}>
                      {aiMatch.compatibility >= friendMatch.compatibility ? '🤖 AI Pick' : '💚 Friend'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* No users in DB yet — show explanation */}
          {!aiMatch && (
            <div className="glass-card p-5 mb-4 text-center" style={{ border: '1px solid rgba(251,191,36,0.25)' }}>
              <div className="text-3xl mb-2">🌱</div>
              <p className="font-display font-bold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Building the community</p>
              <p className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>
                Not enough users yet for AI matching. Invite friends to grow the pool!
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={reset} className="btn-primary flex-1 justify-center py-3"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              <RefreshCw size={15} /> Find Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}