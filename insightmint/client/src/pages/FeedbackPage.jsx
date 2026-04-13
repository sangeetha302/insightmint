import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  Star, Bug, Lightbulb, MessageSquare, Send, Check,
  ChevronRight, Sparkles, Heart
} from 'lucide-react';

const api = axios.create({ baseURL: 'https://insightmint-backend-3zax.onrender.com/api' });
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('insightmint_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

const TYPES = [
  { id: 'rating',     label: 'Rate the App',     icon: Star,        color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.30)',  desc: 'Share your overall experience' },
  { id: 'bug',        label: 'Report a Bug',      icon: Bug,         color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.30)', desc: 'Something not working right?' },
  { id: 'suggestion', label: 'Suggest a Feature', icon: Lightbulb,   color: '#818cf8', bg: 'rgba(129,140,248,0.12)', border: 'rgba(129,140,248,0.30)', desc: 'Got an idea to improve InsightMint?' },
  { id: 'general',    label: 'General Feedback',  icon: MessageSquare, color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.30)',  desc: 'Anything else on your mind?' },
];

const BUG_CATEGORIES   = ['UI/Design', 'Video Search', 'AI Notes', 'Quiz', 'Summarizer', 'Voice Assistant', 'Notes', 'Login/Signup', 'Dashboard', 'Other'];
const PAGES            = ['Home', 'Explore', 'Video Learning', 'Summarizer', 'Quiz', 'Roadmap', 'Notes', 'Dashboard', 'Community', 'Profile', 'Other'];
const SUGGEST_CATEGORIES = ['New Feature', 'Improve Existing', 'UI/Design', 'Performance', 'Accessibility', 'Mobile', 'Other'];

export default function FeedbackPage() {
  const { user } = useAuth();
  const [step, setStep]           = useState(1); // 1=type, 2=details, 3=success
  const [type, setType]           = useState('');
  const [rating, setRating]       = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [category, setCategory]   = useState('');
  const [message, setMessage]     = useState('');
  const [page, setPage]           = useState('Other');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState('');

  const selectedType = TYPES.find(t => t.id === type);

  const handleTypeSelect = (t) => { setType(t); setStep(2); };

  const handleSubmit = async () => {
    if (!message.trim()) { setError('Please write your feedback before submitting.'); return; }
    if (type === 'rating' && rating === 0) { setError('Please select a star rating.'); return; }
    setSubmitting(true); setError('');
    try {
      await api.post('/feedback', {
        type, rating: type === 'rating' ? rating : null,
        category, message, page,
        userName:  user?.name  || 'Anonymous',
        userEmail: user?.email || '',
        userId:    user?.id    || null,
      });
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit. Please try again.');
    } finally { setSubmitting(false); }
  };

  const reset = () => { setStep(1); setType(''); setRating(0); setCategory(''); setMessage(''); setPage('Other'); setError(''); };

  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-mono mb-4"
               style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8' }}>
            <Heart size={13} /> Share Your Thoughts
          </div>
          <h1 className="font-display text-4xl font-bold mb-3" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            We'd love your{' '}
            <span style={{ background: 'linear-gradient(135deg,#818cf8,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              feedback
            </span>
          </h1>
          <p className="font-body text-base" style={{ color: 'var(--text-secondary)' }}>
            Help us make InsightMint better for everyone
          </p>
        </div>

        {/* Progress dots */}
        {step < 3 && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2].map(s => (
              <div key={s} className="rounded-full transition-all duration-300"
                   style={{ width: step === s ? '24px' : '8px', height: '8px',
                     background: step >= s ? 'var(--accent-primary)' : 'var(--border-medium)' }} />
            ))}
          </div>
        )}

        {/* ── STEP 1: Choose type ── */}
        {step === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
            {TYPES.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => handleTypeSelect(t.id)}
                  className="glass-card p-6 text-left hover:translate-y-[-3px] transition-all duration-200 group"
                  style={{ border: `1.5px solid ${t.border}` }}>
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
                       style={{ background: t.bg }}>
                    <Icon size={20} style={{ color: t.color }} />
                  </div>
                  <h3 className="font-display font-bold text-base mb-1" style={{ color: 'var(--text-primary)' }}>
                    {t.label}
                  </h3>
                  <p className="text-sm font-body" style={{ color: 'var(--text-secondary)' }}>{t.desc}</p>
                  <div className="flex items-center gap-1 mt-4 text-xs font-mono opacity-0 group-hover:opacity-100 transition-opacity"
                       style={{ color: t.color }}>
                    Continue <ChevronRight size={12} />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ── STEP 2: Fill details ── */}
        {step === 2 && selectedType && (
          <div className="glass-card p-7 animate-fade-in"
               style={{ border: `1.5px solid ${selectedType.border}` }}>

            {/* Type header */}
            <div className="flex items-center gap-3 mb-6 pb-5"
                 style={{ borderBottom: '1px solid var(--border-default)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                   style={{ background: selectedType.bg }}>
                <selectedType.icon size={18} style={{ color: selectedType.color }} />
              </div>
              <div>
                <h2 className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>
                  {selectedType.label}
                </h2>
                <p className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>{selectedType.desc}</p>
              </div>
              <button onClick={() => setStep(1)} className="ml-auto text-xs font-body px-3 py-1.5 rounded-lg transition-all"
                style={{ color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                ← Back
              </button>
            </div>

            {/* Star rating — only for 'rating' type */}
            {type === 'rating' && (
              <div className="mb-5">
                <label className="block text-xs font-mono uppercase tracking-wider mb-3"
                       style={{ color: 'var(--text-muted)' }}>Overall Rating *</label>
                <div className="flex items-center gap-2">
                  {[1,2,3,4,5].map(s => (
                    <button key={s}
                      onClick={() => setRating(s)}
                      onMouseEnter={() => setHoverRating(s)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="transition-all duration-150"
                      style={{ transform: (hoverRating || rating) >= s ? 'scale(1.2)' : 'scale(1)' }}>
                      <Star size={32} fill={(hoverRating || rating) >= s ? '#fbbf24' : 'none'}
                            style={{ color: (hoverRating || rating) >= s ? '#fbbf24' : 'var(--border-strong)' }} />
                    </button>
                  ))}
                  {(hoverRating || rating) > 0 && (
                    <span className="ml-2 text-sm font-body font-semibold" style={{ color: '#fbbf24' }}>
                      {ratingLabels[hoverRating || rating]}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Category selector */}
            {(type === 'bug' || type === 'suggestion') && (
              <div className="mb-5">
                <label className="block text-xs font-mono uppercase tracking-wider mb-2"
                       style={{ color: 'var(--text-muted)' }}>Category</label>
                <div className="flex flex-wrap gap-2">
                  {(type === 'bug' ? BUG_CATEGORIES : SUGGEST_CATEGORIES).map(c => (
                    <button key={c} onClick={() => setCategory(c)}
                      className="px-3 py-1.5 rounded-lg text-xs font-body transition-all"
                      style={{
                        background: category === c ? selectedType.bg : 'var(--bg-card)',
                        border: `1px solid ${category === c ? selectedType.border : 'var(--border-default)'}`,
                        color: category === c ? selectedType.color : 'var(--text-secondary)',
                        fontWeight: category === c ? '600' : '400'
                      }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Page selector — for bugs */}
            {type === 'bug' && (
              <div className="mb-5">
                <label className="block text-xs font-mono uppercase tracking-wider mb-2"
                       style={{ color: 'var(--text-muted)' }}>Where did it happen?</label>
                <select value={page} onChange={e => setPage(e.target.value)}
                  className="input-field text-sm"
                  style={{ fontFamily: 'Inter, sans-serif' }}>
                  {PAGES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            )}

            {/* Message */}
            <div className="mb-5">
              <label className="block text-xs font-mono uppercase tracking-wider mb-2"
                     style={{ color: 'var(--text-muted)' }}>
                {type === 'bug' ? 'Describe the issue *' :
                 type === 'suggestion' ? 'Describe your idea *' :
                 type === 'rating' ? 'Tell us more (optional)' : 'Your message *'}
              </label>
              <textarea value={message} onChange={e => setMessage(e.target.value)}
                placeholder={
                  type === 'bug' ? 'What happened? What were you trying to do? What did you expect?' :
                  type === 'suggestion' ? 'Describe your idea in detail. How would it help students?' :
                  type === 'rating' ? 'What did you like? What could be improved?' :
                  'Share anything that\'s on your mind...'
                }
                rows={5} className="input-field resize-none w-full"
                style={{ fontFamily: 'Inter, sans-serif', lineHeight: '1.6', fontSize: '14px' }} />
              <p className="text-xs mt-1 font-body" style={{ color: 'var(--text-muted)' }}>
                {message.length}/500 characters
              </p>
            </div>

            {/* User info (auto-filled if logged in) */}
            <div className="p-3 rounded-xl mb-5"
                 style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}>
              <p className="text-xs font-body" style={{ color: 'var(--text-secondary)' }}>
                <Sparkles size={10} style={{ display: 'inline', marginRight: '4px', color: 'var(--accent-primary)' }} />
                Submitting as: <strong style={{ color: 'var(--text-primary)' }}>
                  {user?.name || 'Anonymous'}
                </strong>
                {user?.email && <span style={{ color: 'var(--text-muted)' }}> · {user.email}</span>}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-xl mb-4 text-sm font-body"
                   style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button onClick={handleSubmit} disabled={submitting}
              className="btn-primary w-full justify-center py-3 disabled:opacity-40"
              style={{ background: `linear-gradient(135deg, ${selectedType.color}, ${selectedType.color}cc)` }}>
              {submitting
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting...</>
                : <><Send size={15} /> Submit Feedback</>}
            </button>
          </div>
        )}

        {/* ── STEP 3: Success ── */}
        {step === 3 && (
          <div className="glass-card p-10 text-center animate-fade-in"
               style={{ border: '1.5px solid rgba(74,222,128,0.30)' }}>
            <div className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center"
                 style={{ background: 'rgba(74,222,128,0.15)', border: '2px solid rgba(74,222,128,0.35)' }}>
              <Check size={30} style={{ color: '#4ade80' }} />
            </div>
            <h2 className="font-display font-bold text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>
              Thank you! 🎉
            </h2>
            <p className="font-body text-base mb-6 max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
              {type === 'bug'
                ? 'We\'ve received your bug report and will look into it shortly.'
                : type === 'suggestion'
                ? 'Your idea has been recorded. We genuinely read every suggestion!'
                : type === 'rating'
                ? 'Your rating helps us improve InsightMint for all students.'
                : 'Your feedback means a lot to us. Thank you for taking the time!'}
            </p>

            {/* Rating display */}
            {type === 'rating' && rating > 0 && (
              <div className="flex justify-center gap-1 mb-6">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={24} fill={s <= rating ? '#fbbf24' : 'none'}
                        style={{ color: s <= rating ? '#fbbf24' : 'var(--border-strong)' }} />
                ))}
              </div>
            )}

            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={reset}
                className="btn-ghost px-6">
                Submit Another
              </button>
              <button onClick={() => window.history.back()}
                className="btn-primary px-6"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                Back to Learning
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}