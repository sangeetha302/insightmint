import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Loader2, Check, X } from 'lucide-react';
import { getFlashcards } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';

export default function Flashcards({ topic }) {
  const [cards, setCards] = useState([]);
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [known, setKnown] = useState(new Set());
  const [unknown, setUnknown] = useState(new Set());
  const { t } = useLanguage();

  useEffect(() => {
    setLoading(true);
    getFlashcards(topic).then(({ data }) => setCards(data.flashcards)).catch(console.error).finally(() => setLoading(false));
  }, [topic]);

  const next = () => { setCurrent(i => (i + 1) % cards.length); setFlipped(false); };
  const prev = () => { setCurrent(i => (i - 1 + cards.length) % cards.length); setFlipped(false); };
  const markKnown = () => { setKnown(s => new Set([...s, current])); next(); };
  const markUnknown = () => { setUnknown(s => new Set([...s, current])); next(); };
  const reset = () => { setCurrent(0); setFlipped(false); setKnown(new Set()); setUnknown(new Set()); };

  if (loading) return (
    <div className="flex flex-col items-center py-10 gap-3">
      <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
      <p className="font-body text-sm" style={{ color: 'var(--text-muted)' }}>{t.generatingFlashcards}</p>
    </div>
  );

  if (!cards.length) return <p className="text-center py-8 font-body" style={{ color: 'var(--text-muted)' }}>No flashcards available</p>;

  const card = cards[current];
  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{t.flashcardsTitle}</h2>
        <div className="flex items-center gap-3 text-sm font-mono">
          <span style={{ color: '#4ade80' }}>{known.size} ✓</span>
          <span style={{ color: '#f87171' }}>{unknown.size} ✗</span>
          <span style={{ color: 'var(--text-muted)' }}>{cards.length} {t.total}</span>
        </div>
      </div>
      <div className="h-1 rounded-full mb-6 overflow-hidden" style={{ background: 'var(--border-default)' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((current + 1) / cards.length) * 100}%`, background: 'linear-gradient(90deg, #14b8a6, #2dd4bf)' }} />
      </div>
      <div className="cursor-pointer mb-6 select-none" onClick={() => setFlipped(!flipped)} style={{ perspective: '1000px' }}>
        <div className="relative w-full transition-transform duration-500" style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)', height: '220px' }}>
          <div className="absolute inset-0 glass-card flex flex-col items-center justify-center p-8 text-center" style={{ backfaceVisibility: 'hidden' }}>
            <div className="text-xs font-mono mb-4 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{t.question} {current + 1}/{cards.length}</div>
            <p className="font-display font-semibold text-lg leading-snug" style={{ color: 'var(--text-primary)' }}>{card.front}</p>
            <p className="text-sm font-body mt-4" style={{ color: 'var(--text-muted)' }}>{t.clickReveal}</p>
          </div>
          <div className="absolute inset-0 glass-card flex flex-col items-center justify-center p-8 text-center" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: 'var(--accent-dim)', borderColor: 'var(--accent-border)' }}>
            <div className="text-xs font-mono mb-4 uppercase tracking-wider" style={{ color: 'var(--accent-primary)' }}>{t.answer}</div>
            <p className="font-body text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>{card.back}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <button onClick={prev} className="btn-ghost py-2 px-3"><ChevronLeft size={18} /></button>
        {flipped && (
          <div className="flex gap-3 flex-1 justify-center">
            <button onClick={markUnknown} className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 font-body text-sm"
              style={{ border: '1px solid rgba(248,113,113,0.35)', background: 'rgba(248,113,113,0.10)', color: '#f87171' }}>
              <X size={14} /> {t.needReview}
            </button>
            <button onClick={markKnown} className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 font-body text-sm"
              style={{ border: '1px solid rgba(74,222,128,0.35)', background: 'rgba(74,222,128,0.10)', color: '#4ade80' }}>
              <Check size={14} /> {t.gotIt}
            </button>
          </div>
        )}
        {!flipped && <div className="flex-1" />}
        <div className="flex gap-2">
          <button onClick={reset} className="btn-ghost py-2 px-3"><RotateCcw size={16} /></button>
          <button onClick={next} className="btn-ghost py-2 px-3"><ChevronRight size={18} /></button>
        </div>
      </div>
    </div>
  );
}