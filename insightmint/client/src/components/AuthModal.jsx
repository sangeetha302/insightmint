import { useNavigate } from 'react-router-dom';
import { X, Sparkles, LogIn, UserPlus, Lock } from 'lucide-react';

export default function AuthModal({ onClose, isExistingUser = false }) {
  const navigate = useNavigate();

  const handleLogin  = () => { onClose(); navigate('/login'); };
  const handleSignup = () => { onClose(); navigate('/signup'); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
         onClick={e => e.target === e.currentTarget && onClose()}>

      <div className="relative w-full max-w-md rounded-3xl p-8 animate-fade-in"
           style={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.1)' }}>

        {/* Close */}
        <button onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl transition-all"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
          <X size={15} />
        </button>

        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
             style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
          <Lock size={24} style={{ color: '#818cf8' }} />
        </div>

        {/* Text */}
        <div className="text-center mb-7">
          <h2 className="font-display font-bold text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>
            {isExistingUser ? 'Welcome back!' : 'Join InsightMint'}
          </h2>
          <p className="font-body text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {isExistingUser
              ? 'You\'ve been signed out. Please log in to continue using all features.'
              : 'Create a free account to access quizzes, roadmaps, notes, summarizer and all AI-powered features.'}
          </p>
        </div>

        {/* Features preview — only for new users */}
        {!isExistingUser && (
          <div className="grid grid-cols-2 gap-2 mb-6">
            {[
              { icon: '🤖', label: 'AI Study Notes' },
              { icon: '🧠', label: 'Smart Quiz' },
              { icon: '🗺️', label: 'Learning Roadmap' },
              { icon: '📝', label: 'Notes Manager' },
              { icon: '🎤', label: 'Voice Assistant' },
              { icon: '📊', label: 'Dashboard' },
            ].map(f => (
              <div key={f.label} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-body"
                   style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                <span>{f.icon}</span> {f.label}
              </div>
            ))}
          </div>
        )}

        {/* Buttons */}
        <div className="space-y-3">
          {/* Primary action */}
          <button onClick={isExistingUser ? handleLogin : handleSignup}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-body font-semibold text-sm transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
                     boxShadow: '0 4px 20px rgba(99,102,241,0.35)' }}>
            {isExistingUser
              ? <><LogIn size={16} /> Log In</>
              : <><UserPlus size={16} /> Create Free Account</>}
          </button>

          {/* Secondary action */}
          <button onClick={isExistingUser ? handleSignup : handleLogin}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-body text-sm transition-all"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
                     border: '1px solid var(--border-default)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-border)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-default)'}>
            {isExistingUser
              ? <><UserPlus size={16} /> Create New Account</>
              : <><LogIn size={16} /> Already have an account? Log in</>}
          </button>
        </div>

        {/* Free badge */}
        <p className="text-center text-xs font-body mt-4" style={{ color: 'var(--text-muted)' }}>
          <Sparkles size={10} style={{ display: 'inline', marginRight: '4px' }} />
          100% free — no credit card required
        </p>
      </div>
    </div>
  );
}