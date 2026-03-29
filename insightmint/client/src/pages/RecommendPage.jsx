import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Sparkles, Plus, X, Search, Loader2, ArrowRight,
  TrendingUp, BookOpen, Zap, Star, ChevronRight,
  Brain, Target, RefreshCw, Check
} from 'lucide-react';

const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('insightmint_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

const TYPE_META = {
  next:    { label: 'Next Step',    color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.25)',  icon: '🚀' },
  ready:   { label: 'Ready to Learn', color: '#818cf8', bg: 'rgba(129,140,248,0.12)', border: 'rgba(129,140,248,0.25)', icon: '✅' },
  related: { label: 'Related',      color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.25)', icon: '🔗' },
  popular: { label: 'Popular',      color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.25)', icon: '⭐' },
};

const CAT_COLORS = {
  'programming':     '#818cf8',
  'web':             '#34d399',
  'ai/ml':           '#f97316',
  'data':            '#fbbf24',
  'devops':          '#60a5fa',
  'cloud':           '#a78bfa',
  'cs fundamentals': '#f87171',
  'mobile':          '#2dd4bf',
  'security':        '#fb923c',
  'emerging':        '#e879f9',
};


const syncRecommendToDB = async (topics) => {
  const token = localStorage.getItem('insightmint_token');
  if (!token) return;
  try {
    await fetch('/api/userdata/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ tabUsage: { recommend_studied: topics } })
    });
    localStorage.setItem('insightmint_recommend_studied', JSON.stringify(topics));
  } catch {}
};

