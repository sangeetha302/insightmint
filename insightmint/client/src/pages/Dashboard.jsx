import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProfile } from '../utils/api';
import axios from 'axios';
import {
  BookOpen, Clock, Play, TrendingUp, Award, Search,
  Map, Trophy, Settings, ChevronRight, ChevronLeft,
  Flame, BarChart2, Calendar, Activity, Target,
  Plus, X, Check, Zap, Star, FileText
} from 'lucide-react';

const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('insightmint_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// ── Persistence helpers ──────────────────────────────────
const STREAK_KEY    = 'insightmint_streak';
const SESSIONS_KEY  = 'insightmint_sessions';
const ACTIVITY_KEY  = 'insightmint_activity';

const today = () => new Date().toISOString().split('T')[0];

const loadStreak = () => {
  try { return JSON.parse(localStorage.getItem(STREAK_KEY) || '{"current":0,"best":0,"lastDate":""}'); }
  catch { return { current: 0, best: 0, lastDate: '' }; }
};

const loadSessions = () => {
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '{}'); }
  catch { return {}; }
};

const loadActivity = () => {
  try { return JSON.parse(localStorage.getItem(ACTIVITY_KEY) || '{}'); }
  catch { return {}; }
};

const recordActivity = () => {
  const d = today();
  const activity = loadActivity();
  activity[d] = (activity[d] || 0) + 1;
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity));

  // Update streak
  const streak = loadStreak();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (streak.lastDate === d) return; // already recorded today
  if (streak.lastDate === yesterday) {
    streak.current += 1;
  } else if (streak.lastDate !== d) {
    streak.current = 1;
  }
  streak.best = Math.max(streak.best, streak.current);
  streak.lastDate = d;
  localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
};

const addSession = (date, session) => {
  const sessions = loadSessions();
  if (!sessions[date]) sessions[date] = [];
  sessions[date].push({ ...session, id: Date.now().toString() });
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  recordActivity();
};

