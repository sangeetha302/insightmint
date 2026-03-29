import { useState, useEffect } from 'react';
import { Loader2, ChevronDown, ChevronUp, CheckCircle, Circle } from 'lucide-react';
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('insightmint_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export default function Roadmap({ topic }) {
  const [roadmap, setRoadmap]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState(0);
  const [completed, setCompleted] = useState(new Set());

  useEffect(() => {
    if (!topic?.trim()) { setLoading(false); return; }
    setLoading(true);
    const lang = localStorage.getItem('insightmint_language') || 'en';
    api.post('/roadmap/generate', { topic: topic.trim(), language: lang })
      .then(({ data }) => {
        setRoadmap(data);
        try {
          const all  = JSON.parse(localStorage.getItem('insightmint_roadmap_progress') || '{}');
          const saved = all[topic.toLowerCase()]?.completed || [];
          setCompleted(new Set(saved));
        } catch {}
      })
      .catch(err => console.error('Roadmap error:', err.message))
      .finally(() => setLoading(false));
  }, [topic]);

  const toggleSubtopic = (id) => {
    setCompleted(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      try {
        const all = JSON.parse(localStorage.getItem('insightmint_roadmap_progress') || '{}');
        all[topic.toLowerCase()] = { completed: [...next], updatedAt: new Date().toISOString() };
        localStorage.setItem('insightmint_roadmap_progress', JSON.stringify(all));
      } catch {}
      return next;
    });
  };

  if (loading) return (
    <div className="flex flex-col items-center py-10 gap-3">
      <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
      <p className="font-body text-sm" style={{ color: 'var(--text-secondary)' }}>Generating roadmap...</p>
    </div>
  );

  // Safely get stages — handle any API response shape
  const stages = roadmap?.stages || [];

  if (!stages.length) return (
    <p className="text-center py-8 font-body text-sm" style={{ color: 'var(--text-muted)' }}>
      Could not generate roadmap. Please try again.
    </p>
  );

  // Normalize each stage — support both subtopics and skills arrays
  const normalizedStages = stages.map((stage, i) => ({
    ...stage,
    id:         stage.id         || `stage-${i}`,
    title:      stage.title      || `Stage ${i + 1}`,
    color:      stage.color      || '#6366f1',
    duration:   stage.duration   || '',
    description: stage.description || '',
    subtopics: (stage.subtopics || stage.skills || []).map((st, j) =>
      typeof st === 'string'
        ? { id: `s${i}-t${j}`, title: st, description: '' }
        : { id: st.id || `s${i}-t${j}`, title: st.title || st, description: st.description || '' }
    ),
  }));

  const totalSubtopics = normalizedStages.reduce((s, st) => s + st.subtopics.length, 0);
  const pct = totalSubtopics > 0 ? Math.round((completed.size / totalSubtopics) * 100) : 0;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-4">
        <h2 className="font-display font-bold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>
          Learning Roadmap
        </h2>
        <p className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>
          {roadmap.description || `Step-by-step path to master ${topic}`}
        </p>
      </div>

      {/* Progress bar */}
      <div className="glass-card p-4 mb-5 flex items-center gap-4">
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="font-body" style={{ color: 'var(--text-muted)' }}>Overall Progress</span>
            <span className="font-mono font-bold" style={{ color: 'var(--accent-primary)' }}>{pct}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-default)' }}>
            <div className="h-full rounded-full transition-all duration-700"
                 style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)' }} />
          </div>
        </div>
        <span className="text-xs font-mono flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
          {completed.size}/{totalSubtopics}
        </span>
      </div>

      {/* Stages */}
      <div className="space-y-3">
        {normalizedStages.map((stage, i) => {
          const stageDone     = stage.subtopics.filter(st => completed.has(st.id)).length;
          const stageComplete = stage.subtopics.length > 0 && stageDone === stage.subtopics.length;
          const isOpen        = expanded === i;

          return (
            <div key={stage.id} className="glass-card overflow-hidden">
              <button className="w-full flex items-center gap-3 p-4 text-left transition-all"
                onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-dim)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                onClick={() => setExpanded(isOpen ? null : i)}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                     style={{
                       background: stageComplete ? '#6366f1' : `${stage.color}22`,
                       border:     `2px solid ${stageComplete ? '#6366f1' : stage.color + '55'}`,
                       color:      stageComplete ? '#fff' : stage.color,
                     }}>
                  {stageComplete ? <CheckCircle size={16} /> : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {stage.title}
                  </p>
                  <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {stage.duration && `${stage.duration} · `}{stageDone}/{stage.subtopics.length} done
                  </p>
                </div>
                {isOpen
                  ? <ChevronUp  size={15} style={{ color: 'var(--text-muted)' }} />
                  : <ChevronDown size={15} style={{ color: 'var(--text-muted)' }} />}
              </button>

              {isOpen && (
                <div className="px-4 pb-4 animate-fade-in">
                  {stage.description && (
                    <p className="text-xs font-body mb-3 pl-12" style={{ color: 'var(--text-muted)' }}>
                      {stage.description}
                    </p>
                  )}
                  <div className="pl-12 space-y-2">
                    {stage.subtopics.map(st => {
                      const done = completed.has(st.id);
                      return (
                        <button key={st.id} onClick={() => toggleSubtopic(st.id)}
                          className="w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left transition-all"
                          style={{
                            background: done ? 'rgba(99,102,241,0.08)' : 'var(--bg-card)',
                            border: `1px solid ${done ? 'rgba(99,102,241,0.25)' : 'var(--border-default)'}`,
                          }}>
                          {done
                            ? <CheckCircle size={15} className="flex-shrink-0 mt-0.5" style={{ color: '#6366f1' }} />
                            : <Circle      size={15} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--border-strong)' }} />}
                          <div>
                            <p className="text-sm font-body font-medium"
                               style={{ color: done ? '#818cf8' : 'var(--text-primary)',
                                        textDecoration: done ? 'line-through' : 'none' }}>
                              {st.title}
                            </p>
                            {st.description && (
                              <p className="text-xs font-body mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                {st.description}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Completion */}
      {pct === 100 && (
        <div className="mt-5 p-4 rounded-2xl text-center animate-fade-in"
             style={{ background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.25)' }}>
          <p className="text-2xl mb-1">🎉</p>
          <p className="font-display font-bold" style={{ color: '#818cf8' }}>Roadmap Complete!</p>
          <p className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>
            You've mastered all topics in {topic}
          </p>
        </div>
      )}
    </div>
  );
}