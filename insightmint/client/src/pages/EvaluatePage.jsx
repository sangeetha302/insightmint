import { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import {
  Brain, Loader2, CheckCircle2, BookOpen, Trophy,
  ChevronDown, ChevronUp, RotateCcw, AlertCircle, FileText,
  Upload, Zap, ArrowRight, ArrowLeft, ClipboardList,
  Hash, RefreshCw, History, Timer, Clock, AlertTriangle
} from 'lucide-react';
import { buildHistoryEntry, saveLocalHistory, syncEntryToDB } from '../utils/examHistory';

const api = axios.create({ baseURL: 'https://insightmint-backend-3zax.onrender.com/api' });
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('insightmint_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// ── Timer config per difficulty ────────────────────────────
const TIMER_CONFIG = {
  beginner:     { perQuestion: 180 }, // 3 min
  intermediate: { perQuestion: 120 }, // 2 min
  advanced:     { perQuestion: 90  }, // 1.5 min
};

const DIFFICULTIES = [
  { id: 'beginner',     label: 'Beginner',     color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.30)' },
  { id: 'intermediate', label: 'Intermediate',  color: '#818cf8', bg: 'rgba(129,140,248,0.12)', border: 'rgba(129,140,248,0.30)' },
  { id: 'advanced',     label: 'Advanced',      color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.30)' },
];

const GRADE_META = {
  'A+': { color: '#4ade80', bg: 'rgba(74,222,128,0.15)',  label: 'Excellent!' },
  'A':  { color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  label: 'Great job!' },
  'B+': { color: '#818cf8', bg: 'rgba(129,140,248,0.15)', label: 'Good work!' },
  'B':  { color: '#818cf8', bg: 'rgba(129,140,248,0.12)', label: 'Decent effort!' },
  'C':  { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  label: 'Needs work' },
  'D':  { color: '#f87171', bg: 'rgba(248,113,113,0.12)', label: 'Keep studying!' },
  'F':  { color: '#f87171', bg: 'rgba(248,113,113,0.15)', label: 'Review basics' },
};

function fmt(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// ── Animated timer ring ───────────────────────────────────
function TimerRing({ seconds, total, size = 56 }) {
  const r = 22, cx = 28, cy = 28;
  const circ = 2 * Math.PI * r;
  const pct  = total > 0 ? seconds / total : 0;
  const dash = pct * circ;
  const color = seconds <= 15 ? '#f87171' : seconds <= 30 ? '#fbbf24' : '#4ade80';
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border-default)" strokeWidth="4" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.9s linear', filter: seconds <= 15 ? `drop-shadow(0 0 4px ${color})` : 'none' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-mono font-bold" style={{ color, fontSize: size * 0.22 }}>{fmt(seconds)}</span>
      </div>
    </div>
  );
}

// ── Sticky dual-timer bar ─────────────────────────────────
function TimerBar({ qSeconds, qTotal, totalSeconds, totalInitial, locked }) {
  const qColor = qSeconds <= 15 ? '#f87171' : qSeconds <= 30 ? '#fbbf24' : '#4ade80';
  const tColor = totalSeconds <= 30 ? '#f87171' : totalSeconds <= 60 ? '#fbbf24' : '#818cf8';
  const qPct   = qTotal > 0 ? (qSeconds / qTotal) * 100 : 0;
  const tPct   = totalInitial > 0 ? (totalSeconds / totalInitial) * 100 : 0;

  return (
    <div className="sticky top-16 z-40 mb-4 glass-card p-3"
         style={{ border: `1px solid ${locked ? 'rgba(248,113,113,0.40)' : qSeconds <= 15 ? 'rgba(248,113,113,0.30)' : 'var(--border-default)'}`, background: locked ? 'rgba(248,113,113,0.08)' : 'var(--bg-secondary)' }}>
      {locked && (
        <div className="flex items-center gap-2 mb-2 text-xs font-mono" style={{ color: '#f87171' }}>
          <AlertTriangle size={12} /> Time's up — answer locked, moving on...
        </div>
      )}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 flex-1">
          <TimerRing seconds={qSeconds} total={qTotal} size={48} />
          <div className="flex-1">
            <p className="text-xs font-mono mb-1" style={{ color: 'var(--text-muted)' }}>This question</p>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-default)' }}>
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${qPct}%`, background: qColor }} />
            </div>
          </div>
        </div>
        <div className="w-px h-10 flex-shrink-0" style={{ background: 'var(--border-default)' }} />
        <div className="flex items-center gap-2 flex-1">
          <TimerRing seconds={totalSeconds} total={totalInitial} size={48} />
          <div className="flex-1">
            <p className="text-xs font-mono mb-1" style={{ color: 'var(--text-muted)' }}>Total exam</p>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-default)' }}>
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${tPct}%`, background: tColor }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ScoreCircle ───────────────────────────────────────────
function ScoreCircle({ score, total = 10, size = 112 }) {
  const pct = (score / total) * 100;
  const r = 40, cx = 50, cy = 50;
  const circumference = 2 * Math.PI * r;
  const dash = (pct / 100) * circumference;
  const color = pct >= 80 ? '#4ade80' : pct >= 60 ? '#818cf8' : pct >= 40 ? '#fbbf24' : '#f87171';
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border-default)" strokeWidth="8" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-black leading-none" style={{ color, fontSize: size * 0.22 }}>{score}</span>
        <span className="font-mono" style={{ color: 'var(--text-muted)', fontSize: size * 0.11 }}>/{total}</span>
      </div>
    </div>
  );
}

