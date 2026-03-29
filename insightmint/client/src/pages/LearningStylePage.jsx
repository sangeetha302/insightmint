import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  Brain, Eye, Mic, BookOpen, Zap, Sparkles, Loader2,
  ChevronRight, Star, Target, Lightbulb, TrendingUp,
  RefreshCw, ArrowRight, Check
} from 'lucide-react';

const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('insightmint_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

const STYLE_ICONS = { eye: Eye, mic: Mic, book: BookOpen, zap: Zap };

// ── Collect behavior from localStorage ──────────────────
const collectBehavior = () => {
  try {
    const notes    = JSON.parse(localStorage.getItem('insightmint_notes_count') || '0');
    const sessions = JSON.parse(localStorage.getItem('insightmint_sessions') || '{}');
    const activity = JSON.parse(localStorage.getItem('insightmint_activity') || '{}');
    const quizHistory = JSON.parse(localStorage.getItem('insightmint_quiz_history') || '[]');
    const roadmapProgress = JSON.parse(localStorage.getItem('insightmint_roadmap_progress') || '{}');
    const summarizerHistory = JSON.parse(localStorage.getItem('insightmint_summarizer_history') || '[]');
    const voiceCount = parseInt(localStorage.getItem('insightmint_voice_uses') || '0');
    const tabUsage = JSON.parse(localStorage.getItem('insightmint_tab_usage') || '{}');

    // Count roadmap checkbox completions
    const roadmapChecks = Object.values(roadmapProgress).reduce((sum, r) => sum + (r.completed?.length || 0), 0);

    // Count total sessions
    const sessionCount = Object.values(sessions).reduce((sum, s) => sum + (s?.length || 0), 0);

    // Avg quiz score
    const scores = quizHistory.map(q => q.score || 0).filter(s => s > 0);
    const avgQuizScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    return {
      videoTabTime:    tabUsage.notes || 0,
      notesTabTime:    tabUsage.notes || 0,
      chatTabTime:     tabUsage.chat || 0,
      quizTabTime:     tabUsage.quiz || 0,
      voiceUsageCount: voiceCount,
      quizAttempts:    quizHistory.length,
      noteCount:       typeof notes === 'number' ? notes : Object.keys(activity).length,
      summarizerUses:  summarizerHistory.length,
      roadmapChecks,
      flashcardUses:   tabUsage.flashcards || 0,
      sessionCount,
      avgQuizScore,
    };
  } catch { return {}; }
};

// ── Interactive questionnaire fallback ──────────────────
const QUESTIONS = [
  {
    id: 'learn_new',
    question: 'When learning something new, you prefer to:',
    options: [
      { label: 'Watch videos or look at diagrams',       style: 'visual',      icon: '👁️' },
      { label: 'Listen to someone explain it',           style: 'auditory',    icon: '👂' },
      { label: 'Read about it in detail',                style: 'reading',     icon: '📖' },
      { label: 'Try it out hands-on immediately',        style: 'kinesthetic', icon: '🤲' },
    ]
  },
  {
    id: 'remember',
    question: 'You remember things best when you:',
    options: [
      { label: 'See a chart, map or visual summary',     style: 'visual',      icon: '📊' },
      { label: 'Discuss them or hear them repeated',     style: 'auditory',    icon: '💬' },
      { label: 'Write notes or read multiple times',     style: 'reading',     icon: '✍️' },
      { label: 'Practice them repeatedly',               style: 'kinesthetic', icon: '🏃' },
    ]
  },
  {
    id: 'study_session',
    question: 'Your ideal study session looks like:',
    options: [
      { label: 'Watching tutorial videos with visuals',  style: 'visual',      icon: '🎬' },
      { label: 'Talking through concepts out loud',      style: 'auditory',    icon: '🎙️' },
      { label: 'Reading and summarizing content',        style: 'reading',     icon: '📚' },
      { label: 'Doing exercises and practice problems',  style: 'kinesthetic', icon: '⚡' },
    ]
  },
  {
    id: 'stuck',
    question: 'When you get stuck on a concept, you:',
    options: [
      { label: 'Look for a diagram or visualization',    style: 'visual',      icon: '🗺️' },
      { label: 'Ask someone to explain it verbally',     style: 'auditory',    icon: '🗣️' },
      { label: 'Re-read the explanation carefully',      style: 'reading',     icon: '🔍' },
      { label: 'Try different approaches until it works',style: 'kinesthetic', icon: '🛠️' },
    ]
  },
  {
    id: 'notes',
    question: 'When taking notes, you usually:',
    options: [
      { label: 'Draw diagrams and use colors',           style: 'visual',      icon: '🎨' },
      { label: 'Record audio or repeat out loud',        style: 'auditory',    icon: '🎤' },
      { label: 'Write detailed written notes',           style: 'reading',     icon: '📝' },
      { label: 'Jot down steps to do/try later',        style: 'kinesthetic', icon: '✅' },
    ]
  },
];

export default function LearningStylePage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode]             = useState('intro'); // intro | quiz | analyzing | result
  const [answers, setAnswers]       = useState({});
  const [currentQ, setCurrentQ]     = useState(0);
  const [result, setResult]         = useState(null);
  const [useActivity, setUseActivity] = useState(false);

  const hasActivity = () => {
    const b = collectBehavior();
    return (b.quizAttempts + b.noteCount + b.summarizerUses + b.roadmapChecks + b.sessionCount) > 3;
  };

  const analyzeFromActivity = async () => {
    setMode('analyzing');
    const behavior = collectBehavior();
    try {
      const { data } = await api.post('/learning-style/analyze', { behavior });
      setResult(data);
      setMode('result');
    } catch {
      setMode('quiz'); // fallback to questionnaire
    }
  };

  const analyzeFromQuiz = async () => {
    setMode('analyzing');
    // Convert questionnaire answers to behavior scores
    const styleCounts = { visual: 0, auditory: 0, reading: 0, kinesthetic: 0 };
    Object.values(answers).forEach(style => { styleCounts[style] = (styleCounts[style] || 0) + 1; });

    const behavior = {
      videoTabTime:    styleCounts.visual * 10,
      notesTabTime:    styleCounts.reading * 10,
      chatTabTime:     styleCounts.auditory * 8,
      quizTabTime:     styleCounts.kinesthetic * 10,
      voiceUsageCount: styleCounts.auditory * 3,
      quizAttempts:    styleCounts.kinesthetic * 4,
      noteCount:       styleCounts.reading * 5,
      summarizerUses:  styleCounts.reading * 3,
      roadmapChecks:   styleCounts.kinesthetic * 3,
      flashcardUses:   styleCounts.visual * 3,
      sessionCount:    styleCounts.kinesthetic * 2,
      avgQuizScore:    60,
      fromQuestionnaire: true,
    };

    try {
      const { data } = await api.post('/learning-style/analyze', { behavior });
      setResult(data);
      setMode('result');
    } catch {
      setMode('intro');
    }
  };

  const selectAnswer = (questionId, style) => {
    const newAnswers = { ...answers, [questionId]: style };
    setAnswers(newAnswers);
    if (currentQ < QUESTIONS.length - 1) {
      setTimeout(() => setCurrentQ(c => c + 1), 300);
    } else {
      // All answered
      setTimeout(() => analyzeFromQuiz(), 400);
    }
  };

  const StyleIcon = result ? (STYLE_ICONS[result.style?.icon] || Brain) : Brain;
  const SecIcon   = result ? (STYLE_ICONS[result.secondaryStyle?.icon] || Brain) : Brain;

  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="max-w-3xl mx-auto">

        {/* ── INTRO ── */}
        {mode === 'intro' && (
          <div className="animate-fade-in">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-mono mb-4"
                   style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8' }}>
                <Brain size={14} /> ML Learning Style Detector
              </div>
              <h1 className="font-display text-4xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                How do you <span style={{ background: 'linear-gradient(135deg,#818cf8,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>learn best?</span>
              </h1>
              <p className="font-body text-lg max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
                Our ML model analyzes your behavior to detect your VARK learning style and give personalized recommendations
              </p>
            </div>

            {/* VARK preview cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {[
                { style: 'Visual',       emoji: '👁️', color: '#818cf8', desc: 'Learns through images, diagrams, videos' },
                { style: 'Auditory',     emoji: '👂', color: '#34d399', desc: 'Learns through listening and discussion' },
                { style: 'Reading',      emoji: '📖', color: '#fbbf24', desc: 'Learns through reading and writing' },
                { style: 'Kinesthetic',  emoji: '🤲', color: '#f97316', desc: 'Learns through doing and practice' },
              ].map(s => (
                <div key={s.style} className="glass-card p-4 text-center">
                  <div className="text-2xl mb-2">{s.emoji}</div>
                  <p className="font-display font-bold text-sm mb-1" style={{ color: s.color }}>{s.style}</p>
                  <p className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>{s.desc}</p>
                </div>
              ))}
            </div>

            {/* ML model info */}
            <div className="glass-card p-5 mb-6" style={{ border: '1px solid rgba(99,102,241,0.20)' }}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                     style={{ background: 'rgba(99,102,241,0.15)' }}>
                  <Brain size={16} style={{ color: '#818cf8' }} />
                </div>
                <div>
                  <p className="font-display font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                    How the ML model works
                  </p>
                  <p className="text-sm font-body" style={{ color: 'var(--text-secondary)' }}>
                    Uses a <strong>Decision Tree Classifier</strong> trained on VARK learning style research. 
                    It analyzes 12 behavioral features — tab usage, quiz attempts, note count, voice assistant usage, 
                    roadmap progress, and more — to classify your dominant learning style.
                  </p>
                </div>
              </div>
            </div>

            {/* Two options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => { setMode('quiz'); setCurrentQ(0); setAnswers({}); }}
                className="glass-card p-6 text-left hover:translate-y-[-2px] transition-all"
                style={{ border: '1.5px solid rgba(99,102,241,0.25)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                     style={{ background: 'rgba(99,102,241,0.15)' }}>
                  <Sparkles size={18} style={{ color: '#818cf8' }} />
                </div>
                <h3 className="font-display font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Take the Quiz</h3>
                <p className="text-sm font-body" style={{ color: 'var(--text-secondary)' }}>
                  Answer 5 quick questions and the ML model will classify your style instantly
                </p>
                <div className="flex items-center gap-1 mt-3 text-xs font-mono" style={{ color: '#818cf8' }}>
                  ~2 minutes <ArrowRight size={12} />
                </div>
              </button>

              <button
                onClick={analyzeFromActivity}
                disabled={!isAuthenticated}
                className="glass-card p-6 text-left hover:translate-y-[-2px] transition-all disabled:opacity-50"
                style={{ border: '1.5px solid rgba(52,211,153,0.25)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                     style={{ background: 'rgba(52,211,153,0.15)' }}>
                  <TrendingUp size={18} style={{ color: '#34d399' }} />
                </div>
                <h3 className="font-display font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                  Analyze My Activity
                </h3>
                <p className="text-sm font-body" style={{ color: 'var(--text-secondary)' }}>
                  ML model analyzes your actual usage patterns — notes, quizzes, voice usage, sessions
                </p>
                <div className="flex items-center gap-1 mt-3 text-xs font-mono" style={{ color: '#34d399' }}>
                  {isAuthenticated ? 'Instant result' : 'Sign in required'} <ArrowRight size={12} />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── QUIZ ── */}
        {mode === 'quiz' && (
          <div className="animate-fade-in">
            {/* Progress */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>
                  Question {currentQ + 1} of {QUESTIONS.length}
                </span>
                <button onClick={() => setMode('intro')} className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>
                  ← Back
                </button>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-default)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                     style={{ width: `${((currentQ + 1) / QUESTIONS.length) * 100}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6,#c084fc)' }} />
              </div>
            </div>

            {/* Question */}
            <div className="glass-card p-8 mb-6">
              <h2 className="font-display font-bold text-xl mb-6" style={{ color: 'var(--text-primary)' }}>
                {QUESTIONS[currentQ].question}
              </h2>
              <div className="space-y-3">
                {QUESTIONS[currentQ].options.map(opt => {
                  const selected = answers[QUESTIONS[currentQ].id] === opt.style;
                  return (
                    <button key={opt.style}
                      onClick={() => selectAnswer(QUESTIONS[currentQ].id, opt.style)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all duration-200 group"
                      style={{
                        background: selected ? 'rgba(99,102,241,0.12)' : 'var(--bg-card)',
                        border: `1.5px solid ${selected ? 'rgba(99,102,241,0.45)' : 'var(--border-default)'}`,
                        transform: selected ? 'scale(1.01)' : 'scale(1)',
                      }}
                      onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)'; }}
                      onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = 'var(--border-default)'; }}>
                      <span className="text-2xl">{opt.icon}</span>
                      <span className="font-body text-sm flex-1" style={{ color: 'var(--text-primary)' }}>{opt.label}</span>
                      {selected && <Check size={16} style={{ color: '#818cf8' }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── ANALYZING ── */}
        {mode === 'analyzing' && (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                 style={{ background: 'rgba(99,102,241,0.15)', border: '2px solid rgba(99,102,241,0.30)' }}>
              <Brain size={36} className="animate-pulse" style={{ color: '#818cf8' }} />
            </div>
            <h2 className="font-display font-bold text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>
              Analyzing your learning style...
            </h2>
            <p className="font-body mb-6" style={{ color: 'var(--text-secondary)' }}>
              Decision Tree Classifier processing 12 behavioral features
            </p>
            <div className="flex justify-center gap-1.5">
              {['Visual','Auditory','Reading','Kinesthetic'].map((s, i) => (
                <div key={s} className="flex flex-col items-center gap-1">
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: ['#818cf8','#34d399','#fbbf24','#f97316'][i], animationDelay: `${i*0.15}s` }} />
                  <span className="text-xs font-mono" style={{ color: 'var(--text-muted)', fontSize: '9px' }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── RESULT ── */}
        {mode === 'result' && result && (
          <div className="animate-fade-in space-y-5">
            {/* Main result card */}
            <div className="glass-card p-8 text-center"
                 style={{ border: `2px solid ${result.style?.border || 'var(--border-default)'}`, background: result.style?.bg }}>
              <div className="text-5xl mb-4">{result.style?.emoji}</div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono mb-3"
                   style={{ background: result.style?.bg, color: result.style?.color, border: `1px solid ${result.style?.border}` }}>
                {result.confidenceLabel} match · {result.confidence}% dominant
              </div>
              <h2 className="font-display font-bold text-3xl mb-2" style={{ color: result.style?.color }}>
                {result.style?.label}
              </h2>
              <p className="font-body text-base max-w-md mx-auto" style={{ color: 'var(--text-primary)' }}>
                {result.style?.description}
              </p>
            </div>

            {/* Style breakdown bars */}
            <div className="glass-card p-5">
              <h3 className="font-display font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Brain size={15} style={{ color: '#818cf8' }} /> ML Classification Scores
              </h3>
              <div className="space-y-3">
                {result.sorted?.map(([style, score]) => {
                  const colors = { visual: '#818cf8', auditory: '#34d399', reading: '#fbbf24', kinesthetic: '#f97316' };
                  const emojis = { visual: '👁️', auditory: '👂', reading: '📖', kinesthetic: '🤲' };
                  const c = colors[style] || '#818cf8';
                  return (
                    <div key={style}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-body capitalize flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                          {emojis[style]} {style}
                          {style === result.dominant && <span className="text-xs px-2 py-0.5 rounded-full font-mono" style={{ background: `${c}20`, color: c }}>dominant</span>}
                        </span>
                        <span className="text-sm font-mono font-bold" style={{ color: c }}>{score}%</span>
                      </div>
                      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--border-default)' }}>
                        <div className="h-full rounded-full transition-all duration-1000"
                             style={{ width: `${score}%`, background: c }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs font-mono mt-3 pt-3" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border-default)' }}>
                Model: Decision Tree Classifier · Features: 12 behavioral signals · Algorithm: Weighted VARK scoring
              </p>
            </div>

            {/* Personalized AI tips */}
            {result.personalizedAdvice && (
              <div className="glass-card p-5" style={{ border: `1px solid ${result.style?.border}` }}>
                <h3 className="font-display font-semibold mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Sparkles size={15} style={{ color: '#818cf8' }} /> Personalized Study Tips
                </h3>
                <p className="text-xs font-mono mb-4" style={{ color: 'var(--text-muted)' }}>
                  Generated by Groq AI based on your specific activity
                </p>
                {result.personalizedAdvice.encouragement && (
                  <div className="p-3 rounded-xl mb-4" style={{ background: result.style?.bg, border: `1px solid ${result.style?.border}` }}>
                    <p className="text-sm font-body" style={{ color: result.style?.color }}>
                      ✨ {result.personalizedAdvice.encouragement}
                    </p>
                  </div>
                )}
                <div className="space-y-3">
                  {result.personalizedAdvice.tips?.map((tip, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ background: result.style?.color, color: '#fff' }}>{i+1}</span>
                      <p className="text-sm font-body" style={{ color: 'var(--text-primary)' }}>{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Default tips */}
            <div className="glass-card p-5">
              <h3 className="font-display font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Lightbulb size={15} style={{ color: '#fbbf24' }} /> Study Tips for {result.style?.label}s
              </h3>
              <div className="space-y-2">
                {result.style?.tips?.map((tip, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <ChevronRight size={14} className="flex-shrink-0 mt-0.5" style={{ color: result.style?.color }} />
                    <p className="text-sm font-body" style={{ color: 'var(--text-primary)' }}>{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Best features to use */}
            <div className="glass-card p-5">
              <h3 className="font-display font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Target size={15} style={{ color: '#34d399' }} /> Best InsightMint Features For You
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {result.style?.bestFeatures?.map((feature, i) => (
                  <div key={i} className="p-3 rounded-xl text-center"
                       style={{ background: result.style?.bg, border: `1px solid ${result.style?.border}` }}>
                    <p className="text-sm font-body font-semibold" style={{ color: result.style?.color }}>{feature}</p>
                  </div>
                ))}
              </div>
              {result.secondaryStyle && (
                <p className="text-xs font-body mt-3" style={{ color: 'var(--text-muted)' }}>
                  Secondary style: {result.secondaryStyle.emoji} <span style={{ color: result.secondaryStyle.color }}>{result.secondaryStyle.label}</span> — also try {result.secondaryStyle.bestFeatures?.[0]}
                </p>
              )}
            </div>

            {/* Strengths */}
            <div className="glass-card p-5">
              <h3 className="font-display font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Star size={15} style={{ color: '#fbbf24' }} /> Your Learning Strengths
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.style?.strengths?.map((s, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-full text-sm font-body"
                        style={{ background: result.style?.bg, border: `1px solid ${result.style?.border}`, color: result.style?.color }}>
                    ✓ {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 flex-wrap justify-center pt-2">
              <button onClick={() => { setMode('intro'); setResult(null); setAnswers({}); }}
                className="btn-ghost px-6">
                <RefreshCw size={14} /> Retake
              </button>
              <button onClick={() => navigate('/roadmap')}
                className="btn-primary px-6" style={{ background: `linear-gradient(135deg,${result.style?.color},#8b5cf6)` }}>
                Start Learning <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}