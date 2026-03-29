import { useState, useEffect } from 'react';
import {
  History, Trash2, RotateCcw, BookOpen, ChevronDown, ChevronUp,
  ArrowLeft, Search, Filter, Trophy, Brain, Star, CheckCircle2,
  Lightbulb, Cloud, CloudOff, Calendar, Target, X, AlertCircle
} from 'lucide-react';
import {
  getLocalHistory, deleteLocalHistory, clearLocalHistory,
  fetchDBHistory, deleteDBEntry, saveLocalHistory
} from '../utils/examHistory';

const GRADE_META = {
  'A+': { color: '#4ade80', bg: 'rgba(74,222,128,0.15)',  label: 'Excellent' },
  'A':  { color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  label: 'Great' },
  'B+': { color: '#818cf8', bg: 'rgba(129,140,248,0.15)', label: 'Good' },
  'B':  { color: '#818cf8', bg: 'rgba(129,140,248,0.12)', label: 'Decent' },
  'C':  { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  label: 'Fair' },
  'D':  { color: '#f87171', bg: 'rgba(248,113,113,0.12)', label: 'Weak' },
  'F':  { color: '#f87171', bg: 'rgba(248,113,113,0.15)', label: 'Review' },
};

function GradeBadge({ grade }) {
  const meta = GRADE_META[grade] || GRADE_META['B'];
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-bold"
          style={{ background: meta.bg, color: meta.color }}>
      {grade}
    </span>
  );
}

