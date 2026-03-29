import { useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';

export default function FeedbackFAB() {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show on feedback page itself or auth pages
  if (location.pathname === '/feedback' ||
      location.pathname === '/login' ||
      location.pathname === '/signup') return null;

  return (
    <button
      onClick={() => navigate('/feedback')}
      title="Give Feedback"
      className="fixed bottom-24 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-300 hover:scale-105 group"
      style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.90), rgba(139,92,246,0.90))',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
        border: '1px solid rgba(255,255,255,0.15)',
        color: '#fff',
        fontSize: '13px',
        fontFamily: 'Inter, sans-serif',
        fontWeight: '500',
      }}>
      <MessageSquare size={15} />
      <span className="hidden sm:inline">Feedback</span>
      {/* Tooltip on mobile */}
      <span className="sm:hidden absolute right-14 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
        Give Feedback
      </span>
    </button>
  );
}