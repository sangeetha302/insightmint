import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import {
  Map, Search, Sparkles, Loader2, CheckCircle2,
  Circle, ChevronRight, ArrowRight, Clock, Trophy,
  RotateCcw, Download, BookOpen, X, History,
  ChevronDown, ChevronUp, Star, Zap
} from 'lucide-react';
import { downloadNotesPDF } from '../utils/pdf';

const api = axios.create({ baseURL: 'https://insightmint-backend-3zax.onrender.com/api' });
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('insightmint_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// ── Persistence helpers ──────────────────────────────────
const PROGRESS_KEY = 'insightmint_roadmap_progress';
const HISTORY_KEY  = 'insightmint_roadmap_history';

const loadAllProgress = () => {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'); }
  catch { return {}; }
};

const saveProgress = (topic, completed) => {
  const all = loadAllProgress();
  all[topic.toLowerCase()] = { completed, updatedAt: new Date().toISOString() };
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
};

const loadProgressForTopic = (topic) => {
  const all = loadAllProgress();
  return all[topic?.toLowerCase()]?.completed || [];
};

const loadRoadmapHistory = () => {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
};

const saveToHistory = (roadmap) => {
  const history = loadRoadmapHistory();
  const filtered = history.filter(h => h.topic.toLowerCase() !== roadmap.topic.toLowerCase());
  const newHistory = [{ topic: roadmap.topic, description: roadmap.description, totalDuration: roadmap.totalDuration, stageCount: roadmap.stages.length, savedAt: new Date().toISOString() }, ...filtered].slice(0, 15);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
};


const syncRoadmapHistoryToDB = async (history, progress) => {
  const token = localStorage.getItem('insightmint_token');
  if (!token || !history.length) return; // never overwrite with empty
  try {
    await fetch('/api/userdata/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({
        roadmapHistory:    history,
        dashboardRoadmaps: JSON.parse(localStorage.getItem('insightmint_dashboard_roadmaps') || '[]'),
        roadmapProgress:   progress || JSON.parse(localStorage.getItem('insightmint_roadmap_progress') || '{}'),
      })
    });
  } catch {}
};