const removeSession = (date, id) => {
  const sessions = loadSessions();
  if (sessions[date]) sessions[date] = sessions[date].filter(s => s.id !== id);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [roadmapProgress, setRoadmapProgress] = useState([]);
  const navigate = useNavigate();

  // Streak
  const [streak, setStreak]       = useState(loadStreak);
  const [activity, setActivity]   = useState(loadActivity);

  // Calendar
  const [calDate, setCalDate]     = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(today());
  const [sessions, setSessions]   = useState(loadSessions);
  const [showAddSession, setShowAddSession] = useState(false);
  const [newSession, setNewSession] = useState({ title: '', duration: '30', type: 'study' });

  // Monthly report
  const [reportMonth, setReportMonth] = useState(new Date());

  // Saved notes
  const [savedNotes, setSavedNotes] = useState([]);

  useEffect(() => {
    getProfile().then(({ data }) => setProfile(data)).catch(() => {});
    try {
      const saved = JSON.parse(localStorage.getItem('insightmint_dashboard_roadmaps') || '[]');
      setRoadmapProgress(saved);
    } catch {}
    // Load notes from API
    api.get('/notes').then(({ data }) => setSavedNotes(data.notes || [])).catch(() => {});
  }, []);

  const history = profile?.learningHistory || [];

  // ── STREAK HELPERS ───────────────────────────────────
  const getLast7Days = () => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.now() - (6 - i) * 86400000);
      return { date: d.toISOString().split('T')[0], day: DAYS[d.getDay()], count: activity[d.toISOString().split('T')[0]] || 0 };
    });
  };

  const streakBadges = [
    { days: 3, label: '3-Day Streak' },
    { days: 7, label: '7-Day Streak' },
    { days: 14, label: '2-Week Warrior' },
    { days: 30, label: '30-Day Champion' },
  ];
  const nextBadge = streakBadges.find(b => b.days > streak.current) || streakBadges[streakBadges.length - 1];

  // ── MONTHLY REPORT HELPERS ───────────────────────────
  const getMonthStats = (monthDate) => {
    const y = monthDate.getFullYear();
    const m = monthDate.getMonth();
    const allSessions = loadSessions();
    let totalMins = 0, sessionCount = 0, activeDays = new Set();

    Object.entries(allSessions).forEach(([date, dayS]) => {
      const d = new Date(date);
      if (d.getFullYear() === y && d.getMonth() === m) {
        dayS.forEach(s => { totalMins += parseInt(s.duration || 0); sessionCount++; activeDays.add(date); });
      }
    });

    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const roadmapsDone = roadmapProgress.filter(r => r.pct === 100).length;
    const totalRoadmaps = roadmapProgress.length;
    const completion = totalRoadmaps > 0 ? Math.round((roadmapsDone / totalRoadmaps) * 100) : 0;

    // Weekly breakdown
    const weeks = [0, 0, 0, 0, 0];
    Object.entries(allSessions).forEach(([date, dayS]) => {
      const d = new Date(date);
      if (d.getFullYear() === y && d.getMonth() === m) {
        const weekIdx = Math.min(Math.floor((d.getDate() - 1) / 7), 4);
        dayS.forEach(s => { weeks[weekIdx] += parseInt(s.duration || 0); });
      }
    });

    return { hours: (totalMins / 60).toFixed(1), sessions: sessionCount, activeDays: activeDays.size, completion, weeks, daysInMonth };
  };

  // ── CALENDAR HELPERS ─────────────────────────────────
  const getDaysInMonth = (date) => {
    const y = date.getFullYear(), m = date.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const prevDays = new Date(y, m, 0).getDate();
    const days = [];

    for (let i = firstDay - 1; i >= 0; i--)
      days.push({ day: prevDays - i, date: null, current: false });
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
      days.push({ day: i, date: dateStr, current: true, hasSessions: (sessions[dateStr]?.length || 0) > 0 });
    }
    // Only fill to complete last row (no extra empty rows)
    const remainder = days.length % 7;
    if (remainder !== 0) {
      for (let i = 1; i <= 7 - remainder; i++)
        days.push({ day: i, date: null, current: false });
    }
    return days;
  };

  const handleAddSession = () => {
    if (!newSession.title.trim()) return;
    addSession(selectedDay, newSession);
    setSessions(loadSessions());
    setActivity(loadActivity());
    setStreak(loadStreak());
    setNewSession({ title: '', duration: '30', type: 'study' });
    setShowAddSession(false);
  };

  const handleRemoveSession = (id) => {
    removeSession(selectedDay, id);
    setSessions(loadSessions());
  };

  const selectedSessions = sessions[selectedDay] || [];
  const monthStats = getMonthStats(reportMonth);
  const last7 = getLast7Days();
  const maxWeek = Math.max(...monthStats.weeks, 1);

  // ── ACTIVITY HEATMAP ─────────────────────────────────
  const getHeatmapDays = () => {
    const days = [];
    const end = new Date();
    const start = new Date(end);
    start.setMonth(start.getMonth() - 3);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      days.push({ date: dateStr, count: activity[dateStr] || 0, isToday: dateStr === today() });
    }
    return days;
  };

  const heatmapDays = getHeatmapDays();
  const heatColor = (count) => {
    if (count === 0) return 'var(--border-default)';
    if (count === 1) return 'rgba(99,102,241,0.3)';
    if (count === 2) return 'rgba(99,102,241,0.55)';
    if (count === 3) return 'rgba(99,102,241,0.75)';
    return '#6366f1';
  };

  // ── LEARNING PROGRESS ────────────────────────────────
  const totalRoadmapTopics = roadmapProgress.reduce((sum, r) => {
    try {
      const all = JSON.parse(localStorage.getItem('insightmint_roadmap_progress') || '{}');
      const key = r.topic.toLowerCase();
      return sum + (all[key]?.completed?.length || 0);
    } catch { return sum; }
  }, 0);
  const overallPct = roadmapProgress.length > 0
    ? Math.round(roadmapProgress.reduce((sum, r) => sum + r.pct, 0) / roadmapProgress.length)
    : 0;

  const formatDate = (d) => {
    const diff = Math.floor((Date.now() - new Date(d)) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return `${diff} days ago`;
  };

  const stats = [
    { icon: BookOpen,   label: 'Videos watched',    value: history.length,                                    color: 'var(--accent-primary)' },
    { icon: TrendingUp, label: 'Topics explored',   value: [...new Set(history.map(h=>h.topic))].length,      color: '#8b5cf6' },
    { icon: Map,        label: 'Roadmaps started',  value: roadmapProgress.length,                            color: '#f59e0b' },
    { icon: Flame,      label: 'Day streak',         value: streak.current,                                    color: '#f97316' },
  ];

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              Hey, <span className="gradient-text">{user?.name?.split(' ')[0] || 'Learner'}</span> 👋
            </h1>
            <p className="font-body" style={{ color: 'var(--text-muted)' }}>Here's your learning progress</p>
          </div>
          <button onClick={() => navigate('/profile')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-body transition-all"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='var(--accent-border)'; e.currentTarget.style.color='var(--accent-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border-default)'; e.currentTarget.style.color='var(--text-secondary)'; }}>
            <Settings size={15} /> Account Settings
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {stats.map(s => (
            <div key={s.label} className="glass-card p-5">
              <s.icon size={18} className="mb-3" style={{ color: s.color }} />
              <div className="font-display text-2xl font-bold mb-1" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── LEARNING PROGRESS BAR ── */}
        {roadmapProgress.length > 0 && (
          <div className="glass-card p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} style={{ color: 'var(--accent-primary)' }} />
              <h2 className="font-display font-semibold" style={{ color: 'var(--text-primary)' }}>Learning Progress</h2>
            </div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-body" style={{ color: 'var(--text-muted)' }}>Overall Completion</span>
              <span className="font-mono font-bold" style={{ color: 'var(--accent-primary)' }}>{overallPct}%</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--border-default)' }}>
              <div className="h-full rounded-full transition-all duration-1000"
                   style={{ width: `${overallPct}%`, background: 'linear-gradient(90deg,#6366f1,#a855f7,#14b8a6)' }} />
            </div>
            <div className="flex gap-4 mt-3 flex-wrap">
              {roadmapProgress.slice(0,4).map((r,i) => (
                <button key={i} onClick={() => navigate(`/roadmap?topic=${encodeURIComponent(r.topic)}`)}
                  className="flex items-center gap-2 text-xs font-body transition-all hover:opacity-70">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: r.pct===100?'#4ade80':'#818cf8' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{r.topic}</span>
                  <span className="font-mono" style={{ color: r.pct===100?'#4ade80':'#818cf8' }}>{r.pct}%</span>
                  {r.pct===100 && <Trophy size={10} style={{ color: '#fbbf24' }} />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="glass-card p-5 mb-6">
          <h2 className="font-display font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Quick actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Search,   label: 'Explore',   sub: 'Find videos',      color: 'var(--accent-primary)', bg: 'var(--accent-dim)',           border: 'var(--accent-border)',          path: '/explore' },
              { icon: Map,      label: 'Roadmap',   sub: 'AI-gen paths',     color: '#818cf8',               bg: 'rgba(99,102,241,0.10)',        border: 'rgba(99,102,241,0.20)',         path: '/roadmap' },
              { icon: Zap,      label: 'Summarizer',sub: 'AI summaries',     color: '#f59e0b',               bg: 'rgba(245,158,11,0.10)',        border: 'rgba(245,158,11,0.20)',         path: '/summarize' },
              { icon: Award,    label: 'Quiz',       sub: 'Test knowledge',  color: '#f87171',               bg: 'rgba(248,113,113,0.10)',       border: 'rgba(248,113,113,0.20)',        path: '/quiz' },
            ].map(a => (
              <button key={a.label} onClick={() => navigate(a.path)}
                className="flex items-center gap-3 p-3 rounded-xl text-left transition-all hover:translate-y-[-1px]"
                style={{ background: a.bg, border: `1px solid ${a.border}` }}>
                <a.icon size={16} style={{ color: a.color }} />
                <div>
                  <div className="font-display font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{a.label}</div>
                  <div className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>{a.sub}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── ROW: Daily Streak + Monthly Report ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Daily Streak */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Flame size={18} style={{ color: '#f97316' }} />
              <h2 className="font-display font-semibold" style={{ color: 'var(--text-primary)' }}>Daily Streak</h2>
            </div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center"
                     style={{ background: streak.current > 0 ? 'rgba(249,115,22,0.15)' : 'var(--bg-card)', border: `2px solid ${streak.current > 0 ? '#f97316' : 'var(--border-default)'}` }}>
                  <Flame size={24} style={{ color: streak.current > 0 ? '#f97316' : 'var(--text-muted)' }} />
                </div>
                <div>
                  <div className="font-display text-3xl font-bold" style={{ color: streak.current > 0 ? '#f97316' : 'var(--text-primary)' }}>
                    {streak.current} <span className="text-lg font-normal" style={{ color: 'var(--text-muted)' }}>days</span>
                  </div>
                  <div className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>Current streak</div>
                  <div className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>Best: <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{streak.best} days</span></div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>Next badge</div>
                <div className="text-sm font-display font-bold" style={{ color: '#f97316' }}>{nextBadge.label}</div>
                <div className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>{Math.max(0, nextBadge.days - streak.current)} days away</div>
              </div>
            </div>

            {/* Last 7 days */}
            <div className="mb-3">
              <p className="text-xs font-body mb-2" style={{ color: 'var(--text-muted)' }}>Last 7 days</p>
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                {last7.map((d, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className="w-full h-8 rounded-lg transition-all"
                         style={{ background: d.count > 0 ? `rgba(249,115,22,${Math.min(0.9, 0.3 + d.count * 0.2)})` : 'var(--border-default)', border: d.date === today() ? '2px solid #f97316' : '2px solid transparent' }} />
                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{d.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress to next badge */}
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: 'var(--text-muted)' }}>Progress to {nextBadge.label}</span>
                <span style={{ color: 'var(--text-muted)' }}>{streak.current}/{nextBadge.days}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-default)' }}>
                <div className="h-full rounded-full transition-all"
                     style={{ width: `${Math.min(100,(streak.current/nextBadge.days)*100)}%`, background: 'linear-gradient(90deg,#f97316,#fbbf24)' }} />
              </div>
            </div>

            {streak.current === 0 && (
              <p className="text-xs font-body text-center py-2" style={{ color: 'var(--text-muted)' }}>
                Complete a study session today to start your streak! 🔥
              </p>
            )}
          </div>

          {/* Monthly Report */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart2 size={18} style={{ color: '#818cf8' }} />
                <h2 className="font-display font-semibold" style={{ color: 'var(--text-primary)' }}>Monthly Report</h2>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setReportMonth(new Date(reportMonth.getFullYear(), reportMonth.getMonth()-1))}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
                  <ChevronLeft size={14} />
                </button>
                <span className="text-sm font-body font-medium" style={{ color: 'var(--text-primary)' }}>
                  {MONTHS[reportMonth.getMonth()]} {reportMonth.getFullYear()}
                </span>
                <button onClick={() => setReportMonth(new Date(reportMonth.getFullYear(), reportMonth.getMonth()+1))}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {[
                { icon: Clock,    label: 'Hours Studied', value: monthStats.hours },
                { icon: Target,   label: 'Sessions Done',  value: monthStats.sessions },
                { icon: Activity, label: 'Active Days',    value: monthStats.activeDays },
                { icon: Star,     label: 'Completion',     value: `${monthStats.completion}%` },
              ].map(s => (
                <div key={s.label} className="p-2 rounded-xl text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                  <s.icon size={14} className="mx-auto mb-1" style={{ color: 'var(--text-muted)' }} />
                  <div className="font-display font-bold text-base" style={{ color: 'var(--text-primary)' }}>{s.value}</div>
                  <div className="text-xs font-body leading-tight" style={{ color: 'var(--text-muted)', fontSize: '9px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Weekly bar chart */}
            <div className="mb-3">
              <p className="text-xs font-body mb-2" style={{ color: 'var(--text-muted)' }}>Hours per week</p>
              <div className="flex items-end gap-2 h-16">
                {monthStats.weeks.map((mins, i) => {
                  const h = (mins/60).toFixed(1);
                  const pct = (mins / (maxWeek)) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full rounded-t-md transition-all relative group"
                           style={{ height: `${Math.max(4, pct)}%`, background: mins > 0 ? 'linear-gradient(to top,#6366f1,#a855f7)' : 'var(--border-default)', minHeight: '4px' }}>
                        {mins > 0 && (
                          <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
                               style={{ color: '#818cf8' }}>{h}h</div>
                        )}
                      </div>
                      <span className="text-xs font-mono" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>W{i+1}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Performance label */}
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
              <div>
                <p className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>Performance this month</p>
                <p className="font-display font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                  {parseFloat(monthStats.hours) === 0 ? 'Getting Started' : parseFloat(monthStats.hours) < 5 ? 'Building Momentum' : parseFloat(monthStats.hours) < 15 ? 'On Track' : 'Outstanding! 🔥'}
                </p>
              </div>
              <span className="font-display font-bold text-xl" style={{ color: 'var(--text-muted)' }}>{monthStats.hours}h</span>
            </div>
          </div>
        </div>

        {/* ── ROW: Study Calendar + Activity Heatmap ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Study Calendar */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar size={18} style={{ color: '#818cf8' }} />
                <h2 className="font-display font-semibold" style={{ color: 'var(--text-primary)' }}>Study Calendar</h2>
              </div>
              <button onClick={() => setShowAddSession(!showAddSession)}
                className="btn-primary py-1.5 px-3 text-xs rounded-xl flex items-center gap-1"
                style={{ background: showAddSession ? 'rgba(248,113,113,0.15)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: showAddSession ? '#f87171' : undefined, border: showAddSession ? '1px solid rgba(248,113,113,0.3)' : undefined }}>
                {showAddSession ? <><X size={13} /> Cancel</> : <><Plus size={13} /> Schedule</>}
              </button>
            </div>

            {/* Month nav */}
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth()-1))}
                className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
                <ChevronLeft size={14} />
              </button>
              <span className="font-display font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                {MONTHS[calDate.getMonth()]} {calDate.getFullYear()}
              </span>
              <button onClick={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth()+1))}
                className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS.map(d => (
                <div key={d} className="text-center text-xs font-mono py-1" style={{ color: 'var(--text-muted)' }}>{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-0.5 mb-4">
              {getDaysInMonth(calDate).map((d, i) => (
                <button key={i}
                  onClick={() => d.date && setSelectedDay(d.date)}
                  disabled={!d.current}
                  className="aspect-square flex items-center justify-center rounded-lg text-sm font-body transition-all relative"
                  style={{
                    color: !d.current ? 'var(--border-default)' : d.date === selectedDay ? '#fff' : d.date === today() ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    background: d.date === selectedDay ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : d.date === today() ? 'var(--accent-dim)' : 'transparent',
                    fontWeight: d.date === today() || d.date === selectedDay ? '700' : '400',
                    border: d.date === today() && d.date !== selectedDay ? '1px solid var(--accent-border)' : '1px solid transparent',
                  }}>
                  {d.day}
                  {d.hasSessions && d.date !== selectedDay && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: '#818cf8' }} />
                  )}
                </button>
              ))}
            </div>

            {/* Add session form - shows inline when Schedule clicked */}
            {showAddSession && (
              <div className="mb-4 p-4 rounded-xl animate-fade-in" style={{ background: 'var(--bg-card)', border: '1.5px solid rgba(99,102,241,0.35)' }}>
                <p className="text-sm font-display font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Plus size={14} style={{ color: '#818cf8' }} />
                  Add to {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
                <input type="text" value={newSession.title} onChange={e => setNewSession(p=>({...p,title:e.target.value}))}
                  onKeyDown={e => e.key === 'Enter' && handleAddSession()}
                  placeholder="What will you study? (e.g. React Hooks, Python OOP...)"
                  className="input-field text-sm mb-2" autoFocus />
                <div className="flex gap-2 mb-3">
                  <select value={newSession.duration} onChange={e => setNewSession(p=>({...p,duration:e.target.value}))}
                    className="input-field text-sm flex-1" style={{ colorScheme: 'dark' }}>
                    {['15','30','45','60','90','120'].map(d => <option key={d} value={d}>{d} min</option>)}
                  </select>
                  <select value={newSession.type} onChange={e => setNewSession(p=>({...p,type:e.target.value}))}
                    className="input-field text-sm flex-1" style={{ colorScheme: 'dark' }}>
                    <option value="study">📖 Study</option>
                    <option value="practice">💻 Practice</option>
                    <option value="review">🔄 Review</option>
                    <option value="project">🛠️ Project</option>
                  </select>
                </div>
                <button onClick={handleAddSession}
                  disabled={!newSession.title.trim()}
                  className="btn-primary w-full justify-center text-sm py-2.5 disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                  <Check size={14} /> Add Session
                </button>
              </div>
            )}

            {/* Selected day sessions */}
            <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '12px' }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-display font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </p>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
                  {selectedSessions.length} sessions
                </span>
              </div>
              {selectedSessions.length === 0 && !showAddSession ? (
                <p className="text-xs font-body text-center py-3" style={{ color: 'var(--text-muted)' }}>
                  No sessions. Click <strong>Schedule</strong> to add one.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {selectedSessions.map(s => (
                    <div key={s.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg group"
                         style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                      <div className="flex items-center gap-2">
                        <span className="text-base">{s.type==='study'?'📖':s.type==='practice'?'💻':s.type==='review'?'🔄':'🛠️'}</span>
                        <div>
                          <span className="text-sm font-body font-medium" style={{ color: 'var(--text-primary)' }}>{s.title}</span>
                          <span className="text-xs font-mono ml-2" style={{ color: 'var(--text-muted)' }}>{s.duration} min</span>
                        </div>
                      </div>
                      <button onClick={() => handleRemoveSession(s.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded-md"
                        style={{ color: '#f87171', background: 'rgba(248,113,113,0.10)' }}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* placeholder for removed old form */}
            {false && (
              <div>
              </div>
            )}
          </div>

          {/* Activity Heatmap */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity size={18} style={{ color: '#818cf8' }} />
                <h2 className="font-display font-semibold" style={{ color: 'var(--text-primary)' }}>Activity Heatmap</h2>
              </div>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono"
                    style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)', color: '#f97316' }}>
                <Flame size={11} /> {streak.current} day streak
              </span>
            </div>

            {/* Build weeks array for proper GitHub-style grid */}
            {(() => {
              // Pad heatmapDays so first day starts on correct weekday column
              const firstDayOfWeek = new Date(heatmapDays[0]?.date + 'T12:00:00').getDay();
              const padded = [...Array(firstDayOfWeek).fill(null), ...heatmapDays];
              const weeks = [];
              for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

              // Get month label positions
              const monthLabels = [];
              weeks.forEach((week, wi) => {
                week.forEach(d => {
                  if (d && new Date(d.date + 'T12:00:00').getDate() <= 7) {
                    const m = new Date(d.date + 'T12:00:00').toLocaleString('default', { month: 'short' });
                    if (!monthLabels.find(ml => ml.label === m))
                      monthLabels.push({ label: m, col: wi });
                  }
                });
              });

              return (
                <div>
                  {/* Month labels */}
                  <div className="flex mb-1" style={{ paddingLeft: '20px' }}>
                    {weeks.map((_, wi) => {
                      const ml = monthLabels.find(m => m.col === wi);
                      return (
                        <div key={wi} style={{ width: '14px', marginRight: '2px', flexShrink: 0 }}>
                          {ml && <span style={{ color: 'var(--text-muted)', fontSize: '9px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{ml.label}</span>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Grid */}
                  <div className="flex gap-0.5" style={{ paddingLeft: '0px' }}>
                    {/* Day labels */}
                    <div className="flex flex-col gap-0.5 mr-1" style={{ width: '18px' }}>
                      {['','M','','W','','F',''].map((d, i) => (
                        <div key={i} style={{ height: '14px', fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'monospace', lineHeight: '14px' }}>{d}</div>
                      ))}
                    </div>

                    {/* Weeks */}
                    {weeks.map((week, wi) => (
                      <div key={wi} className="flex flex-col gap-0.5">
                        {Array.from({ length: 7 }, (_, di) => {
                          const d = week[di];
                          if (!d) return <div key={di} style={{ width: '14px', height: '14px' }} />;
                          return (
                            <div key={di}
                              title={`${d.date}: ${d.count} session${d.count !== 1 ? 's' : ''}`}
                              style={{
                                width: '14px', height: '14px',
                                borderRadius: '3px',
                                background: heatColor(d.count),
                                border: d.isToday ? '2px solid #6366f1' : 'none',
                                cursor: 'default',
                                transition: 'transform 0.1s',
                                flexShrink: 0,
                              }}
                              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.3)'}
                              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Legend */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-3">
                {[
                  { label: 'Sessions', value: Object.values(activity).reduce((s,v)=>s+v,0), icon: '⚡' },
                  { label: 'Active days', value: Object.keys(activity).length, icon: '📅' },
                  { label: 'Best streak', value: `${streak.best}d`, icon: '🔥' },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-1.5">
                    <span style={{ fontSize: '12px' }}>{s.icon}</span>
                    <span className="font-display font-bold text-sm" style={{ color: '#818cf8' }}>{s.value}</span>
                    <span className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontFamily: 'monospace' }}>Less</span>
                {[0,1,2,3,4].map(i => (
                  <div key={i} style={{ width: '12px', height: '12px', borderRadius: '2px', background: heatColor(i) }} />
                ))}
                <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontFamily: 'monospace' }}>More</span>
              </div>
            </div>

            {/* Motivational message */}
            <div className="mt-4 p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
              <p className="text-xs font-body text-center" style={{ color: 'var(--text-muted)' }}>
                {streak.current === 0
                  ? '🌱 Start your streak by adding a study session today!'
                  : streak.current < 7
                  ? `🔥 ${streak.current} day streak! Keep going — ${7 - streak.current} more days to reach 7!`
                  : streak.current < 30
                  ? `⚡ Amazing ${streak.current} day streak! You're on fire!`
                  : `🏆 Legendary ${streak.current} day streak! You're unstoppable!`}
              </p>
            </div>

            {/* ── Saved Notes ── */}
            <div className="mt-4" style={{ borderTop: '1px solid var(--border-default)', paddingTop: '16px' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText size={15} style={{ color: '#818cf8' }} />
                  <h3 className="font-display font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Saved Notes</h3>
                  <span className="text-xs font-mono px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(129,140,248,0.15)', color: '#818cf8' }}>
                    {savedNotes.length}
                  </span>
                </div>
                <button onClick={() => navigate('/notes')}
                  className="text-xs font-body flex items-center gap-1 transition-all"
                  style={{ color: 'var(--accent-primary)' }}>
                  View all <ChevronRight size={11} />
                </button>
              </div>

              {savedNotes.length === 0 ? (
                <div className="text-center py-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px dashed var(--border-medium)' }}>
                  <p className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>No notes yet.</p>
                  <button onClick={() => navigate('/notes')}
                    className="text-xs font-body mt-1 transition-all"
                    style={{ color: 'var(--accent-primary)' }}>
                    Create your first note →
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedNotes.slice(0, 4).map(note => {
                    const typeColors = {
                      custom: { bg: 'rgba(139,92,246,0.10)', color: '#a78bfa' },
                      summary: { bg: 'rgba(245,158,11,0.10)', color: '#fbbf24' },
                      'ai generated': { bg: 'rgba(20,184,166,0.10)', color: '#2dd4bf' },
                      uploaded: { bg: 'rgba(99,102,241,0.10)', color: '#818cf8' },
                    };
                    const tc = typeColors[note.type] || typeColors.custom;
                    return (
                      <button key={note.id} onClick={() => navigate('/notes')}
                        className="w-full flex items-start gap-3 p-3 rounded-xl text-left group transition-all"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(129,140,248,0.35)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-default)'}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                             style={{ background: tc.bg }}>
                          <FileText size={13} style={{ color: tc.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-body font-medium truncate" style={{ color: 'var(--text-primary)' }}>{note.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-mono capitalize" style={{ color: tc.color }}>{note.type}</span>
                            {note.topic && <span className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>· {note.topic}</span>}
                          </div>
                        </div>
                        <ChevronRight size={13} className="flex-shrink-0 opacity-0 group-hover:opacity-60 transition-opacity mt-1" style={{ color: '#818cf8' }} />
                      </button>
                    );
                  })}
                  {savedNotes.length > 4 && (
                    <button onClick={() => navigate('/notes')}
                      className="w-full py-2 rounded-xl text-xs font-body text-center transition-all"
                      style={{ background: 'var(--bg-card)', border: '1px dashed var(--border-medium)', color: 'var(--text-muted)' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-primary)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                      +{savedNotes.length - 4} more notes →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recently watched */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold" style={{ color: 'var(--text-primary)' }}>Recently watched</h2>
            <button onClick={() => navigate('/explore')} className="text-sm font-body flex items-center gap-1" style={{ color: 'var(--accent-primary)' }}>
              Find more <ChevronRight size={13} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {history.slice().reverse().slice(0, 6).map((item, i) => (
              <button key={i}
                onClick={() => navigate(`/learn/${item.videoId}?topic=${encodeURIComponent(item.topic)}&title=${encodeURIComponent(item.videoTitle)}`)}
                className="flex items-center gap-3 p-3 rounded-xl text-left transition-all group"
                onMouseEnter={e => e.currentTarget.style.background='var(--accent-dim)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                <div className="w-16 h-10 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'var(--bg-tertiary)' }}>
                  <img src={item.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" onError={e=>{e.target.style.display='none';}} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-body line-clamp-1" style={{ color: 'var(--text-primary)' }}>{item.videoTitle}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="tag text-xs py-0 px-2">{item.topic}</span>
                    <span className="text-xs font-mono flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                      <Clock size={9} />{formatDate(item.completedAt)}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}