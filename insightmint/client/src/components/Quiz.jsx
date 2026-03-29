import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Loader2, RotateCcw, Trophy } from 'lucide-react';
import { getQuiz } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';

export default function Quiz({ topic }) {
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    setLoading(true);
    getQuiz(topic).then(({ data }) => setQuestions(data.quiz)).catch(console.error).finally(() => setLoading(false));
  }, [topic]);

  const selectAnswer = (idx) => {
    if (answers[current] !== undefined) return;
    setAnswers(a => ({ ...a, [current]: idx }));
    setShowExplanation(true);
  };

  const next = () => {
    if (current < questions.length - 1) { setCurrent(c => c + 1); setShowExplanation(false); }
    else setDone(true);
  };

  const reset = () => { setCurrent(0); setAnswers({}); setShowExplanation(false); setDone(false); };

  if (loading) return (
    <div className="flex flex-col items-center py-10 gap-3">
      <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
      <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>{t.generatingQuiz}</p>
    </div>
  );

  if (!questions.length) return <p className="text-center py-8 font-body" style={{ color: 'var(--text-muted)' }}>No quiz available</p>;

  const score = Object.entries(answers).filter(([qi, ai]) => questions[parseInt(qi)].correct === ai).length;

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="animate-fade-in text-center py-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-mint-400 to-mint-600 mb-6 shadow-lg">
          <Trophy size={32} className="text-ink-950" />
        </div>
        <h2 className="font-display text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{t.quizComplete}</h2>
        <p className="font-body mb-6" style={{ color: 'var(--text-muted)' }}>
          {t.youScored} <span className="font-semibold" style={{ color: pct >= 70 ? 'var(--accent-primary)' : '#f59e0b' }}>{score}/{questions.length}</span> ({pct}%)
        </p>
        <div className="h-3 rounded-full max-w-sm mx-auto mb-8 overflow-hidden" style={{ background: 'var(--border-default)' }}>
          <div className="h-full rounded-full transition-all duration-1000"
               style={{ width: `${pct}%`, background: pct >= 70 ? 'linear-gradient(90deg,#14b8a6,#2dd4bf)' : 'linear-gradient(90deg,#f59e0b,#fbbf24)' }} />
        </div>
        <button onClick={reset} className="btn-primary"><RotateCcw size={14} /> {t.retakeQuiz}</button>
      </div>
    );
  }

  const q = questions[current];
  const userAnswer = answers[current];
  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{t.quizTitle}</h2>
        <span className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>{current + 1}/{questions.length}</span>
      </div>
      <div className="h-1 rounded-full mb-6 overflow-hidden" style={{ background: 'var(--border-default)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%`, background: 'linear-gradient(90deg,#14b8a6,#2dd4bf)' }} />
      </div>
      <div className="glass-card p-6 mb-4">
        <p className="font-display font-semibold leading-relaxed" style={{ color: 'var(--text-primary)' }}>{q.question}</p>
      </div>
      <div className="space-y-3 mb-4">
        {q.options.map((opt, i) => {
          let bg = 'var(--quiz-item-bg)', border = 'var(--border-default)', color = 'var(--text-secondary)', cursor = 'pointer';
          if (userAnswer !== undefined) {
            cursor = 'default';
            if (i === q.correct) { bg = 'rgba(34,197,94,0.10)'; border = 'rgba(34,197,94,0.45)'; color = '#4ade80'; }
            else if (i === userAnswer) { bg = 'rgba(239,68,68,0.10)'; border = 'rgba(239,68,68,0.45)'; color = '#f87171'; }
            else color = 'var(--text-muted)';
          }
          return (
            <button key={i} onClick={() => selectAnswer(i)}
              className="w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all"
              style={{ background: bg, border: `1px solid ${border}`, color, cursor }}>
              <span className="w-7 h-7 rounded-full border flex items-center justify-center text-xs font-mono flex-shrink-0" style={{ borderColor: color }}>{String.fromCharCode(65 + i)}</span>
              <span className="font-body text-sm">{opt}</span>
              {userAnswer !== undefined && i === q.correct && <CheckCircle2 size={16} className="ml-auto flex-shrink-0" style={{ color: '#4ade80' }} />}
              {userAnswer !== undefined && i === userAnswer && i !== q.correct && <XCircle size={16} className="ml-auto flex-shrink-0" style={{ color: '#f87171' }} />}
            </button>
          );
        })}
      </div>
      {showExplanation && (
        <div className="rounded-xl p-4 mb-4 animate-fade-in" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
          <p className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>
            <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{t.explanation}</span> {q.explanation}
          </p>
        </div>
      )}
      {userAnswer !== undefined && (
        <button onClick={next} className="btn-primary w-full justify-center">
          {current < questions.length - 1 ? t.nextQuestion : t.seeResults}
        </button>
      )}
    </div>
  );
}