// ── Dashboard progress update ────────────────────────────
const updateDashboardRoadmaps = (topic, pct) => {
  try {
    const key = 'insightmint_dashboard_roadmaps';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const filtered = existing.filter(r => r.topic.toLowerCase() !== topic.toLowerCase());
    filtered.unshift({ topic, pct, updatedAt: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(filtered.slice(0, 10)));
  } catch {}
};

const POPULAR = ['Python', 'JavaScript', 'React', 'Machine Learning', 'Data Science', 'Node.js', 'TypeScript', 'System Design', 'Docker', 'SQL'];

export default function RoadmapPage() {
  const { isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [query, setQuery] = useState(searchParams.get('topic') || '');
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState([]); // array of subtopic ids
  const [expandedStages, setExpandedStages] = useState({});
  const [history, setHistory] = useState(loadRoadmapHistory);
  const [showHistory, setShowHistory] = useState(false);

  // Auto-generate if topic in URL
  useEffect(() => {
    const topic = searchParams.get('topic');
    if (topic) generateRoadmap(topic);
  }, []);

  const generateRoadmap = async (topic) => {
    if (!topic?.trim()) return;
    setError(''); setLoading(true); setRoadmap(null);

    try {
      const { data } = await api.post('/roadmap/generate', { topic: topic.trim(), language });
      setRoadmap(data);

      // Load saved progress for this topic
      const saved = loadProgressForTopic(topic.trim());
      setCompleted(saved);

      // Expand all stages by default
      const exp = {};
      data.stages.forEach((_, i) => { exp[i] = true; });
      setExpandedStages(exp);

      // Save to history
      saveToHistory(data);
      setHistory(loadRoadmapHistory());
      syncRoadmapHistoryToDB(loadRoadmapHistory(), loadAllProgress());
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate roadmap. Please try again.');
    } finally { setLoading(false); }
  };

  const toggleSubtopic = (subtopicId) => {
    const newCompleted = completed.includes(subtopicId)
      ? completed.filter(id => id !== subtopicId)
      : [...completed, subtopicId];

    setCompleted(newCompleted);
    if (roadmap) {
      saveProgress(roadmap.topic, newCompleted);
      const total = roadmap.stages.reduce((sum, s) => sum + s.subtopics.length, 0);
      const pct = total > 0 ? Math.round((newCompleted.length / total) * 100) : 0;
      updateDashboardRoadmaps(roadmap.topic, pct);
    }
  };

  const toggleStage = (i) => setExpandedStages(prev => ({ ...prev, [i]: !prev[i] }));

  const markStageComplete = (stage) => {
    const ids = stage.subtopics.map(s => s.id);
    const allDone = ids.every(id => completed.includes(id));
    const newCompleted = allDone
      ? completed.filter(id => !ids.includes(id))
      : [...new Set([...completed, ...ids])];
    setCompleted(newCompleted);
    if (roadmap) {
      saveProgress(roadmap.topic, newCompleted);
      const total = roadmap.stages.reduce((sum, s) => sum + s.subtopics.length, 0);
      const pct = total > 0 ? Math.round((newCompleted.length / total) * 100) : 0;
      updateDashboardRoadmaps(roadmap.topic, pct);
    }
  };

  const resetProgress = () => {
    setCompleted([]);
    if (roadmap) { saveProgress(roadmap.topic, []); updateDashboardRoadmaps(roadmap.topic, 0); }
  };

  const loadFromHistory = (entry) => {
    setQuery(entry.topic);
    setShowHistory(false);
    generateRoadmap(entry.topic);
  };

  // Stats
  const totalSubtopics = roadmap?.stages?.reduce((sum, s) => sum + s.subtopics.length, 0) || 0;
  const completedCount = completed.length;
  const overallPct = totalSubtopics > 0 ? Math.round((completedCount / totalSubtopics) * 100) : 0;

  const stageProgress = (stage) => {
    const done = stage.subtopics.filter(s => completed.includes(s.id)).length;
    return { done, total: stage.subtopics.length, pct: Math.round((done / stage.subtopics.length) * 100) };
  };

  const downloadRoadmap = () => {
    if (!roadmap) return;
    const content = roadmap.stages.map(s =>
      `${s.title}\n${s.subtopics.map(t => `  - ${t.title}: ${t.description}`).join('\n')}`
    ).join('\n\n');
    downloadNotesPDF(
      `${roadmap.topic} Learning Roadmap`,
      roadmap.description,
      { sections: roadmap.stages.map(s => ({ title: s.title, content: s.subtopics.map(t => `• ${t.title}: ${t.description}`).join('\n') })) }
    );
  };

  return (
    <div className="min-h-screen">
      <div className="page-top-accent" />

      {/* ── Hero Header ── */}
      <div className="pt-20 pb-12 px-4 relative overflow-hidden"
           style={{ background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)', borderBottom: '1px solid var(--border-default)' }}>
        {/* Bg blobs */}
        <div className="absolute top-0 left-1/4 w-64 h-64 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(99,102,241,0.06)' }} />
        <div className="absolute top-0 right-1/4 w-64 h-64 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(20,184,166,0.06)' }} />

        <div className="max-w-3xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-mono mb-4"
               style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8' }}>
            <Map size={14} /> Learning Roadmap
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            Your Learning Path
          </h1>
          <p className="font-body text-lg mb-8" style={{ color: 'var(--text-muted)' }}>
            Get a step-by-step roadmap to master any topic
          </p>

          {/* Search bar */}
          <form onSubmit={e => { e.preventDefault(); generateRoadmap(query); }}
                className="flex gap-2 max-w-xl mx-auto">
            <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl"
                 style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)' }}>
              <Search size={18} style={{ color: 'var(--text-muted)' }} />
              <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Enter any topic — Python, Machine Learning, React..."
                className="flex-1 bg-transparent outline-none font-body text-base"
                style={{ color: 'var(--text-primary)' }} />
              {query && <button type="button" onClick={() => setQuery('')}><X size={14} style={{ color: 'var(--text-muted)' }} /></button>}
            </div>
            <button type="submit" disabled={loading || !query.trim()} className="btn-primary px-6 py-3 rounded-2xl disabled:opacity-50">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <><Sparkles size={16} /> Generate</>}
            </button>
          </form>

          {/* Popular topics */}
          {!roadmap && !loading && (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {POPULAR.map(t => (
                <button key={t} onClick={() => { setQuery(t); generateRoadmap(t); }}
                  className="px-3 py-1.5 rounded-full text-xs font-body transition-all hover:scale-105"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}
                  onMouseEnter={e => { e.target.style.color = 'var(--accent-primary)'; e.target.style.borderColor = 'var(--accent-border)'; }}
                  onMouseLeave={e => { e.target.style.color = 'var(--text-muted)'; e.target.style.borderColor = 'var(--border-default)'; }}>
                  {t}
                </button>
              ))}
            </div>
          )}

          {/* History button */}
          {history.length > 0 && (
            <button onClick={() => setShowHistory(!showHistory)}
              className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-body mx-auto transition-all"
              style={{ background: showHistory ? 'var(--accent-dim)' : 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>
              <History size={14} /> Recent roadmaps ({history.length})
            </button>
          )}
        </div>

        {/* History dropdown */}
        {showHistory && (
          <div className="max-w-xl mx-auto mt-4 rounded-2xl overflow-hidden animate-fade-in"
               style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)' }}>
            <div className="p-3 space-y-1 max-h-56 overflow-y-auto">
              {history.map((h, i) => {
                const saved = loadProgressForTopic(h.topic);
                const pct = roadmap?.topic?.toLowerCase() === h.topic.toLowerCase() ? overallPct : Math.round((saved.length / 1) * 0); // just show saved
                return (
                  <button key={i} onClick={() => loadFromHistory(h)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                    style={{ background: 'var(--bg-card)' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-border)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                         style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                      <Map size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-body font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{h.topic}</p>
                      <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{h.stageCount} stages · {h.totalDuration}</p>
                    </div>
                    {saved.length > 0 && (
                      <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-dim)', color: 'var(--accent-primary)' }}>
                        {saved.length} done
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse"
               style={{ background: 'rgba(99,102,241,0.15)', border: '2px solid rgba(99,102,241,0.30)' }}>
            <Map size={28} style={{ color: '#818cf8' }} />
          </div>
          <h3 className="font-display font-bold text-xl mb-2" style={{ color: 'var(--text-primary)' }}>Building your roadmap...</h3>
          <p className="font-body text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Groq AI is creating a personalized learning path for <span style={{ color: '#818cf8' }}>"{query}"</span></p>
          <div className="flex justify-center gap-1.5">
            {[0,1,2,3,4].map(i => (
              <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#818cf8', animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && !loading && (
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex items-center gap-2 p-4 rounded-xl" style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }}>
            <X size={16} />{error}
          </div>
        </div>
      )}

      {/* ── Roadmap Content ── */}
      {roadmap && !loading && (
        <div className="max-w-4xl mx-auto px-4 py-10 animate-fade-in">

          {/* Roadmap header */}
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              {roadmap.topic} Learning Roadmap
            </h2>
            <p className="font-body text-lg mb-4 max-w-2xl mx-auto" style={{ color: 'var(--text-muted)' }}>{roadmap.description}</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-body"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
                <Clock size={13} /> Estimated: {roadmap.totalDuration}
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-body"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
                <BookOpen size={13} /> {roadmap.stages.length} stages · {totalSubtopics} topics
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="glass-card p-5 mb-8">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
              <div>
                <h3 className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>Overall Progress</h3>
                <p className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>
                  {completedCount} of {totalSubtopics} topics completed
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-display text-3xl font-bold" style={{ color: overallPct === 100 ? '#4ade80' : '#818cf8' }}>
                  {overallPct}%
                </span>
                {overallPct === 100 && (
                  <Trophy size={24} style={{ color: '#fbbf24' }} className="animate-bounce" />
                )}
              </div>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--border-default)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                   style={{
                     width: `${overallPct}%`,
                     background: overallPct === 100
                       ? 'linear-gradient(90deg, #4ade80, #22c55e)'
                       : 'linear-gradient(90deg, #6366f1, #a855f7, #14b8a6)'
                   }} />
            </div>
            {overallPct === 100 && (
              <p className="text-center text-sm font-body mt-3 flex items-center justify-center gap-2" style={{ color: '#4ade80' }}>
                <Trophy size={14} /> 🎉 Congratulations! You've completed the entire roadmap!
              </p>
            )}
            <div className="flex justify-between mt-4 flex-wrap gap-2">
              <button onClick={resetProgress} className="btn-ghost py-1.5 px-3 text-xs flex items-center gap-1.5">
                <RotateCcw size={12} /> Reset progress
              </button>
              <div className="flex gap-2">
                <button onClick={downloadRoadmap} className="btn-ghost py-1.5 px-3 text-xs flex items-center gap-1.5">
                  <Download size={12} /> Download PDF
                </button>
                <button onClick={() => generateRoadmap(roadmap.topic)} className="btn-ghost py-1.5 px-3 text-xs flex items-center gap-1.5">
                  <Sparkles size={12} /> Regenerate
                </button>
              </div>
            </div>
          </div>

          {/* Stages */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-8 top-8 bottom-8 w-0.5 hidden md:block"
                 style={{ background: 'linear-gradient(to bottom, #6366f1, #a855f7, #14b8a6)' }} />

            <div className="space-y-6">
              {roadmap.stages.map((stage, i) => {
                const { done, total, pct: stagePct } = stageProgress(stage);
                const allDone = done === total;
                const expanded = expandedStages[i] !== false;

                return (
                  <div key={stage.id} className="relative md:pl-20">
                    {/* Stage number bubble */}
                    <div className="absolute left-0 top-5 w-16 h-16 rounded-full hidden md:flex items-center justify-center z-10 font-display font-bold text-lg transition-all"
                         style={{
                           background: allDone ? '#4ade80' : stage.color + '22',
                           border: `3px solid ${allDone ? '#4ade80' : stage.color}`,
                           color: allDone ? '#020817' : stage.color,
                           boxShadow: allDone ? '0 0 20px rgba(74,222,128,0.3)' : `0 0 20px ${stage.color}33`
                         }}>
                      {allDone ? <CheckCircle2 size={24} /> : i + 1}
                    </div>

                    {/* Stage card */}
                    <div className="glass-card overflow-hidden transition-all duration-300"
                         style={{ borderLeft: `3px solid ${allDone ? '#4ade80' : stage.color}` }}>

                      {/* Stage header */}
                      <div className="p-5 cursor-pointer" onClick={() => toggleStage(i)}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              {/* Mobile stage number */}
                              <span className="md:hidden w-7 h-7 rounded-full flex items-center justify-center text-xs font-display font-bold flex-shrink-0"
                                    style={{ background: stage.color + '22', border: `2px solid ${stage.color}`, color: stage.color }}>
                                {allDone ? '✓' : i + 1}
                              </span>
                              <h3 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{stage.title}</h3>
                              <span className="text-xs font-mono px-2 py-0.5 rounded-full"
                                    style={{ background: stage.color + '18', color: stage.color, border: `1px solid ${stage.color}30` }}>
                                {stage.duration}
                              </span>
                              {allDone && (
                                <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}>
                                  ✓ Completed
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>{stage.description}</p>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="text-right">
                              <span className="font-display font-bold" style={{ color: allDone ? '#4ade80' : stage.color }}>{done}/{total}</span>
                              <div className="w-16 h-1.5 rounded-full mt-1 overflow-hidden" style={{ background: 'var(--border-default)' }}>
                                <div className="h-full rounded-full transition-all duration-500"
                                     style={{ width: `${stagePct}%`, background: allDone ? '#4ade80' : stage.color }} />
                              </div>
                            </div>
                            {expanded ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                          </div>
                        </div>
                      </div>

                      {/* Subtopics */}
                      {expanded && (
                        <div className="px-5 pb-4 animate-fade-in">
                          {/* Mark all button */}
                          <button onClick={() => markStageComplete(stage)}
                            className="mb-3 text-xs font-body px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
                            style={{
                              background: allDone ? 'rgba(248,113,113,0.10)' : stage.color + '18',
                              color: allDone ? '#f87171' : stage.color,
                              border: `1px solid ${allDone ? 'rgba(248,113,113,0.25)' : stage.color + '30'}`
                            }}>
                            {allDone ? <><RotateCcw size={11} /> Unmark all</> : <><CheckCircle2 size={11} /> Mark all complete</>}
                          </button>

                          <div className="space-y-2">
                            {stage.subtopics.map(subtopic => {
                              const isDone = completed.includes(subtopic.id);
                              return (
                                <button key={subtopic.id}
                                  onClick={() => toggleSubtopic(subtopic.id)}
                                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 group"
                                  style={{
                                    background: isDone ? stage.color + '12' : 'var(--bg-card)',
                                    border: `1px solid ${isDone ? stage.color + '35' : 'var(--border-default)'}`,
                                  }}
                                  onMouseEnter={e => { if (!isDone) e.currentTarget.style.borderColor = stage.color + '40'; }}
                                  onMouseLeave={e => { if (!isDone) e.currentTarget.style.borderColor = 'var(--border-default)'; }}>
                                  {/* Check circle */}
                                  <div className="flex-shrink-0 transition-all duration-200">
                                    {isDone
                                      ? <CheckCircle2 size={20} style={{ color: stage.color }} />
                                      : <Circle size={20} style={{ color: 'var(--text-muted)' }} />
                                    }
                                  </div>
                                  {/* Text */}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-body font-medium text-sm transition-all duration-200"
                                       style={{ color: isDone ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: isDone ? `line-through ${stage.color}80` : 'none' }}>
                                      {subtopic.title}
                                    </p>
                                    <p className="text-xs font-body mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtopic.description}</p>
                                  </div>
                                  <ChevronRight size={14} className="flex-shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: stage.color }} />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom actions */}
          <div className="mt-10 flex gap-3 justify-center flex-wrap">
            <button onClick={() => { setRoadmap(null); setQuery(''); setCompleted([]); }}
              className="btn-ghost px-6">
              ← Generate another
            </button>
            <button onClick={() => navigate(`/explore?topic=${encodeURIComponent(roadmap.topic)}`)}
              className="btn-primary px-6">
              <Search size={15} /> Find videos for this topic
            </button>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!roadmap && !loading && !error && (
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: '🎯', title: 'Personalized paths', desc: 'AI generates roadmaps tailored to each specific topic' },
              { icon: '✅', title: 'Track progress', desc: 'Check off topics as you learn, progress saves automatically' },
              { icon: '📊', title: 'Dashboard sync', desc: 'Your progress appears on the dashboard for quick overview' },
            ].map(f => (
              <div key={f.title} className="glass-card p-5 text-center">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-display font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{f.title}</h3>
                <p className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}