export default function RecommendPage() {
  const navigate = useNavigate();

  const [studiedTopics, setStudiedTopics] = useState(() => {
    try {
      const saved = localStorage.getItem('insightmint_recommend_studied');
      if (saved) return JSON.parse(saved);
      // fallback: pull from roadmap history
      const rh = JSON.parse(localStorage.getItem('insightmint_roadmap_history') || '[]');
      return rh.map(r => r.topic).filter(Boolean);
    } catch { return []; }
  });
  const [inputTopic, setInputTopic]         = useState('');
  const [allTopics, setAllTopics]           = useState([]);
  const [filtered, setFiltered]             = useState([]);
  const [showDropdown, setShowDropdown]     = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');
  const [insight, setInsight]               = useState('');
  const [algorithmInfo, setAlgorithmInfo]   = useState('');

  // Load saved topics from localStorage
  useEffect(() => {
    // Auto-populate from roadmap history
    try {
      const roadmapHistory = JSON.parse(localStorage.getItem('insightmint_roadmap_history') || '[]');
      const roadmapTopics = roadmapHistory.map(r => r.topic).filter(Boolean);
      const dashboardRoadmaps = JSON.parse(localStorage.getItem('insightmint_dashboard_roadmaps') || '[]');
      const dashTopics = dashboardRoadmaps.map(r => r.topic).filter(Boolean);
      const auto = [...new Set([...roadmapTopics, ...dashTopics])].slice(0, 6);
      if (auto.length > 0) setStudiedTopics(auto);
    } catch {}

    // Load all available topics from server
    api.get('/recommend/topics').then(({ data }) => {
      setAllTopics(data.topics || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (inputTopic.trim().length < 1) { setFiltered([]); return; }
    const q = inputTopic.toLowerCase();
    setFiltered(allTopics.filter(t => t.toLowerCase().includes(q) && !studiedTopics.includes(t)).slice(0, 6));
  }, [inputTopic, allTopics, studiedTopics]);

  const addTopic = (topic) => {
    if (!studiedTopics.includes(topic)) {
      const next = [...studiedTopics, topic];
      setStudiedTopics(next);
      localStorage.setItem('insightmint_recommend_studied', JSON.stringify(next));
      syncRecommendToDB(next);
    }
    setInputTopic(''); setFiltered([]); setShowDropdown(false);
  };

  const removeTopic = (topic) => setStudiedTopics(prev => prev.filter(t => t !== topic));

  const getRecommendations = async () => {
    setLoading(true); setRecommendations(null); setError('');
    try {
      const roadmapProgress = JSON.parse(localStorage.getItem('insightmint_dashboard_roadmaps') || '[]');
      const { data } = await api.post('/recommend', {
        studiedTopics,
        roadmapTopics: roadmapProgress.map(r => r.topic),
      });
      console.log('Recommend response:', data);
      setRecommendations(data.recommendations || []);
      setInsight(data.insight || '');
      setAlgorithmInfo(data.algorithm || '');
    } catch (err) {
      console.error('Recommend error:', err);
      setError(err.response?.data?.error || 'Failed to get recommendations. Make sure the server is running.');
    } finally { setLoading(false); }
  };

  const scoreBar = (score) => Math.min(100, Math.round(score * 100));

  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="page-top-accent" />
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-mono mb-4"
               style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8' }}>
            <Brain size={14} /> ML Topic Recommender
          </div>
          <h1 className="font-display text-4xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            What should you{' '}
            <span style={{ background: 'linear-gradient(135deg,#818cf8,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              learn next?
            </span>
          </h1>
          <p className="font-body text-lg max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
           Smart Topic Recommendations Based on Your Knowledge Level
          </p>
        </div>

        {/* Input card */}
        <div className="glass-card p-6 mb-6">
          <h2 className="font-display font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            Topics you've already studied
          </h2>
          <p className="text-sm font-body mb-4" style={{ color: 'var(--text-muted)' }}>
            Add topics you know — the ML model finds what fits your knowledge profile
          </p>

          {/* Added topics */}
          {studiedTopics.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {studiedTopics.map(t => (
                <span key={t} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-body"
                      style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', color: 'var(--accent-primary)' }}>
                  <Check size={11} /> {t}
                  <button onClick={() => removeTopic(t)} className="ml-1 hover:opacity-70">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Search input */}
          <div className="relative">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
                 style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)' }}>
              <Search size={16} style={{ color: 'var(--text-muted)' }} />
              <input type="text" value={inputTopic}
                onChange={e => { setInputTopic(e.target.value); setShowDropdown(true); }}
                onKeyDown={e => { if (e.key === 'Enter' && inputTopic.trim()) addTopic(inputTopic.trim()); }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Type a topic — Python, React, Machine Learning..."
                className="flex-1 bg-transparent outline-none font-body text-sm"
                style={{ color: 'var(--text-primary)' }} />
              {inputTopic && (
                <button onClick={() => addTopic(inputTopic.trim())}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-body"
                  style={{ background: 'var(--accent-dim)', color: 'var(--accent-primary)', border: '1px solid var(--accent-border)' }}>
                  <Plus size={11} /> Add
                </button>
              )}
            </div>

            {/* Dropdown */}
            {showDropdown && filtered.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-20 shadow-xl"
                   style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)' }}>
                {filtered.map(t => (
                  <button key={t} onClick={() => addTopic(t)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-all"
                    style={{ color: 'var(--text-primary)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-dim)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <Plus size={13} style={{ color: 'var(--accent-primary)' }} /> {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Popular quick-adds */}
          <div className="mt-3">
            <p className="text-xs font-mono mb-2" style={{ color: 'var(--text-muted)' }}>Quick add:</p>
            <div className="flex flex-wrap gap-1.5">
              {['Python','JavaScript','React','SQL','Machine Learning','Docker','Data Structures'].filter(t => !studiedTopics.includes(t)).map(t => (
                <button key={t} onClick={() => addTopic(t)}
                  className="px-2.5 py-1 rounded-full text-xs font-body transition-all"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='var(--accent-border)'; e.currentTarget.style.color='var(--accent-primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border-default)'; e.currentTarget.style.color='var(--text-muted)'; }}>
                  + {t}
                </button>
              ))}
            </div>
          </div>

          <button onClick={getRecommendations}
            disabled={loading}
            className="btn-primary w-full justify-center mt-5 py-3 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            {loading
              ? <><Loader2 size={16} className="animate-spin" /> Running ML model...</>
              : <><Sparkles size={16} /> Get Recommendations</>}
          </button>
        </div>

        {/* Algorithm info badge */}
        {algorithmInfo && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-5"
               style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
            <Brain size={13} style={{ color: '#818cf8' }} />
            <span className="text-xs font-mono" style={{ color: '#818cf8' }}>{algorithmInfo}</span>
          </div>
        )}

        {/* AI Insight */}
        {insight && (
          <div className="glass-card p-4 mb-5 flex items-start gap-3"
               style={{ border: '1px solid rgba(74,222,128,0.20)' }}>
            <Sparkles size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#4ade80' }} />
            <div>
              <p className="text-xs font-mono mb-1" style={{ color: '#4ade80' }}>AI Insight for you</p>
              <p className="text-sm font-body" style={{ color: 'var(--text-primary)' }}>{insight}</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-4 rounded-xl mb-4"
               style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }}>
            <span className="text-sm font-body">{error}</span>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="glass-card p-12 text-center">
            <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse"
                 style={{ background: 'rgba(99,102,241,0.15)', border: '2px solid rgba(99,102,241,0.30)' }}>
              <Brain size={24} style={{ color: '#818cf8' }} />
            </div>
            <p className="font-display font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              Computing similarity scores...
            </p>
            <p className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>
              Filter Content Based on What Matches Best
            </p>
          </div>
        )}

        {/* Results */}
        {recommendations && !loading && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                {recommendations.length} Recommended Topics
              </h2>
              <button onClick={() => { setRecommendations(null); setInsight(''); }}
                className="btn-ghost py-1.5 px-3 text-xs">
                <RefreshCw size={12} /> Reset
              </button>
            </div>

            {recommendations.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <p style={{ color: 'var(--text-muted)' }}>Add more studied topics to get recommendations.</p>
              </div>
            ) : (
              recommendations.map((rec, i) => {
                const meta = TYPE_META[rec.type] || TYPE_META.related;
                const catColor = CAT_COLORS[rec.category] || '#818cf8';
                return (
                  <div key={rec.topic}
                    className="glass-card p-5 hover:translate-y-[-1px] transition-all duration-200"
                    style={{ borderLeft: `3px solid ${meta.color}` }}>
                    <div className="flex items-start gap-4">
                      {/* Rank */}
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-display font-bold text-sm"
                           style={{ background: i === 0 ? 'linear-gradient(135deg,#fbbf24,#f97316)' : 'var(--bg-card)', color: i === 0 ? '#fff' : 'var(--text-muted)', border: `1px solid ${i === 0 ? 'transparent' : 'var(--border-default)'}` }}>
                        {i === 0 ? <Star size={14} /> : i + 1}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <h3 className="font-display font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                            {rec.topic}
                          </h3>
                          <span className="text-xs px-2 py-0.5 rounded-full font-mono"
                                style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
                            {meta.icon} {meta.label}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-mono capitalize"
                                style={{ background: `${catColor}15`, color: catColor }}>
                            {rec.category}
                          </span>
                        </div>
                        <p className="text-sm font-body mb-3" style={{ color: 'var(--text-secondary)' }}>
                          {rec.reason}
                        </p>

                        {/* Similarity score bar */}
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                            Match score
                          </span>
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-default)' }}>
                            <div className="h-full rounded-full transition-all duration-1000"
                                 style={{ width: `${scoreBar(rec.score)}%`, background: `linear-gradient(90deg,${meta.color},${meta.color}99)` }} />
                          </div>
                          <span className="text-xs font-mono font-bold" style={{ color: meta.color }}>
                            {scoreBar(rec.score)}%
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button onClick={() => navigate(`/roadmap?topic=${encodeURIComponent(rec.topic)}`)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-body transition-all"
                          style={{ background: 'var(--accent-dim)', color: 'var(--accent-primary)', border: '1px solid var(--accent-border)' }}>
                          Roadmap <ChevronRight size={11} />
                        </button>
                        <button onClick={() => navigate(`/explore?topic=${encodeURIComponent(rec.topic)}`)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-body transition-all"
                          style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
                          Videos <ChevronRight size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* ML explanation */}
            <div className="glass-card p-4 mt-2" style={{ border: '1px solid rgba(99,102,241,0.15)' }}>
              <p className="text-xs font-mono font-bold mb-2" style={{ color: '#818cf8' }}>
                🤖 How the ML model ranked these
              </p>
              <p className="text-xs font-body" style={{ color: 'var(--text-secondary)' }}>
                We turn every topic into a structured representation based on its category and relationships. By comparing this with what you’ve already learned, we identify the most relevant next topics. “Next Step” topics are carefully chosen as direct continuations of your learning path.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}