// ── Full exam detail modal / expanded view ───────────────
function ExamDetailView({ entry, onClose, onRetry }) {
  const [activeTab, setActiveTab] = useState('overview'); // overview | answers | feedback
  const gradeMeta = GRADE_META[entry.grade] || GRADE_META['B'];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 pb-8 px-4 overflow-y-auto"
         style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-2xl animate-fade-in">
        {/* Modal header */}
        <div className="glass-card p-5 mb-3" style={{ border: `1.5px solid ${gradeMeta.color}30`, background: gradeMeta.bg }}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="font-display font-bold text-xl mb-0.5" style={{ color: 'var(--text-primary)' }}>
                {entry.topic}
              </h2>
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                {new Date(entry.date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                {' · '}{entry.difficulty}{' · '}{entry.totalQuestions} questions
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg transition-all"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
              <X size={16} />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="font-display font-black text-3xl" style={{ color: gradeMeta.color }}>{entry.grade}</p>
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Grade</p>
            </div>
            <div className="text-center">
              <p className="font-display font-bold text-2xl" style={{ color: gradeMeta.color }}>{entry.avgScore}/10</p>
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Avg Score</p>
            </div>
            <div className="flex-1">
              {/* Score bars per question */}
              <div className="flex gap-1 items-end h-10">
                {entry.results?.map((r, i) => {
                  const c = r.totalScore >= 8 ? '#4ade80' : r.totalScore >= 6 ? '#818cf8' : r.totalScore >= 4 ? '#fbbf24' : '#f87171';
                  return (
                    <div key={i} className="flex flex-col items-center gap-0.5 flex-1" title={`Q${i+1}: ${r.totalScore}/10`}>
                      <div className="w-full rounded-sm min-h-0.5" style={{ height: `${(r.totalScore / 10) * 36}px`, background: c }} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-3">
          {[
            { id: 'overview', label: 'Overview',     icon: <Target size={13} /> },
            { id: 'answers',  label: 'Q & A',        icon: <BookOpen size={13} /> },
            { id: 'feedback', label: 'AI Feedback',  icon: <Brain size={13} /> },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-mono font-medium transition-all"
              style={{
                background: activeTab === t.id ? 'rgba(99,102,241,0.15)' : 'var(--bg-secondary)',
                border: `1px solid ${activeTab === t.id ? 'rgba(99,102,241,0.40)' : 'var(--border-default)'}`,
                color: activeTab === t.id ? '#818cf8' : 'var(--text-muted)',
              }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-3 animate-fade-in">
            {entry.results?.map((r, i) => {
              const rMeta = GRADE_META[r.grade] || GRADE_META['B'];
              return (
                <div key={i} className="glass-card p-4" style={{ border: `1px solid ${rMeta.color}20` }}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded flex-shrink-0"
                          style={{ background: `${rMeta.color}15`, color: rMeta.color }}>Q{i+1}</span>
                    <p className="text-xs font-body flex-1" style={{ color: 'var(--text-secondary)' }}>{r.question}</p>
                    <GradeBadge grade={r.grade} />
                    <span className="text-xs font-mono font-bold" style={{ color: rMeta.color }}>{r.totalScore}/10</span>
                  </div>
                  {/* Rubric mini bars */}
                  <div className="grid grid-cols-5 gap-1">
                    {r.rubric?.map((rb, j) => {
                      const c = rb.score >= 2 ? '#4ade80' : rb.score >= 1 ? '#fbbf24' : '#f87171';
                      return (
                        <div key={j} className="text-center" title={`${rb.dimension}: ${rb.score}/2`}>
                          <div className="h-1.5 rounded-full overflow-hidden mb-0.5" style={{ background: 'var(--border-default)' }}>
                            <div style={{ width: `${(rb.score/2)*100}%`, height: '100%', background: c, borderRadius: 9999 }} />
                          </div>
                          <p style={{ fontSize: 9, color: 'var(--text-muted)' }} className="font-mono truncate">{rb.dimension?.slice(0,4)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab: Q & A */}
        {activeTab === 'answers' && (
          <div className="space-y-3 animate-fade-in">
            {entry.questions?.map((q, i) => {
              const ans     = entry.answers?.[q.id] || entry.answers?.[i] || '';
              const result  = entry.results?.[i];
              const rMeta   = result ? (GRADE_META[result.grade] || GRADE_META['B']) : null;
              return (
                <div key={i} className="glass-card p-5">
                  <div className="flex items-start gap-2 mb-3">
                    <span className="w-6 h-6 rounded flex items-center justify-center text-xs font-mono font-bold flex-shrink-0"
                          style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>{i+1}</span>
                    <p className="text-sm font-body font-medium leading-relaxed" style={{ color: 'var(--text-primary)' }}>{q.question}</p>
                  </div>
                  {/* Student's answer */}
                  <div className="p-3 rounded-xl mb-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                    <p className="text-xs font-mono uppercase mb-1.5" style={{ color: 'var(--text-muted)' }}>Your Answer</p>
                    <p className="text-sm font-body leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {ans || <em style={{ color: 'var(--text-muted)' }}>No answer recorded</em>}
                    </p>
                  </div>
                  {/* Model answer */}
                  {result?.modelAnswer && (
                    <div className="p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)' }}>
                      <p className="text-xs font-mono uppercase mb-1.5" style={{ color: '#818cf8' }}>Model Answer</p>
                      <p className="text-sm font-body leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{result.modelAnswer}</p>
                    </div>
                  )}
                  {rMeta && (
                    <div className="flex items-center gap-2 mt-2">
                      <GradeBadge grade={result.grade} />
                      <span className="text-xs font-mono" style={{ color: rMeta.color }}>{result.totalScore}/10</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Tab: AI Feedback */}
        {activeTab === 'feedback' && (
          <div className="space-y-3 animate-fade-in">
            {entry.results?.map((r, i) => (
              <div key={i} className="glass-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>Q{i+1}</span>
                  <p className="text-xs font-body line-clamp-1 flex-1" style={{ color: 'var(--text-muted)' }}>{r.question}</p>
                  <GradeBadge grade={r.grade} />
                </div>
                <p className="text-xs font-body leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>{r.overallFeedback}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.18)' }}>
                    <p className="text-xs font-mono uppercase mb-2" style={{ color: '#4ade80' }}>✓ Strengths</p>
                    {r.strengths?.map((s, j) => <p key={j} className="text-xs font-body mb-1" style={{ color: 'var(--text-secondary)' }}>• {s}</p>)}
                  </div>
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.18)' }}>
                    <p className="text-xs font-mono uppercase mb-2" style={{ color: '#fbbf24' }}>↑ Improve</p>
                    {r.improvements?.map((imp, j) => <p key={j} className="text-xs font-body mb-1" style={{ color: 'var(--text-secondary)' }}>{j+1}. {imp}</p>)}
                  </div>
                </div>
                {r.encouragement && (
                  <p className="text-xs font-body italic" style={{ color: (GRADE_META[r.grade]?.color || '#818cf8'), opacity: 0.85 }}>"{r.encouragement}"</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Bottom actions */}
        <div className="flex gap-3 mt-4">
          <button onClick={() => onRetry(entry)}
            className="btn-primary flex-1 justify-center py-3"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            <RotateCcw size={15} /> Retry This Exam
          </button>
          <button onClick={onClose} className="btn-ghost flex-1 justify-center py-3">
            <ArrowLeft size={15} /> Back to History
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ExamHistoryPage ─────────────────────────────────
export default function ExamHistoryPage({ onBack, onRetryExam }) {
  const [history, setHistory]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterDiff, setFilterDiff] = useState('');
  const [sortBy, setSortBy]         = useState('date'); // date | score
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [syncing, setSyncing]       = useState(false);

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = async () => {
    setLoading(true);
    // Start with localStorage
    const local = getLocalHistory();
    setHistory(local);

    // Try to merge from DB
    const token = localStorage.getItem('insightmint_token');
    if (token) {
      setSyncing(true);
      const dbHistory = await fetchDBHistory(token);
      if (dbHistory && Array.isArray(dbHistory)) {
        // Merge: DB entries take precedence, add any local-only ones
        const dbIds   = new Set(dbHistory.map(e => e.id));
        const localOnly = local.filter(e => !dbIds.has(e.id));
        const merged  = [...dbHistory, ...localOnly].sort((a, b) => new Date(b.date) - new Date(a.date));
        setHistory(merged);
        // Update localStorage with merged
        localStorage.setItem('insightmint_exam_history', JSON.stringify(merged.slice(0, 50)));
      }
      setSyncing(false);
    }
    setLoading(false);
  };

  const handleDelete = async (entry) => {
    // Remove from localStorage
    const updated = deleteLocalHistory(entry.id);
    setHistory(updated);
    setDeleteConfirm(null);
    setSelectedEntry(null);
    // Try DB delete
    const token = localStorage.getItem('insightmint_token');
    if (token && entry.synced) deleteDBEntry(entry.id, token);
  };

  const handleClearAll = () => {
    clearLocalHistory();
    setHistory([]);
  };

  // ── Filter + search + sort ──
  const filtered = history
    .filter(e => {
      const matchSearch = !search || e.topic.toLowerCase().includes(search.toLowerCase());
      const matchGrade  = !filterGrade || e.grade === filterGrade;
      const matchDiff   = !filterDiff  || e.difficulty === filterDiff;
      return matchSearch && matchGrade && matchDiff;
    })
    .sort((a, b) => sortBy === 'score' ? b.avgScore - a.avgScore : new Date(b.date) - new Date(a.date));

  // ── Stats ──
  const totalExams   = history.length;
  const avgScore     = totalExams ? (history.reduce((s, e) => s + e.avgScore, 0) / totalExams).toFixed(1) : 0;
  const bestGrade    = history.reduce((best, e) => {
    const grades = ['A+','A','B+','B','C','D','F'];
    return grades.indexOf(e.grade) < grades.indexOf(best) ? e.grade : best;
  }, 'F');
  const topicCounts  = history.reduce((acc, e) => { acc[e.topic] = (acc[e.topic] || 0) + 1; return acc; }, {});
  const topTopic     = Object.entries(topicCounts).sort((a,b) => b[1]-a[1])[0]?.[0];

  return (
    <>
      {selectedEntry && (
        <ExamDetailView
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onRetry={(entry) => { setSelectedEntry(null); onRetryExam(entry); }}
        />
      )}

      <div className="min-h-screen pt-20 pb-16 px-4">
        <div className="page-top-accent" />
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button onClick={onBack} className="p-2 rounded-xl transition-all"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
              <ArrowLeft size={16} />
            </button>
            <div className="flex-1">
              <h1 className="font-display font-bold text-2xl" style={{ color: 'var(--text-primary)' }}>
                Exam History
              </h1>
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                {totalExams} exam{totalExams !== 1 ? 's' : ''} taken
                {syncing && <span className="ml-2 opacity-70">· syncing...</span>}
              </p>
            </div>
            {totalExams > 0 && (
              <button onClick={() => setDeleteConfirm('all')}
                className="p-2 rounded-xl text-xs font-mono flex items-center gap-1 transition-all"
                style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.20)', color: '#f87171' }}>
                <Trash2 size={13} /> Clear All
              </button>
            )}
          </div>

          {/* Confirm delete all */}
          {deleteConfirm === 'all' && (
            <div className="glass-card p-4 mb-4 animate-fade-in" style={{ border: '1px solid rgba(248,113,113,0.30)' }}>
              <p className="text-sm font-body mb-3" style={{ color: 'var(--text-primary)' }}>
                Delete all {totalExams} exam records? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button onClick={handleClearAll} className="btn-primary py-2 px-4 text-sm"
                  style={{ background: '#f87171' }}>Yes, delete all</button>
                <button onClick={() => setDeleteConfirm(null)} className="btn-ghost py-2 px-4 text-sm">Cancel</button>
              </div>
            </div>
          )}

          {/* Stats bar */}
          {totalExams > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Total Exams', value: totalExams, color: '#818cf8', icon: <Target size={14} /> },
                { label: 'Avg Score',   value: `${avgScore}/10`, color: avgScore >= 7 ? '#4ade80' : avgScore >= 5 ? '#fbbf24' : '#f87171', icon: <Star size={14} /> },
                { label: 'Best Grade',  value: bestGrade, color: GRADE_META[bestGrade]?.color || '#818cf8', icon: <Trophy size={14} /> },
              ].map((s, i) => (
                <div key={i} className="glass-card p-3 text-center">
                  <div className="flex justify-center mb-1" style={{ color: s.color }}>{s.icon}</div>
                  <p className="font-display font-bold text-lg" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Search + filters */}
          {totalExams > 0 && (
            <div className="glass-card p-4 mb-4">
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by topic..."
                  className="input-field w-full text-sm pl-9" />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                    <X size={13} />
                  </button>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                {/* Grade filter */}
                <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)}
                  className="input-field text-xs py-1.5 px-3 flex-1"
                  style={{ minWidth: 100 }}>
                  <option value="">All Grades</option>
                  {['A+','A','B+','B','C','D','F'].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                {/* Difficulty filter */}
                <select value={filterDiff} onChange={e => setFilterDiff(e.target.value)}
                  className="input-field text-xs py-1.5 px-3 flex-1"
                  style={{ minWidth: 110 }}>
                  <option value="">All Levels</option>
                  {['beginner','intermediate','advanced'].map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</option>)}
                </select>
                {/* Sort */}
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                  className="input-field text-xs py-1.5 px-3 flex-1"
                  style={{ minWidth: 110 }}>
                  <option value="date">Sort: Latest</option>
                  <option value="score">Sort: Score</option>
                </select>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-20 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                   style={{ background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.20)' }}>
                <History size={28} style={{ color: '#818cf8' }} />
              </div>
              <h3 className="font-display font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
                {totalExams === 0 ? 'No exams yet' : 'No matches found'}
              </h3>
              <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>
                {totalExams === 0
                  ? 'Complete an exam to see your history here'
                  : 'Try adjusting your search or filters'}
              </p>
              {totalExams === 0 && (
                <button onClick={onBack} className="btn-primary mt-5">
                  <Brain size={15} /> Start an Exam
                </button>
              )}
            </div>
          )}

          {/* History list */}
          <div className="space-y-3">
            {filtered.map((entry, idx) => {
              const meta = GRADE_META[entry.grade] || GRADE_META['B'];
              return (
                <div key={entry.id}
                  className="glass-card p-4 cursor-pointer transition-all animate-fade-in"
                  style={{ border: `1px solid ${meta.color}18`, animationDelay: `${idx * 40}ms` }}
                  onClick={() => setSelectedEntry(entry)}
                  onMouseEnter={e => e.currentTarget.style.borderColor = `${meta.color}35`}
                  onMouseLeave={e => e.currentTarget.style.borderColor = `${meta.color}18`}>

                  <div className="flex items-start gap-4">
                    {/* Grade circle */}
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                         style={{ background: meta.bg, border: `1.5px solid ${meta.color}30` }}>
                      <span className="font-display font-black text-sm" style={{ color: meta.color }}>{entry.grade}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-display font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                          {entry.topic}
                        </h3>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {entry.synced
                            ? <Cloud size={11} style={{ color: '#4ade80', opacity: 0.7 }} title="Synced to cloud" />
                            : <CloudOff size={11} style={{ color: 'var(--text-muted)', opacity: 0.5 }} title="Local only" />}
                          <button
                            onClick={e => { e.stopPropagation(); setDeleteConfirm(entry.id); }}
                            className="p-1 rounded transition-all"
                            style={{ color: 'var(--text-muted)' }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className="text-xs font-mono" style={{ color: meta.color }}>{entry.avgScore}/10</span>
                        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{entry.totalQuestions}Q</span>
                        <span className="text-xs font-mono capitalize" style={{ color: 'var(--text-muted)' }}>{entry.difficulty}</span>
                        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                          <Calendar size={10} style={{ display: 'inline', marginRight: 3 }} />
                          {new Date(entry.date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                        </span>
                      </div>

                      {/* Mini score bar */}
                      <div className="flex gap-0.5 h-4 items-end">
                        {entry.results?.slice(0, 10).map((r, i) => {
                          const c = r.totalScore >= 8 ? '#4ade80' : r.totalScore >= 6 ? '#818cf8' : r.totalScore >= 4 ? '#fbbf24' : '#f87171';
                          return (
                            <div key={i} className="flex-1 rounded-sm" title={`Q${i+1}: ${r.totalScore}/10`}
                                 style={{ height: `${Math.max(2, (r.totalScore / 10) * 16)}px`, background: c }} />
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Confirm delete single */}
                  {deleteConfirm === entry.id && (
                    <div className="mt-3 pt-3 border-t flex items-center gap-2" style={{ borderColor: 'var(--border-default)' }}
                         onClick={e => e.stopPropagation()}>
                      <p className="text-xs font-body flex-1" style={{ color: 'var(--text-secondary)' }}>Delete this exam record?</p>
                      <button onClick={() => handleDelete(entry)}
                        className="text-xs font-mono px-3 py-1.5 rounded-lg"
                        style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}>
                        Delete
                      </button>
                      <button onClick={e => { e.stopPropagation(); setDeleteConfirm(null); }}
                        className="text-xs font-mono px-3 py-1.5 rounded-lg"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </>
  );
}