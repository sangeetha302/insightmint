import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const HIDE_ON = ['/', '/login', '/signup'];

export default function BackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  if (HIDE_ON.includes(location.pathname)) return null;

  return (
    <button
      onClick={() => navigate(-1)}
      className="fixed top-[72px] left-4 z-40 w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:scale-110"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-default)',
        color: 'var(--text-secondary)',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.color = 'var(--accent-primary)';
        e.currentTarget.style.borderColor = 'var(--accent-border)';
        e.currentTarget.style.background = 'var(--accent-dim)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color = 'var(--text-secondary)';
        e.currentTarget.style.borderColor = 'var(--border-default)';
        e.currentTarget.style.background = 'var(--bg-card)';
      }}>
      <ChevronLeft size={16} />
    </button>
  );
}