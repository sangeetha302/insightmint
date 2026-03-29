import { useState } from 'react';
import { Mic, X } from 'lucide-react';
import VoiceAssistant from './VoiceAssistant';
import { useLocation } from 'react-router-dom';

export default function VoiceFAB() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Extract topic from URL if on learn page
  const params = new URLSearchParams(location.search);
  const topic = params.get('topic') || 'general learning';

  // Don't show on auth pages
  if (location.pathname === '/login' || location.pathname === '/signup') return null;

  return (
    <>
      {/* Floating mic button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 group"
          style={{
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            boxShadow: '0 4px 24px rgba(99,102,241,0.45)',
          }}
          title="Voice Assistant">
          <Mic size={22} className="text-white" />
          {/* Tooltip */}
          <span className="absolute right-16 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none font-body"
                style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
            🎤 Voice Assistant
          </span>
        </button>
      )}

      {/* Voice assistant panel */}
      <VoiceAssistant
        topic={topic}
        isOpen={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}