// ── QuestionResultCard ────────────────────────────────────
function QuestionResultCard({ qResult, index }) {
  const [open, setOpen]           = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const gradeMeta = GRADE_META[qResult.grade] || GRADE_META['B'];
  return (
    <div className="glass-card p-5 animate-fade-in" style={{ border: `1px solid ${gradeMeta.color}25` }}>
      <div className="flex items-start gap-4">
        <ScoreCircle score={qResult.totalScore} total={10} size={72} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-mono px-2 py-0.5 rounded-md font-bold"
                  style={{ background: `${gradeMeta.color}18`, color: gradeMeta.color }}>Q{index + 1}</span>
            <span className="font-display font-bold text-lg" style={{ color: gradeMeta.color }}>{qResult.grade}</span>
            <span className="font-body text-sm" style={{ color: 'var(--text-secondary)' }}>{gradeMeta.label}</span>
            {qResult.timedOut && (
              <span className="text-xs font-mono px-2 py-0.5 rounded-md"
                    style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171' }}>⏱ Timed out</span>
            )}
          </div>
          <p className="text-xs font-body line-clamp-2 mb-2" style={{ color: 'var(--text-muted)' }}>{qResult.question}</p>
          <p className="text-xs font-body leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{qResult.overallFeedback}</p>
          <button onClick={() => setOpen(o => !o)} className="mt-2 text-xs font-mono flex items-center gap-1" style={{ color: '#818cf8' }}>
            {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {open ? 'Hide details' : 'View rubric & tips'}
          </button>
        </div>
      </div>
      {open && (
        <div className="mt-4 space-y-3 animate-fade-in">
          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
            <p className="text-xs font-mono uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Score Breakdown</p>
            {qResult.rubric?.map((r, i) => {
              const rColor = r.score >= 2 ? '#4ade80' : r.score >= 1 ? '#fbbf24' : '#f87171';
              return (
                <div key={i} className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-body w-24 flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>{r.dimension}</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-default)' }}>
                    <div className="h-full rounded-full" style={{ width: `${(r.score / 2) * 100}%`, background: rColor, transition: 'width 0.7s ease' }} />
                  </div>
                  <span className="text-xs font-mono w-6 text-right flex-shrink-0" style={{ color: rColor }}>{r.score}/2</span>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl" style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.18)' }}>
              <p className="text-xs font-mono uppercase mb-2" style={{ color: '#4ade80' }}>✓ Strengths</p>
              {qResult.strengths?.map((s, i) => <p key={i} className="text-xs font-body mb-1" style={{ color: 'var(--text-secondary)' }}>• {s}</p>)}
            </div>
            <div className="p-3 rounded-xl" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.18)' }}>
              <p className="text-xs font-mono uppercase mb-2" style={{ color: '#fbbf24' }}>↑ Improve</p>
              {qResult.improvements?.map((imp, i) => <p key={i} className="text-xs font-body mb-1" style={{ color: 'var(--text-secondary)' }}>{i+1}. {imp}</p>)}
            </div>
          </div>
          <div>
            <button onClick={() => setModelOpen(m => !m)} className="flex items-center gap-2 text-xs font-mono" style={{ color: '#818cf8' }}>
              <BookOpen size={11} />{modelOpen ? 'Hide model answer' : 'Show model answer'}
              {modelOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
            {modelOpen && (
              <div className="mt-2 p-3 rounded-xl animate-fade-in" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
                <p className="text-xs font-body leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{qResult.modelAnswer}</p>
              </div>
            )}
          </div>
          <p className="text-xs font-body italic" style={{ color: gradeMeta.color, opacity: 0.85 }}>"{qResult.encouragement}"</p>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════
export default function EvaluatePage({ onViewHistory, initialExam }) {
  const { language } = useLanguage();

  const [stage, setStage]             = useState(initialExam ? 'answering' : 'setup');
  const [inputMode, setInputMode]     = useState('topic');
  const [evalMode, setEvalMode]       = useState(initialExam?.evalMode || '');
  const [topic, setTopic]             = useState(initialExam?.topic || '');
  const [difficulty, setDifficulty]   = useState(initialExam?.difficulty || 'intermediate');
  const [numQuestions, setNumQuestions] = useState(5);
  const [docText, setDocText]         = useState('');
  const [docName, setDocName]         = useState('');
  const [generating, setGenerating]   = useState(false);
  const [setupError, setSetupError]   = useState('');
  const fileRef = useRef(null);

  const [questions, setQuestions]     = useState(initialExam?.questions || []);
  const [answers, setAnswers]         = useState({});
  const [lockedQs, setLockedQs]       = useState({});
  const [currentQ, setCurrentQ]       = useState(0);

  const [results, setResults]         = useState([]);
  const [evaluating, setEvaluating]   = useState(false);
  const [evalProgress, setEvalProgress] = useState(0);
  const [evalError, setEvalError]     = useState('');
  const [savedEntry, setSavedEntry]   = useState(null);

  // ── Timer state ───────────────────────────────────────────
  const [qTimeLeft, setQTimeLeft]         = useState(0);
  const [totalTimeLeft, setTotalTimeLeft] = useState(0);
  const [qTimeTotal, setQTimeTotal]       = useState(0);
  const [totalTimeInitial, setTotalTimeInitial] = useState(0);
  const [timerActive, setTimerActive]     = useState(false);
  const [questionLocked, setQuestionLocked] = useState(false);

  const qTimerRef     = useRef(null);
  const totalTimerRef = useRef(null);
  const autoEvalRef   = useRef(null);

  const getTimerValues = useCallback((diff, nq) => {
    const perQ  = TIMER_CONFIG[diff]?.perQuestion || 120;
    const total = perQ * nq;
    return { perQ, total };
  }, []);

  const startTimers = useCallback((perQ, total) => {
    setQTimeLeft(perQ);
    setQTimeTotal(perQ);
    setTotalTimeLeft(total);
    setTotalTimeInitial(total);
    setTimerActive(true);
    setQuestionLocked(false);
  }, []);

  const resetQTimer = useCallback((perQ) => {
    clearInterval(qTimerRef.current);
    setQTimeLeft(perQ);
    setQTimeTotal(perQ);
    setQuestionLocked(false);
  }, []);

  // Per-question timer — restarts whenever currentQ or timerActive changes
  useEffect(() => {
    if (!timerActive || stage !== 'answering') return;
    clearInterval(qTimerRef.current);
    qTimerRef.current = setInterval(() => {
      setQTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(qTimerRef.current);
          setQuestionLocked(true);
          setTimeout(() => { autoEvalRef.current?.(); }, 1500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(qTimerRef.current);
  }, [timerActive, currentQ, stage]);

  // Total exam timer — runs once from start to finish
  useEffect(() => {
    if (!timerActive || stage !== 'answering') return;
    clearInterval(totalTimerRef.current);
    totalTimerRef.current = setInterval(() => {
      setTotalTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(totalTimerRef.current);
          clearInterval(qTimerRef.current);
          setTimerActive(false);
          setQuestionLocked(true);
          setTimeout(() => { autoEvalRef.current?.(); }, 1500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(totalTimerRef.current);
    // only start once when timerActive flips to true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerActive]);

  useEffect(() => () => { clearInterval(qTimerRef.current); clearInterval(totalTimerRef.current); }, []);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocName(file.name);
    const text = await file.text();
    setDocText(text.slice(0, 8000));
  };

  const generateQuestions = async () => {
    if (!evalMode)                               { setSetupError('Please choose an evaluation mode.'); return; }
    if (inputMode === 'topic' && !topic.trim())  { setSetupError('Please enter a topic.'); return; }
    if (inputMode === 'document' && !docText.trim()) { setSetupError('Please upload a document.'); return; }
    setSetupError(''); setGenerating(true);
    try {
      const { data } = await api.post('/ai/generate-questions', {
        topic: inputMode === 'document' ? (topic || docName) : topic,
        document: inputMode === 'document' ? docText : null,
        numQuestions, difficulty, language,
      });
      const qs = data.questions.map((q, i) => ({ id: i, question: typeof q === 'string' ? q : q.question }));
      setQuestions(qs); setAnswers({}); setCurrentQ(0); setResults([]); setLockedQs({}); setQuestionLocked(false);
      const { perQ, total } = getTimerValues(difficulty, qs.length);
      startTimers(perQ, total);
      setStage('answering');
    } catch (err) {
      setSetupError(err.response?.data?.error || 'Failed to generate questions. Please try again.');
    } finally { setGenerating(false); }
  };

  const persistHistory = async (finalResults) => {
    const entry = buildHistoryEntry({ topic, difficulty, evalMode, questions, answers, results: finalResults });
    saveLocalHistory(entry);
    setSavedEntry(entry);
    const token = localStorage.getItem('insightmint_token');
    if (token) syncEntryToDB(entry, token).then(ok => {
      if (ok) {
        const hist = JSON.parse(localStorage.getItem('insightmint_exam_history') || '[]');
        const updated = hist.map(h => h.id === entry.id ? { ...h, synced: true } : h);
        localStorage.setItem('insightmint_exam_history', JSON.stringify(updated));
      }
    });
  };

  const evaluateAll = async () => {
    clearInterval(qTimerRef.current);
    clearInterval(totalTimerRef.current);
    setTimerActive(false);
    setEvalError(''); setEvaluating(true); setEvalProgress(0);
    const res = [];
    for (let i = 0; i < questions.length; i++) {
      const q   = questions[i];
      const ans = (answers[q.id] || '').trim();
      const timedOut = !ans;
      try {
        if (!ans) {
          res.push({ totalScore: 0, grade: 'F', question: q.question, answer: '(No answer)', timedOut,
            overallFeedback: 'No answer was submitted for this question.', rubric: [],
            strengths: [], improvements: ['Write an answer next time — even partial answers help!'], modelAnswer: '', encouragement: 'Keep practising!' });
        } else {
          const { data } = await api.post('/ai/evaluate-answer', { question: q.question, answer: ans, topic, difficulty, language });
          res.push({ ...data, question: q.question, answer: ans, timedOut: false });
        }
      } catch {
        res.push({ totalScore: 0, grade: 'F', question: q.question, answer: ans, timedOut: false,
          overallFeedback: 'Evaluation failed.', rubric: [], strengths: [], improvements: [], modelAnswer: '', encouragement: '' });
      }
      setEvalProgress(i + 1);
    }
    setResults(res);
    await persistHistory(res);
    setEvaluating(false);
    setStage('results');
  };

  const evaluateOne = useCallback(async (forcedByTimer = false) => {
    const q = questions[currentQ];
    if (!q) return;
    const ans = (answers[q.id] || '').trim();
    clearInterval(qTimerRef.current);
    if (!forcedByTimer && ans.split(/\s+/).length < 5) { setEvalError('Write at least 5 words before evaluating.'); return; }
    setEvalError(''); setEvaluating(true);
    try {
      let data;
      if (!ans) {
        data = { totalScore: 0, grade: 'F', overallFeedback: 'No answer provided — question timed out.',
          rubric: [], strengths: [], improvements: ['Next time write something — even partial answers earn points!'],
          modelAnswer: '', encouragement: "Don't worry, keep practising!" };
      } else {
        const resp = await api.post('/ai/evaluate-answer', { question: q.question, answer: ans, topic, difficulty, language });
        data = resp.data;
      }
      const newResults = [...results];
      newResults[currentQ] = { ...data, question: q.question, answer: ans || '(No answer)', timedOut: forcedByTimer && !ans };
      setResults(newResults);
      if (currentQ < questions.length - 1) {
        const nextQ = currentQ + 1;
        setLockedQs(prev => ({ ...prev, [q.id]: forcedByTimer && !ans }));
        setCurrentQ(nextQ);
        setQuestionLocked(false);
        const perQ = TIMER_CONFIG[difficulty]?.perQuestion || 120;
        resetQTimer(perQ);
      } else {
        clearInterval(totalTimerRef.current);
        setTimerActive(false);
        await persistHistory(newResults);
        setStage('results');
      }
    } catch { setEvalError('Evaluation failed. Try again.'); }
    finally { setEvaluating(false); }
  }, [questions, currentQ, answers, results, difficulty, topic, language]);

  useEffect(() => { autoEvalRef.current = () => evaluateOne(true); }, [evaluateOne]);

  const reset = () => {
    clearInterval(qTimerRef.current); clearInterval(totalTimerRef.current); setTimerActive(false);
    setStage('setup'); setQuestions([]); setAnswers({}); setResults([]);
    setCurrentQ(0); setEvalError(''); setSetupError(''); setDocText(''); setDocName('');
    setTopic(''); setEvalMode(''); setSavedEntry(null); setLockedQs({});
    setQTimeLeft(0); setTotalTimeLeft(0); setQuestionLocked(false);
  };

  const totalAnswered = Object.values(answers).filter(a => a.trim().split(/\s+/).length >= 5).length;
  const avgScore = results.length ? (results.reduce((s, r) => s + (r.totalScore || 0), 0) / results.length).toFixed(1) : 0;

  // ════════════════════════════════════════════════════════
  // STAGE: SETUP
  // ════════════════════════════════════════════════════════
  if (stage === 'setup') return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="page-top-accent" />
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono mb-4"
               style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8' }}>
            <Brain size={12} /> AI Answer Evaluator
          </div>
          <h1 className="font-display text-4xl font-bold mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Evaluate Your{' '}
            <span style={{ background: 'linear-gradient(135deg,#818cf8,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Answers</span>
          </h1>
          <p className="font-body text-base" style={{ color: 'var(--text-secondary)' }}>
            Generate questions by topic or from a document — get AI-powered evaluation
          </p>
        </div>

        {onViewHistory && (
          <button onClick={onViewHistory}
            className="w-full flex items-center justify-between p-4 rounded-xl mb-4 transition-all"
            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.22)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.14)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.08)'}>
            <div className="flex items-center gap-3">
              <History size={16} style={{ color: '#818cf8' }} />
              <div className="text-left">
                <p className="text-sm font-display font-semibold" style={{ color: 'var(--text-primary)' }}>View Exam History</p>
                <p className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>Re-read past exams, review answers & retry</p>
              </div>
            </div>
            <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
          </button>
        )}

        <div className="space-y-4 animate-fade-in">
          {/* Step 1 */}
          <div className="glass-card p-5">
            <p className="text-xs font-mono uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Step 1 · Source of Questions</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'topic',    icon: <Hash size={16} />,     label: 'By Topic',      desc: 'Type any topic and AI generates questions' },
                { id: 'document', icon: <FileText size={16} />, label: 'From Document', desc: 'Upload PDF/text and AI extracts questions' },
              ].map(m => (
                <button key={m.id} onClick={() => setInputMode(m.id)}
                  className="p-4 rounded-xl text-left transition-all"
                  style={{ background: inputMode === m.id ? 'rgba(99,102,241,0.12)' : 'var(--bg-secondary)', border: `1.5px solid ${inputMode === m.id ? 'rgba(99,102,241,0.40)' : 'var(--border-default)'}` }}>
                  <div className="flex items-center gap-2 mb-1" style={{ color: inputMode === m.id ? '#818cf8' : 'var(--text-muted)' }}>
                    {m.icon}
                    <span className="text-sm font-display font-bold" style={{ color: inputMode === m.id ? '#818cf8' : 'var(--text-primary)' }}>{m.label}</span>
                  </div>
                  <p className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2 */}
          <div className="glass-card p-5">
            <p className="text-xs font-mono uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
              Step 2 · {inputMode === 'topic' ? 'Enter Topic' : 'Upload Document'}
            </p>
            {inputMode === 'topic' ? (
              <input value={topic} onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Python, Photosynthesis, World War II, React Hooks..."
                className="input-field w-full text-sm" />
            ) : (
              <div className="space-y-3">
                <div onClick={() => fileRef.current?.click()}
                  className="flex flex-col items-center justify-center p-8 rounded-xl cursor-pointer transition-all"
                  style={{ border: `2px dashed ${docText ? 'rgba(74,222,128,0.40)' : 'var(--border-default)'}`, background: docText ? 'rgba(74,222,128,0.06)' : 'var(--bg-secondary)' }}>
                  {docText
                    ? <><CheckCircle2 size={24} style={{ color: '#4ade80', marginBottom: 6 }} /><p className="text-sm font-body font-medium" style={{ color: '#4ade80' }}>{docName}</p><p className="text-xs font-mono mt-1" style={{ color: 'var(--text-muted)' }}>{docText.length} characters loaded</p></>
                    : <><Upload size={24} style={{ color: 'var(--text-muted)', marginBottom: 6 }} /><p className="text-sm font-body" style={{ color: 'var(--text-secondary)' }}>Click to upload .txt or .md file</p></>}
                </div>
                <input ref={fileRef} type="file" accept=".txt,.md" className="hidden" onChange={handleFile} />
                {docText && <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Topic label (optional)" className="input-field w-full text-sm" />}
              </div>
            )}
          </div>

          {/* Step 3 — Settings + Timer preview */}
          <div className="glass-card p-5">
            <p className="text-xs font-mono uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Step 3 · Settings</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Number of Questions</label>
                <div className="flex gap-2">
                  {[3, 5, 7, 10].map(n => (
                    <button key={n} onClick={() => setNumQuestions(n)}
                      className="flex-1 py-2 rounded-xl text-xs font-mono font-bold transition-all"
                      style={{ background: numQuestions === n ? 'rgba(99,102,241,0.15)' : 'var(--bg-secondary)', border: `1px solid ${numQuestions === n ? 'rgba(99,102,241,0.40)' : 'var(--border-default)'}`, color: numQuestions === n ? '#818cf8' : 'var(--text-muted)' }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Difficulty</label>
                <div className="flex gap-2">
                  {DIFFICULTIES.map(d => (
                    <button key={d.id} onClick={() => setDifficulty(d.id)}
                      className="flex-1 py-2 rounded-xl text-xs font-body font-medium transition-all"
                      style={{ background: difficulty === d.id ? d.bg : 'var(--bg-secondary)', border: `1px solid ${difficulty === d.id ? d.border : 'var(--border-default)'}`, color: difficulty === d.id ? d.color : 'var(--text-muted)' }}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Timer preview card */}
            <div className="flex items-center gap-3 p-3 rounded-xl"
                 style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.20)' }}>
              <Timer size={15} style={{ color: '#818cf8', flexShrink: 0 }} />
              <div className="flex-1">
                <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                  <span style={{ color: '#818cf8' }}>{fmt(TIMER_CONFIG[difficulty]?.perQuestion || 120)}</span> per question
                  {' · '}
                  <span style={{ color: '#c084fc' }}>{fmt((TIMER_CONFIG[difficulty]?.perQuestion || 120) * numQuestions)}</span> total
                  {' · '}
                  <span style={{ color: 'var(--text-muted)' }}>locks & moves on timeout</span>
                </p>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="glass-card p-5">
            <p className="text-xs font-mono uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Step 4 · Evaluation Mode</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'one', icon: <ArrowRight size={15} />, label: 'One by One', desc: 'Answer & evaluate each question individually' },
                { id: 'all', icon: <ClipboardList size={15} />, label: 'All at Once', desc: 'Answer all questions, then evaluate together' },
              ].map(m => (
                <button key={m.id} onClick={() => setEvalMode(m.id)}
                  className="p-4 rounded-xl text-left transition-all"
                  style={{ background: evalMode === m.id ? 'rgba(129,140,248,0.12)' : 'var(--bg-secondary)', border: `1.5px solid ${evalMode === m.id ? 'rgba(129,140,248,0.40)' : 'var(--border-default)'}` }}>
                  <div className="flex items-center gap-2 mb-1" style={{ color: evalMode === m.id ? '#818cf8' : 'var(--text-muted)' }}>
                    {m.icon}
                    <span className="text-sm font-display font-bold" style={{ color: evalMode === m.id ? '#818cf8' : 'var(--text-primary)' }}>{m.label}</span>
                  </div>
                  <p className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {setupError && (
            <div className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }}>
              <AlertCircle size={15} /> {setupError}
            </div>
          )}

          <button onClick={generateQuestions} disabled={generating}
            className="btn-primary w-full justify-center py-3.5 text-base disabled:opacity-50">
            {generating ? <><Loader2 size={18} className="animate-spin" /> Generating questions...</> : <><Zap size={18} /> Generate {numQuestions} Questions</>}
          </button>
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════
  // STAGE: ANSWERING
  // ════════════════════════════════════════════════════════
  if (stage === 'answering') {
    const isOneByOne = evalMode === 'one';
    const activeQ    = isOneByOne ? questions[currentQ] : null;
    const prevResult = isOneByOne ? results[currentQ - 1] : null;

    return (
      <div className="min-h-screen pt-20 pb-16 px-4">
        <div className="page-top-accent" />
        <div className="max-w-2xl mx-auto">

          <div className="flex items-center justify-between mb-4">
            <div>
              <button onClick={reset} className="text-xs font-mono flex items-center gap-1 mb-1" style={{ color: 'var(--text-muted)' }}>
                <ArrowLeft size={12} /> Start over
              </button>
              <h2 className="font-display font-bold text-2xl" style={{ color: 'var(--text-primary)' }}>
                {isOneByOne ? `Question ${currentQ + 1} of ${questions.length}` : 'Answer All Questions'}
              </h2>
              <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {topic && `${topic} · `}{difficulty}
              </p>
            </div>
            {isOneByOne ? (
              <div className="flex gap-1">
                {questions.map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full transition-all"
                       style={{ background: i < currentQ ? '#4ade80' : i === currentQ ? '#818cf8' : 'var(--border-strong)', transform: i === currentQ ? 'scale(1.3)' : 'scale(1)' }} />
                ))}
              </div>
            ) : (
              <span className="text-xs font-mono px-3 py-1.5 rounded-full"
                    style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
                {totalAnswered}/{questions.length} answered
              </span>
            )}
          </div>

          {/* ── Dual Timer Bar ── */}
          <TimerBar
            qSeconds={qTimeLeft} qTotal={qTimeTotal}
            totalSeconds={totalTimeLeft} totalInitial={totalTimeInitial}
            locked={questionLocked}
          />

          {/* ONE BY ONE */}
          {isOneByOne && activeQ && (
            <div className="space-y-4 animate-fade-in">
              {prevResult && (
                <div className="p-4 rounded-xl" style={{ background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.20)' }}>
                  <p className="text-xs font-mono mb-1" style={{ color: '#4ade80' }}>✓ Q{currentQ} evaluated — {prevResult.grade} ({prevResult.totalScore}/10)</p>
                  <p className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>{prevResult.overallFeedback}</p>
                </div>
              )}
              <div className="glass-card p-5"
                   style={{ border: questionLocked ? '1.5px solid rgba(248,113,113,0.35)' : '1px solid var(--border-default)' }}>
                <div className="flex items-start gap-3 mb-4">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold flex-shrink-0"
                        style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>{currentQ + 1}</span>
                  <p className="font-body text-base leading-relaxed" style={{ color: 'var(--text-primary)' }}>{activeQ.question}</p>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-mono uppercase" style={{ color: 'var(--text-muted)' }}>Your Answer</label>
                  <span className="text-xs font-mono" style={{ color: ((answers[activeQ.id] || '').trim().split(/\s+/).length < 5 && answers[activeQ.id]) ? '#f87171' : '#4ade80' }}>
                    {(answers[activeQ.id] || '').trim() ? (answers[activeQ.id] || '').trim().split(/\s+/).length : 0} words
                  </span>
                </div>
                <textarea
                  value={answers[activeQ.id] || ''}
                  onChange={e => !questionLocked && setAnswers(a => ({ ...a, [activeQ.id]: e.target.value }))}
                  placeholder={questionLocked ? '⏱ Time is up — this answer is locked' : 'Write your answer here...'}
                  rows={7} className="input-field resize-none w-full text-sm" disabled={questionLocked}
                  style={{ fontFamily: 'Inter, sans-serif', lineHeight: '1.7', opacity: questionLocked ? 0.6 : 1, cursor: questionLocked ? 'not-allowed' : 'text', background: questionLocked ? 'rgba(248,113,113,0.04)' : undefined }} />
              </div>
              {evalError && (
                <div className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }}>
                  <AlertCircle size={14} /> {evalError}
                </div>
              )}
              <div className="flex gap-3">
                {currentQ > 0 && <button onClick={() => setCurrentQ(c => c - 1)} className="btn-ghost py-3 px-5"><ArrowLeft size={15} /> Back</button>}
                <button onClick={() => evaluateOne(false)} disabled={evaluating || questionLocked}
                  className="btn-primary flex-1 justify-center py-3 disabled:opacity-50">
                  {evaluating    ? <><Loader2 size={16} className="animate-spin" /> Evaluating...</>
                   : questionLocked ? <><Clock size={16} /> Moving to next...</>
                   : currentQ < questions.length - 1 ? <><Brain size={16} /> Evaluate & Next <ArrowRight size={14} /></>
                   : <><Trophy size={16} /> Evaluate & Finish</>}
                </button>
              </div>
            </div>
          )}

          {/* ALL AT ONCE */}
          {!isOneByOne && (
            <div className="space-y-4 animate-fade-in">
              {questions.map((q, idx) => {
                const wc     = (answers[q.id] || '').trim() ? (answers[q.id] || '').trim().split(/\s+/).length : 0;
                const done   = wc >= 5;
                const locked = lockedQs[q.id] || totalTimeLeft === 0;
                return (
                  <div key={q.id} className="glass-card p-5"
                       style={{ border: `1px solid ${locked ? 'rgba(248,113,113,0.25)' : done ? 'rgba(74,222,128,0.20)' : 'var(--border-default)'}` }}>
                    <div className="flex items-start gap-3 mb-3">
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold flex-shrink-0"
                            style={{ background: locked ? 'rgba(248,113,113,0.15)' : done ? 'rgba(74,222,128,0.15)' : 'rgba(99,102,241,0.12)', color: locked ? '#f87171' : done ? '#4ade80' : '#818cf8' }}>
                        {locked ? '⏱' : done ? '✓' : idx + 1}
                      </span>
                      <p className="font-body text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{q.question}</p>
                    </div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-mono uppercase" style={{ color: 'var(--text-muted)' }}>Your Answer</label>
                      <span className="text-xs font-mono" style={{ color: done ? '#4ade80' : wc > 0 ? '#fbbf24' : 'var(--text-muted)' }}>
                        {wc} words {done ? '✓' : '(min 5)'}
                      </span>
                    </div>
                    <textarea value={answers[q.id] || ''} onChange={e => !locked && setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                      placeholder={locked ? '⏱ Time is up — answer locked' : 'Write your answer...'}
                      rows={5} className="input-field resize-none w-full text-sm" disabled={locked}
                      style={{ fontFamily: 'Inter, sans-serif', lineHeight: '1.7', opacity: locked ? 0.6 : 1, cursor: locked ? 'not-allowed' : 'text' }} />
                  </div>
                );
              })}
              {evalError && (
                <div className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }}>
                  <AlertCircle size={14} /> {evalError}
                </div>
              )}
              {evaluating && (
                <div className="glass-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Evaluating answers...</span>
                    <span className="text-xs font-mono" style={{ color: '#818cf8' }}>{evalProgress}/{questions.length}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-default)' }}>
                    <div className="h-full rounded-full transition-all duration-500"
                         style={{ width: `${(evalProgress / questions.length) * 100}%`, background: 'linear-gradient(90deg,#6366f1,#a855f7)' }} />
                  </div>
                </div>
              )}
              <button onClick={evaluateAll} disabled={evaluating} className="btn-primary w-full justify-center py-3.5 text-base disabled:opacity-50">
                {evaluating ? <><Loader2 size={18} className="animate-spin" /> Evaluating {evalProgress}/{questions.length}...</>
                  : <><Brain size={18} /> Evaluate All {questions.length} Answers</>}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  // STAGE: RESULTS
  // ════════════════════════════════════════════════════════
  const overallGrade   = avgScore >= 9 ? 'A+' : avgScore >= 8 ? 'A' : avgScore >= 7 ? 'B+' : avgScore >= 6 ? 'B' : avgScore >= 5 ? 'C' : avgScore >= 4 ? 'D' : 'F';
  const overallMeta    = GRADE_META[overallGrade] || GRADE_META['B'];
  const timedOutCount  = results.filter(r => r.timedOut).length;

  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="page-top-accent" />
      <div className="max-w-2xl mx-auto">
        {savedEntry && (
          <div className="flex items-center gap-2 p-3 rounded-xl mb-4 text-xs font-mono animate-fade-in"
               style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.22)', color: '#4ade80' }}>
            <CheckCircle2 size={13} /> Exam saved to history {savedEntry.synced ? '· synced to cloud ☁️' : '· will sync when online'}
          </div>
        )}
        {timedOutCount > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-xl mb-4 text-xs font-mono"
               style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.22)', color: '#f87171' }}>
            <Timer size={13} /> {timedOutCount} question{timedOutCount > 1 ? 's' : ''} timed out — try to write faster next time!
          </div>
        )}
        <div className="glass-card p-6 mb-5 animate-fade-in" style={{ border: `1.5px solid ${overallMeta.color}35`, background: overallMeta.bg }}>
          <div className="flex items-center gap-6">
            <ScoreCircle score={parseFloat(avgScore)} total={10} size={100} />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <span className="font-display font-black text-4xl" style={{ color: overallMeta.color }}>{overallGrade}</span>
                <span className="font-display font-semibold text-xl" style={{ color: 'var(--text-primary)' }}>{overallMeta.label}</span>
              </div>
              <p className="text-sm font-body" style={{ color: 'var(--text-secondary)' }}>
                Average: <strong style={{ color: overallMeta.color }}>{avgScore}/10</strong> across {results.length} questions
              </p>
              {topic && <p className="text-xs font-mono mt-1" style={{ color: 'var(--text-muted)' }}>{topic} · {difficulty}</p>}
              <div className="flex gap-1 mt-3">
                {results.map((r, i) => {
                  const c = r.totalScore >= 8 ? '#4ade80' : r.totalScore >= 6 ? '#818cf8' : r.totalScore >= 4 ? '#fbbf24' : '#f87171';
                  return (
                    <div key={i} className="flex flex-col items-center gap-0.5" title={`Q${i+1}: ${r.totalScore}/10${r.timedOut ? ' (timed out)' : ''}`}>
                      <div className="w-5 rounded-sm" style={{ height: `${(r.totalScore / 10) * 32}px`, background: c, minHeight: 2, maxHeight: 32 }} />
                      <span style={{ color: c, fontSize: 9 }} className="font-mono">{r.totalScore}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-3 mb-5">
          {results.map((r, i) => <QuestionResultCard key={i} qResult={r} index={i} />)}
        </div>
        <div className="flex gap-3 flex-wrap">
          <button onClick={reset} className="btn-primary flex-1 justify-center py-3" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            <RotateCcw size={15} /> New Exam
          </button>
          <button onClick={() => {
            setResults([]); setAnswers({}); setCurrentQ(0); setLockedQs({});
            const { perQ, total } = getTimerValues(difficulty, questions.length);
            startTimers(perQ, total);
            setStage('answering');
          }} className="btn-ghost flex-1 justify-center py-3">
            <RefreshCw size={15} /> Retry Same Questions
          </button>
          {onViewHistory && (
            <button onClick={onViewHistory} className="btn-ghost flex-1 justify-center py-3">
              <History size={15} /> View History
            </button>
          )}
        </div>
      </div>
    </div>
  );
}