import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  Mic, MicOff, Volume2, VolumeX, X, Minimize2,
  Loader2, Sparkles, MessageSquare, RotateCcw,
  ChevronDown, ChevronUp, Brain
} from 'lucide-react';

const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('insightmint_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// ── Browser Speech API check ──────────────────────────────
// These must be accessed inside component, not at module level
const getSpeechRecognition = () => window.SpeechRecognition || window.webkitSpeechRecognition || null;
const getSynth = () => window.speechSynthesis || null;

const WAKE_WORDS = ['hey insight', 'hi insight', 'hello insight', 'okay insight', 'insight'];

const QUICK_PROMPTS = [
  'Explain this topic simply',
  'Give me 3 key points',
  'What should I learn next?',
  'Quiz me on this topic',
  'Summarize what I know',
];

export default function VoiceAssistant({ topic = 'general learning', isOpen, onClose }) {
  const [listening, setListening]         = useState(false);
  const [speaking, setSpeaking]           = useState(false);
  const [transcript, setTranscript]       = useState('');
  const [response, setResponse]           = useState('');
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [muted, setMuted]                 = useState(false);
  const [minimized, setMinimized]         = useState(false);
  const [conversation, setConversation]   = useState([]);
  const [supported, setSupported]         = useState(true);
  const [showConvo, setShowConvo]         = useState(false);

  const recogRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!getSpeechRecognition()) { setSupported(false); return; }
    setupRecognition();
    return () => { stopListening(); getSynth()?.cancel(); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const setupRecognition = () => {
    const SR = getSpeechRecognition();
    if (!SR) return;
    const recog = new SR();
    recog.continuous = false;
    recog.interimResults = true;
    recog.lang = 'en-US';

    recog.onresult = (e) => {
      const result = Array.from(e.results).map(r => r[0].transcript).join('');
      setTranscript(result);
      if (e.results[e.results.length - 1].isFinal) {
        handleUserSpeech(result);
      }
    };

    recog.onerror = (e) => {
      if (e.error !== 'no-speech') setError(`Mic error: ${e.error}`);
      setListening(false);
    };

    recog.onend = () => setListening(false);
    recogRef.current = recog;
  };

  const startListening = () => {
    if (!recogRef.current || listening) return;
    setError('');
    setTranscript('');
    try {
      recogRef.current.start();
      setListening(true);
    } catch (e) {
      setupRecognition();
      try { recogRef.current.start(); setListening(true); } catch {}
    }
  };

  const stopListening = () => {
    try { recogRef.current?.stop(); } catch {}
    setListening(false);
  };

  const speak = (text) => {
    const synth = getSynth();
    if (!synth || muted) return;
    synth.cancel();
    const clean = text.replace(/[#*`]/g, '').slice(0, 500);
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    utterance.volume = 1;

    // Try to use a natural voice
    const voices = synth.getVoices();
    const preferred = voices.find(v =>
      v.name.includes('Google') || v.name.includes('Natural') ||
      v.name.includes('Samantha') || v.name.includes('Daniel')
    );
    if (preferred) utterance.voice = preferred;

    utterance.onstart  = () => setSpeaking(true);
    utterance.onend    = () => setSpeaking(false);
    utterance.onerror  = () => setSpeaking(false);
    synth.speak(utterance);
  };

  const stopSpeaking = () => { getSynth()?.cancel(); setSpeaking(false); };

  const handleUserSpeech = async (text) => {
    if (!text.trim() || text.trim().length < 2) return;
    setTranscript('');
    await askAI(text);
  };

  const askAI = async (question) => {
    setLoading(true); setError('');
    const userMsg = { role: 'user', text: question, time: new Date() };
    setConversation(prev => [...prev, userMsg]);

    try {
      const { data } = await api.post('/ai/chat', {
        message: question,
        topic,
        history: conversation.slice(-4).map(m => ({ role: m.role, content: m.text })),
        systemPrompt: `You are InsightMint's friendly voice assistant helping a student learn about "${topic}". 
Keep responses conversational, clear and concise — ideally 2-4 sentences since this will be spoken aloud.
Be encouraging and educational. Do not use markdown, bullet points, or special characters in your response.`
      });
      console.log('Voice AI response:', data);

      const aiText = data.reply || data.response || data.message || '';

      if (!aiText) {
        setError('Server returned empty response. Check if Groq API key is set in server/.env');
        return;
      }      const aiMsg = { role: 'assistant', text: aiText, time: new Date() };
      setConversation(prev => [...prev, aiMsg]);
      setResponse(aiText);
      speak(aiText);
    } catch (err) {
      console.error('Voice assistant error:', err);
      const msg = err.response?.status === 401
        ? 'Please sign in to use the voice assistant.'
        : err.response?.data?.error || 'Could not connect. Make sure the server is running on port 5000.';
      setError(msg);
    } finally { setLoading(false); }
  };

  const handleQuickPrompt = (prompt) => {
    askAI(`${prompt} about ${topic}`);
  };

  const clearConversation = () => {
    setConversation([]);
    setResponse('');
    setTranscript('');
    synth?.cancel();
  };

  const formatTime = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (!isOpen) return null;

  if (!supported) return (
    <div className="fixed bottom-6 right-6 z-50 glass-card p-5 max-w-xs animate-fade-in"
         style={{ border: '1px solid rgba(248,113,113,0.30)' }}>
      <div className="flex items-center gap-3 mb-2">
        <MicOff size={20} style={{ color: '#f87171' }} />
        <p className="font-display font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Voice not supported</p>
        <button onClick={onClose}><X size={14} style={{ color: 'var(--text-muted)' }} /></button>
      </div>
      <p className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>
        Your browser doesn't support speech recognition. Try Chrome or Edge.
      </p>
    </div>
  );

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in" style={{ width: minimized ? 'auto' : '340px' }}>
      <div className="glass-card overflow-hidden"
           style={{ border: '1px solid rgba(99,102,241,0.30)', boxShadow: '0 8px 40px rgba(99,102,241,0.20)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3"
             style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.10))', borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-8 h-8 rounded-full flex items-center justify-center"
                   style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                <Brain size={15} className="text-white" />
              </div>
              {(listening || speaking || loading) && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full animate-pulse"
                      style={{ background: listening ? '#4ade80' : speaking ? '#818cf8' : '#fbbf24' }} />
              )}
            </div>
            <div>
              <p className="font-display font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                Voice Assistant
              </p>
              <p className="text-xs font-body" style={{ color: '#818cf8' }}>
                {listening ? '🎤 Listening...' : speaking ? '🔊 Speaking...' : loading ? '⏳ Thinking...' : `Topic: ${topic}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setMinimized(!minimized)}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
              style={{ color: 'var(--text-muted)', background: 'var(--bg-card)' }}>
              <Minimize2 size={13} />
            </button>
            <button onClick={() => { stopListening(); stopSpeaking(); onClose(); }}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
              style={{ color: 'var(--text-muted)', background: 'var(--bg-card)' }}>
              <X size={13} />
            </button>
          </div>
        </div>

        {!minimized && (
          <>
            {/* Visualizer / Status area */}
            <div className="px-4 py-5 text-center" style={{ borderBottom: '1px solid var(--border-default)' }}>

              {/* Mic button */}
              <button
                onClick={listening ? stopListening : startListening}
                disabled={loading}
                className="relative w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center transition-all duration-300 disabled:opacity-50"
                style={{
                  background: listening
                    ? 'linear-gradient(135deg,#4ade80,#22c55e)'
                    : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                  boxShadow: listening
                    ? '0 0 0 8px rgba(74,222,128,0.20), 0 4px 20px rgba(74,222,128,0.40)'
                    : '0 4px 20px rgba(99,102,241,0.35)',
                  transform: listening ? 'scale(1.05)' : 'scale(1)',
                }}>
                {loading
                  ? <Loader2 size={24} className="animate-spin text-white" />
                  : listening
                  ? <MicOff size={24} className="text-white" />
                  : <Mic size={24} className="text-white" />}
                {/* Ripple when listening */}
                {listening && (
                  <>
                    <span className="absolute inset-0 rounded-full animate-ping opacity-30"
                          style={{ background: '#4ade80' }} />
                    <span className="absolute -inset-2 rounded-full animate-ping opacity-20 animation-delay-300"
                          style={{ background: '#4ade80' }} />
                  </>
                )}
              </button>

              {/* Status text */}
              <p className="text-xs font-body mb-2" style={{ color: 'var(--text-muted)' }}>
                {listening ? 'Tap to stop · Speaking...' : 'Tap mic to speak'}
              </p>

              {/* Live transcript */}
              {transcript && (
                <div className="px-3 py-2 rounded-xl text-xs font-body italic animate-fade-in"
                     style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.20)', color: '#4ade80' }}>
                  "{transcript}"
                </div>
              )}

              {/* AI Response */}
              {response && !loading && (
                <div className="mt-3 px-3 py-2.5 rounded-xl text-xs font-body text-left animate-fade-in"
                     style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.20)' }}>
                  <p className="text-xs font-mono mb-1" style={{ color: '#818cf8' }}>
                    ✨ InsightMint says:
                  </p>
                  <p style={{ color: 'var(--text-primary)', lineHeight: '1.5' }}>
                    {response.slice(0, 180)}{response.length > 180 ? '...' : ''}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {speaking
                      ? <button onClick={stopSpeaking} className="flex items-center gap-1 text-xs" style={{ color: '#818cf8' }}>
                          <VolumeX size={11} /> Stop
                        </button>
                      : <button onClick={() => speak(response)} className="flex items-center gap-1 text-xs" style={{ color: '#818cf8' }}>
                          <Volume2 size={11} /> Replay
                        </button>
                    }
                    <button onClick={() => setMuted(!muted)} className="flex items-center gap-1 text-xs ml-auto"
                      style={{ color: muted ? '#f87171' : 'var(--text-muted)' }}>
                      {muted ? <VolumeX size={11} /> : <Volume2 size={11} />}
                      {muted ? 'Unmute' : 'Mute'}
                    </button>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mt-2 px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(248,113,113,0.10)', color: '#f87171' }}>
                  {error}
                </div>
              )}
            </div>

            {/* Quick prompts */}
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-default)' }}>
              <p className="text-xs font-mono mb-2" style={{ color: 'var(--text-muted)' }}>Quick ask:</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map(p => (
                  <button key={p} onClick={() => handleQuickPrompt(p)}
                    disabled={loading || listening}
                    className="px-2.5 py-1 rounded-lg text-xs font-body transition-all disabled:opacity-40"
                    style={{ background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.20)', color: '#818cf8' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.20)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.10)'}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Conversation history */}
            <div className="px-4 py-2">
              <button onClick={() => setShowConvo(!showConvo)}
                className="flex items-center justify-between w-full text-xs font-body py-1"
                style={{ color: 'var(--text-muted)' }}>
                <span className="flex items-center gap-1.5">
                  <MessageSquare size={11} />
                  Conversation ({conversation.length} messages)
                </span>
                {showConvo ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              {showConvo && conversation.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto space-y-2 pb-2">
                  {conversation.map((msg, i) => (
                    <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[85%] px-3 py-2 rounded-xl text-xs font-body"
                           style={{
                             background: msg.role === 'user' ? 'rgba(99,102,241,0.15)' : 'var(--bg-card)',
                             border: `1px solid ${msg.role === 'user' ? 'rgba(99,102,241,0.25)' : 'var(--border-default)'}`,
                             color: 'var(--text-primary)'
                           }}>
                        <p style={{ lineHeight: '1.4' }}>{msg.text}</p>
                        <p className="text-right mt-1 opacity-50" style={{ fontSize: '10px' }}>{formatTime(msg.time)}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
              )}

              {conversation.length > 0 && (
                <button onClick={clearConversation}
                  className="flex items-center gap-1 text-xs mt-1 transition-all"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                  <RotateCcw size={10} /> Clear
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}