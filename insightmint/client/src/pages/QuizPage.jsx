import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import {
  Brain, Search, Sparkles, Loader2, CheckCircle2, XCircle,
  ChevronRight, Trophy, RotateCcw, Upload, File, X,
  BookOpen, Zap, Target, Clock, Star, ChevronDown, ChevronUp, Image, History
} from 'lucide-react';
import { extractTextFromFile, getFileTypeLabel } from '../utils/fileExtractor';

const api = axios.create({ baseURL: 'https://insightmint-backend-3zax.onrender.com/api' });
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('insightmint_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

const DIFFICULTIES = [
  { id: 'beginner',     label: 'Beginner',      color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.30)' },
  { id: 'intermediate', label: 'Intermediate',   color: '#818cf8', bg: 'rgba(129,140,248,0.12)', border: 'rgba(129,140,248,0.30)' },
  { id: 'advanced',     label: 'Advanced',       color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.30)' },
];

const QUESTION_COUNTS = [5, 8, 10, 15];

const POPULAR = ['JavaScript', 'Python', 'React', 'Machine Learning', 'Data Structures', 'SQL', 'Computer Networks', 'Operating Systems', 'TypeScript', 'Node.js'];


// ── Quiz History helpers ─────────────────────────────────
const HISTORY_KEY = 'insightmint_quiz_history';

const loadQuizHistory = () => {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
};

const saveQuizToHistory = (entry) => {
  const history = loadQuizHistory();
  const newHistory = [entry, ...history].slice(0, 20); // keep last 20
  localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
};

const FILE_ACCEPT = '.pdf,.txt,.doc,.docx,.md,.png,.jpg,.jpeg';
const MAX_SIZE = 15 * 1024 * 1024;

export default function QuizPage() {
  const { isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  // Setup state
  const [mode, setMode] = useState('topic'); // 'topic' | 'document'
  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [count, setCount] = useState(8);
  const [file, setFile] = useState(null);
  const [fileLabel, setFileLabel] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractedChars, setExtractedChars] = useState(0);
  const extractedTextRef = useRef('');
  const [dragOver, setDragOver] = useState(false);

  // Quiz state
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Playing state
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState({}); // { questionIndex: selectedIndex }
  const [showExplanation, setShowExplanation] = useState(false);
  const [finished, setFinished] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [history, setHistory] = useState(loadQuizHistory);
  const [showHistory, setShowHistory] = useState(false);

  const handleFile = async (f) => {
    if (f.size > MAX_SIZE) { setError('File too large. Max 15MB.'); return; }
    setFile(f); setError('');
    setExtracting(true);
    setFileLabel(getFileTypeLabel(f));
    extractedTextRef.current = '';
    setExtractedChars(0);
    try {
      const text = await extractTextFromFile(f);
      extractedTextRef.current = text;
      setExtractedChars(text.length);
    } catch (err) {
      setError(`Could not read file: ${err.message}`);
      setFile(null);
    } finally { setExtracting(false); }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const startQuiz = async () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    setError(''); setLoading(true);
    setQuiz(null); setCurrent(0); setSelected(null);
    setAnswers({}); setShowExplanation(false); setFinished(false);

    try {
      let data;
      if (mode === 'document') {
        if (!file || !extractedTextRef.current) { setError('Please upload a file first.'); setLoading(false); return; }
        const { data: d } = await api.post('/quiz/from-document', {
          content: extractedTextRef.current.slice(0, 4000),
          title: file.name.replace(/\.[^/.]+$/, ''),
          difficulty, count, language
        });
        data = d;
      } else {
        if (!query.trim()) { setError('Please enter a topic.'); setLoading(false); return; }
        const { data: d } = await api.post('/quiz/generate', {
          topic: query.trim(), difficulty, count, language
        });
        data = d;
      }
      setQuiz(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate quiz. Please try again.');
    } finally { setLoading(false); }
  };

  const selectAnswer = (idx) => {
    if (answers[current] !== undefined) return;
    setSelected(idx);
    setAnswers(prev => ({ ...prev, [current]: idx }));
    setShowExplanation(true);
  };

  const nextQuestion = () => {
    if (current < quiz.questions.length - 1) {
      setCurrent(c => c + 1);
      setSelected(null);
      setShowExplanation(false);
    } else {
      setFinished(true);
      // Save to history
      const topic = mode === 'document' ? (file?.name?.replace(/\.[^/.]+$/, '') || 'Document') : query.trim();
      const entry = {
        id: Date.now(),
        topic,
        score: Object.entries({...answers, [current]: answers[current]}).filter(([qi, ai]) => quiz.questions[parseInt(qi)]?.correct === ai).length,
        total: quiz.questions.length,
        difficulty,
        mode,
        date: new Date().toISOString(),
      };
      saveQuizToHistory(entry);
      setHistory(loadQuizHistory());
    }
  };

  const restart = () => {
    setQuiz(null); setCurrent(0); setSelected(null);
    setAnswers({}); setShowExplanation(false); setFinished(false);
    setShowReview(false);
  };

  const tryAnother = () => {
    restart(); setQuery(''); setFile(null);
    extractedTextRef.current = ''; setExtractedChars(0);
  };

  // Scoring
  const score = quiz ? Object.entries(answers).filter(([qi, ai]) => quiz.questions[parseInt(qi)]?.correct === ai).length : 0;
  const total = quiz?.questions?.length || 0;
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;

  const diffMeta = DIFFICULTIES.find(d => d.id === difficulty) || DIFFICULTIES[1];

  // ── RESULTS SCREEN ──────────────────────────────────────
  if (finished && quiz) {
    const grade = pct >= 90 ? { label: 'Excellent!', icon: '🏆', color: '#fbbf24' }
      : pct >= 70 ? { label: 'Great job!', icon: '🎉', color: '#4ade80' }
      : pct >= 50 ? { label: 'Good effort!', icon: '👍', color: '#818cf8' }
      : { label: 'Keep studying!', icon: '📚', color: '#f87171' };

    return (
      <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="page-top-accent" />
        <div className="max-w-2xl mx-auto">
          <div className="glass-card p-8 text-center animate-fade-in">
            {/* Score circle */}
            <div className="relative w-32 h-32 mx-auto mb-6">
              <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="var(--border-default)" strokeWidth="8"/>
                <circle cx="60" cy="60" r="54" fill="none" stroke={grade.color} strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 54}`}
                  strokeDashoffset={`${2 * Math.PI * 54 * (1 - pct / 100)}`}
                  strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }}/>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-3xl font-bold" style={{ color: grade.color }}>{pct}%</span>
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{score}/{total}</span>
              </div>
            </div>

            <div className="text-4xl mb-2">{grade.icon}</div>
            <h2 className="font-display text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{grade.label}</h2>
            <p className="font-body mb-2" style={{ color: 'var(--text-muted)' }}>
              You answered <span className="font-semibold" style={{ color: grade.color }}>{score} out of {total}</span> correctly
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono mb-8"
                 style={{ background: diffMeta.bg, color: diffMeta.color, border: `1px solid ${diffMeta.border}` }}>
              {diffMeta.label} · {quiz.topic}
            </div>

            {/* Per-question result strip */}
            <div className="flex justify-center gap-1.5 mb-8 flex-wrap">
              {quiz.questions.map((q, i) => {
                const isCorrect = answers[i] === q.correct;
                return (
                  <button key={i} onClick={() => { setShowReview(true); setCurrent(i); setFinished(false); }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-transform hover:scale-110"
                    style={{ background: isCorrect ? 'rgba(74,222,128,0.20)' : 'rgba(248,113,113,0.20)', color: isCorrect ? '#4ade80' : '#f87171', border: `2px solid ${isCorrect ? '#4ade80' : '#f87171'}` }}>
                    {i + 1}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={restart} className="btn-primary px-6">
                <RotateCcw size={15} /> Retake Quiz
              </button>
              <button onClick={() => { setShowReview(true); setCurrent(0); setFinished(false); }} className="btn-ghost px-6">
                <BookOpen size={15} /> Review Answers
              </button>
              <button onClick={tryAnother} className="btn-ghost px-6">
                <Sparkles size={15} /> New Quiz
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── QUIZ PLAYING / REVIEW SCREEN ──────────────────────
  if (quiz && (current !== null || showReview)) {
    const q = quiz.questions[current];
    const userAnswer = answers[current];
    const isReviewing = showReview || answers[current] !== undefined;
    const diff = DIFFICULTIES.find(d => d.id === quiz.difficulty) || DIFFICULTIES[1];

    return (
      <div className="min-h-screen pt-20 pb-16 px-4">
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button onClick={tryAnother} className="btn-ghost py-2 px-3 text-sm">← Exit</button>
              <div>
                <p className="text-sm font-body font-medium" style={{ color: 'var(--text-primary)' }}>{quiz.topic}</p>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full"
                      style={{ background: diff.bg, color: diff.color, border: `1px solid ${diff.border}` }}>
                  {diff.label}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-body text-sm" style={{ color: 'var(--text-secondary)' }}>
                Question {current + 1} of {quiz.questions.length}
              </span>
              <span className="font-display font-bold" style={{ color: '#818cf8' }}>
                Score: {score}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 rounded-full mb-6 overflow-hidden" style={{ background: 'var(--border-default)' }}>
            <div className="h-full rounded-full transition-all duration-500"
                 style={{ width: `${((current + 1) / quiz.questions.length) * 100}%`, background: 'linear-gradient(90deg,#6366f1,#a855f7,#14b8a6)' }} />
          </div>

          {/* Question navigation (review mode) */}
          {showReview && (
            <div className="flex gap-1.5 mb-4 flex-wrap">
              {quiz.questions.map((_, i) => {
                const correct = answers[i] === quiz.questions[i].correct;
                const attempted = answers[i] !== undefined;
                return (
                  <button key={i} onClick={() => setCurrent(i)}
                    className="w-8 h-8 rounded-full text-xs font-mono font-bold transition-all hover:scale-110"
                    style={{
                      background: i === current ? '#818cf8' : attempted ? (correct ? 'rgba(74,222,128,0.20)' : 'rgba(248,113,113,0.20)') : 'var(--bg-card)',
                      color: i === current ? '#fff' : attempted ? (correct ? '#4ade80' : '#f87171') : 'var(--text-muted)',
                      border: `2px solid ${i === current ? '#818cf8' : attempted ? (correct ? '#4ade80' : '#f87171') : 'var(--border-default)'}`,
                    }}>
                    {i + 1}
                  </button>
                );
              })}
            </div>
          )}

          {/* Question card */}
          <div className="glass-card p-6 mb-4 animate-fade-in">
            <p className="font-display font-semibold text-lg leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              {q.question}
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3 mb-4">
            {q.options.map((opt, i) => {
              let bg = 'var(--bg-card)', border = 'var(--border-default)', color = 'var(--text-secondary)', cursor = 'pointer';
              let icon = null;

              if (isReviewing && userAnswer !== undefined) {
                cursor = 'default';
                if (i === q.correct) {
                  bg = 'rgba(74,222,128,0.10)'; border = 'rgba(74,222,128,0.45)'; color = '#4ade80';
                  icon = <CheckCircle2 size={18} style={{ color: '#4ade80' }} />;
                } else if (i === userAnswer && i !== q.correct) {
                  bg = 'rgba(248,113,113,0.10)'; border = 'rgba(248,113,113,0.45)'; color = '#f87171';
                  icon = <XCircle size={18} style={{ color: '#f87171' }} />;
                } else {
                  color = 'var(--text-muted)';
                }
              }

              // Option letter
              const letter = ['A', 'B', 'C', 'D'][i];

              return (
                <button key={i} onClick={() => !isReviewing && selectAnswer(i)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all duration-200 group"
                  style={{ background: bg, border: `1.5px solid ${border}`, color, cursor }}
                  onMouseEnter={e => { if (!isReviewing) e.currentTarget.style.borderColor = '#818cf880'; }}
                  onMouseLeave={e => { if (!isReviewing) e.currentTarget.style.borderColor = 'var(--border-default)'; }}>
                  {/* Letter circle */}
                  <span className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-display font-bold flex-shrink-0 transition-all"
                        style={{ borderColor: color, color, background: isReviewing && i === q.correct ? 'rgba(74,222,128,0.15)' : 'transparent' }}>
                    {letter}
                  </span>
                  <span className="font-body text-sm flex-1 leading-relaxed">{opt}</span>
                  {icon && <span className="flex-shrink-0">{icon}</span>}
                  {!isReviewing && <ChevronRight size={14} className="flex-shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: '#818cf8' }} />}
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {(showExplanation || (showReview && userAnswer !== undefined)) && (
            <div className="rounded-2xl p-5 mb-4 animate-fade-in"
                 style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.20)' }}>
              <p className="text-sm font-body leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                <span className="font-display font-bold" style={{ color: '#818cf8' }}>Explanation: </span>
                {q.explanation}
              </p>
            </div>
          )}

          {/* Next button */}
          {isReviewing && !showReview && userAnswer !== undefined && (
            <button onClick={nextQuestion} className="btn-primary w-full justify-center py-3.5"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              {current < quiz.questions.length - 1
                ? <><ChevronRight size={16} /> Next Question</>
                : <><Trophy size={16} /> See Results</>}
            </button>
          )}

          {/* Review navigation */}
          {showReview && (
            <div className="flex gap-3">
              <button onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}
                className="btn-ghost flex-1 justify-center py-3 disabled:opacity-30">← Previous</button>
              {current < quiz.questions.length - 1
                ? <button onClick={() => setCurrent(c => c + 1)} className="btn-primary flex-1 justify-center py-3" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>Next →</button>
                : <button onClick={() => { setFinished(true); setShowReview(false); }} className="btn-primary flex-1 justify-center py-3" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}><Trophy size={15} /> Results</button>
              }
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── SETUP SCREEN ──────────────────────────────────────
  return (
    <div className="min-h-screen pt-0 pb-16">

      {/* Hero */}
      <div className="pt-20 pb-14 px-4 relative overflow-hidden"
           style={{ background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)', borderBottom: '1px solid var(--border-default)' }}>
        <div className="absolute top-0 left-1/3 w-80 h-80 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(99,102,241,0.06)' }} />
        <div className="absolute top-0 right-1/3 w-80 h-80 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(20,184,166,0.05)' }} />

        <div className="max-w-2xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-mono mb-4"
               style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8' }}>
            <Brain size={14} /> Knowledge Quiz
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            Test Your Knowledge
          </h1>
          <p className="font-body text-lg mb-8" style={{ color: 'var(--text-muted)' }}>
            Generate AI-powered quizzes on any topic or from your documents
          </p>

          {/* Mode tabs */}
          <div className="flex gap-2 justify-center mb-6">
            {[
              { id: 'topic', label: 'By Topic', icon: Search },
              { id: 'document', label: 'From Document', icon: Upload },
            ].map(m => {
              const Icon = m.icon;
              return (
                <button key={m.id} onClick={() => { setMode(m.id); setError(''); }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-body transition-all"
                  style={{
                    background: mode === m.id ? 'rgba(99,102,241,0.15)' : 'var(--bg-card)',
                    border: `2px solid ${mode === m.id ? '#6366f1' : 'var(--border-default)'}`,
                    color: mode === m.id ? '#818cf8' : 'var(--text-muted)',
                    fontWeight: mode === m.id ? '600' : '400'
                  }}>
                  <Icon size={15} /> {m.label}
                </button>
              );
            })}
          </div>

          {/* Topic search */}
          {mode === 'topic' && (
            <>
              <div className="flex gap-2 max-w-xl mx-auto mb-5">
                <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl"
                     style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)' }}>
                  <Search size={18} style={{ color: 'var(--text-muted)' }} />
                  <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && startQuiz()}
                    placeholder="Enter a topic for your quiz..."
                    className="flex-1 bg-transparent outline-none font-body text-base"
                    style={{ color: 'var(--text-primary)' }} />
                  {query && <button onClick={() => setQuery('')}><X size={14} style={{ color: 'var(--text-muted)' }} /></button>}
                </div>
                <button onClick={startQuiz} disabled={loading || !query.trim()}
                  className="btn-primary px-6 py-3 rounded-2xl disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <><Sparkles size={16} /> Start</>}
                </button>
              </div>

              {/* Popular topics */}
              <div className="flex flex-wrap justify-center gap-2">
                {POPULAR.map(t => (
                  <button key={t} onClick={() => { setQuery(t); }}
                    className="px-3 py-1 rounded-full text-xs font-body transition-all hover:scale-105"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}
                    onMouseEnter={e => { e.target.style.color = '#818cf8'; e.target.style.borderColor = 'rgba(99,102,241,0.35)'; }}
                    onMouseLeave={e => { e.target.style.color = 'var(--text-muted)'; e.target.style.borderColor = 'var(--border-default)'; }}>
                    {t}
                  </button>
                ))}
              </div>
              {/* Recent quiz history */}
              {history.length > 0 && (
                <div className="mt-6 max-w-2xl mx-auto">
                  <button onClick={() => setShowHistory(h => !h)}
                    className="flex items-center gap-2 text-sm font-body mb-3 mx-auto px-4 py-2 rounded-xl transition-all"
                    style={{ color: 'var(--text-muted)', background: showHistory ? 'var(--accent-dim)' : 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                    <History size={14} /> Recent Quizzes ({history.length})
                    {showHistory ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                  {showHistory && (
                    <div className="space-y-2 animate-fade-in">
                      {history.map((h, i) => {
                        const hPct = Math.round((h.score / h.total) * 100);
                        const hColor = hPct >= 80 ? '#4ade80' : hPct >= 50 ? '#818cf8' : '#f87171';
                        const diff = DIFFICULTIES.find(d => d.id === h.difficulty) || DIFFICULTIES[1];
                        return (
                          <div key={h.id || i}
                            className="glass-card p-4 flex items-center gap-4 cursor-pointer hover:translate-y-[-1px] transition-all"
                            onClick={() => { setQuery(h.topic); setDifficulty(h.difficulty); setMode(h.mode || 'topic'); }}>
                            <div className="w-12 h-12 rounded-full flex flex-col items-center justify-center flex-shrink-0 font-display font-bold text-sm"
                                 style={{ background: hColor+'15', border: '2px solid '+hColor+'40', color: hColor }}>
                              {hPct}%
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-display font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{h.topic}</p>
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                <span className="text-xs font-mono px-2 py-0.5 rounded-full"
                                      style={{ background: diff.bg, color: diff.color, border: '1px solid '+diff.border }}>
                                  {diff.label}
                                </span>
                                <span className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>{h.score}/{h.total} correct</span>
                                <span className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>{new Date(h.date).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                                 style={{ background: 'var(--accent-dim)', color: 'var(--accent-primary)' }}>
                              <RotateCcw size={13} />
                            </div>
                          </div>
                        );
                      })}
                      <button onClick={() => { localStorage.removeItem('insightmint_quiz_history'); setHistory([]); setShowHistory(false); }}
                        className="text-xs font-body mt-1 px-3 py-1.5 rounded-lg transition-all"
                        style={{ color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.20)' }}>
                        Clear History
                      </button>
                    </div>
                  )}
                </div>
              )}

            </>
          )}

          {/* Document upload */}
          {mode === 'document' && (
            <div className="max-w-xl mx-auto">
              <div className="rounded-2xl p-6 cursor-pointer transition-all mb-4"
                   style={{ border: `2px dashed ${dragOver ? '#6366f1' : file ? 'rgba(74,222,128,0.5)' : 'var(--border-medium)'}`, background: dragOver ? 'rgba(99,102,241,0.08)' : 'var(--bg-card)' }}
                   onClick={() => !file && fileRef.current?.click()}
                   onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                   onDragLeave={() => setDragOver(false)}
                   onDrop={handleDrop}>
                {file ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-xl"
                         style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)' }}>
                          {file.type.startsWith('image/') ? <Image size={16} style={{ color: '#818cf8' }} /> : <File size={16} style={{ color: '#818cf8' }} />}
                        </div>
                        <div>
                          <p className="text-sm font-body font-medium" style={{ color: 'var(--text-primary)' }}>{file.name}</p>
                          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{(file.size/1024).toFixed(1)} KB · {fileLabel}</p>
                        </div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); setFile(null); extractedTextRef.current=''; setExtractedChars(0); }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg" style={{ background: 'rgba(248,113,113,0.10)', color: '#f87171' }}>
                        <X size={13} />
                      </button>
                    </div>
                    {extracting ? (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(99,102,241,0.10)', color: '#818cf8' }}>
                        <Loader2 size={13} className="animate-spin" /> Extracting text from {fileLabel}...
                      </div>
                    ) : extractedChars > 0 ? (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(74,222,128,0.08)', color: '#4ade80' }}>
                        <CheckCircle2 size={13} /> ✓ {extractedChars.toLocaleString()} characters extracted
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Upload size={32} className="mx-auto mb-3" style={{ color: '#818cf8' }} />
                    <p className="font-display font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Upload your document</p>
                    <p className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>PDF · DOC · TXT · MD · Images · Max 15MB</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept={FILE_ACCEPT} className="hidden"
                onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value=''; }} />

              <button onClick={startQuiz}
                disabled={loading || !file || extractedChars === 0 || extracting}
                className="btn-primary w-full justify-center py-3.5 disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                {loading ? <><Loader2 size={18} className="animate-spin" /> Generating quiz...</>
                : extracting ? <><Loader2 size={18} className="animate-spin" /> Reading document...</>
                : <><Brain size={18} /> Generate Quiz from Document</>}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Settings */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="glass-card p-5 mb-6">
          <h3 className="font-display font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Quiz Settings</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Difficulty */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Difficulty</label>
              <div className="flex gap-2">
                {DIFFICULTIES.map(d => (
                  <button key={d.id} onClick={() => setDifficulty(d.id)}
                    className="flex-1 py-2 rounded-xl text-sm font-body transition-all"
                    style={{
                      background: difficulty === d.id ? d.bg : 'var(--bg-card)',
                      border: `1.5px solid ${difficulty === d.id ? d.border : 'var(--border-default)'}`,
                      color: difficulty === d.id ? d.color : 'var(--text-muted)',
                      fontWeight: difficulty === d.id ? '600' : '400'
                    }}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Question count */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Number of Questions</label>
              <div className="flex gap-2">
                {QUESTION_COUNTS.map(c => (
                  <button key={c} onClick={() => setCount(c)}
                    className="flex-1 py-2 rounded-xl text-sm font-body transition-all"
                    style={{
                      background: count === c ? 'rgba(99,102,241,0.15)' : 'var(--bg-card)',
                      border: `1.5px solid ${count === c ? 'rgba(99,102,241,0.35)' : 'var(--border-default)'}`,
                      color: count === c ? '#818cf8' : 'var(--text-muted)',
                      fontWeight: count === c ? '600' : '400'
                    }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl text-sm mb-4"
               style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }}>
            <X size={14} />{error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="glass-card p-10 text-center">
            <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse"
                 style={{ background: 'rgba(99,102,241,0.15)', border: '2px solid rgba(99,102,241,0.30)' }}>
              <Brain size={24} style={{ color: '#818cf8' }} />
            </div>
            <h3 className="font-display font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>Generating your quiz...</h3>
            <p className="font-body text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
              Groq AI is crafting {count} {difficulty} questions{mode === 'document' ? ' from your document' : ` about "${query}"`}
            </p>
            <div className="flex justify-center gap-1.5">
              {[0,1,2,3,4].map(i => (
                <div key={i} className="w-2 h-2 rounded-full animate-bounce"
                     style={{ background: '#818cf8', animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}

        {/* Feature cards */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: '🎯', title: 'Topic Quiz', desc: 'Enter any subject and get AI-generated questions instantly' },
              { icon: '📄', title: 'Document Quiz', desc: 'Upload PDF/DOC/TXT and quiz yourself on its contents' },
              { icon: '💡', title: 'With Explanations', desc: 'Every answer includes a detailed explanation to help you learn' },
            ].map(f => (
              <div key={f.title} className="glass-card p-4 text-center">
                <div className="text-2xl mb-2">{f.icon}</div>
                <h3 className="font-display font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{f.title}</h3>
                <p className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}