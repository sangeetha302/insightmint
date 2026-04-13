import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  BookOpen, Brain, Map, MessageSquare, Download, Loader2,
  ChevronRight, CheckCircle2, ArrowLeft, Sparkles,
  Send, Wand2, X, ChevronDown, ChevronUp, Lightbulb, RotateCcw, GitBranch
} from 'lucide-react';
import { getSummary, saveProgress } from '../utils/api';
import { downloadNotesPDF } from '../utils/pdf';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Flashcards from '../components/Flashcards';
import Quiz from '../components/Quiz';
import Roadmap from '../components/Roadmap';
import ChatBot from '../components/ChatBot';
import Flowchart from '../components/Flowchart';
import axios from 'axios';

const api = axios.create({ baseURL: 'https://insightmint-backend-3zax.onrender.com/api' });
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('insightmint_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

const PROMPT_SUGGESTIONS = [
  { label: '🎓 Explain simply',   prompt: 'Explain this as if I am a complete beginner. Use simple words and everyday examples.' },
  { label: '💻 Focus on code',    prompt: 'Focus specifically on code examples and how to implement this in practice.' },
  { label: '📌 Bullet points',    prompt: 'Summarize everything in short, concise bullet points easy to memorize.' },
  { label: '👶 Explain like 10',  prompt: 'Explain as if teaching a 10-year-old. Very simple language and fun analogies.' },
  { label: '🔬 Deep dive',        prompt: 'Give a much deeper and more detailed explanation with advanced concepts.' },
  { label: '🎯 Interview prep',   prompt: 'Rewrite as interview preparation notes with key questions and model answers.' },
  { label: '📝 Exam notes',       prompt: 'Format as exam revision notes with important points and common mistakes.' },
  { label: '🌍 More examples',    prompt: 'Give more real-world examples and practical applications for each concept.' },
];

export default function VideoLearningPage() {
  const { videoId } = useParams();
  const [searchParams] = useSearchParams();
  const topic    = searchParams.get('topic')    || 'Learning';
  const title    = searchParams.get('title')    || 'Educational Video';
  const embedUrl = searchParams.get('embedUrl') || null;
  const source   = searchParams.get('source')   || 'youtube';
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { t, language } = useLanguage();

  const [activeTab, setActiveTab]           = useState('notes');
  const [summaryData, setSummaryData]       = useState(null);
  const [loading, setLoading]               = useState(true);
  const [customPrompt, setCustomPrompt]     = useState('');
  const [regenerating, setRegenerating]     = useState(false);
  const [regenError, setRegenError]         = useState('');
  const [showPromptBox, setShowPromptBox]   = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [promptHistory, setPromptHistory]   = useState([]);
  const [isCustomized, setIsCustomized]     = useState(false);

  const TABS = [
    { id: 'notes',      label: t.tab_notes      || 'Study Notes', icon: BookOpen },
    { id: 'flashcards', label: t.tab_flashcards  || 'Flashcards',  icon: Brain },
    { id: 'quiz',       label: t.tab_quiz        || 'Quiz',         icon: CheckCircle2 },
    { id: 'flowchart',  label: 'Flowchart',                         icon: GitBranch },
    { id: 'roadmap',    label: t.tab_roadmap     || 'Roadmap',      icon: Map },
    { id: 'chat',       label: t.tab_chat        || 'AI Tutor',     icon: MessageSquare },
  ];

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getSummary(topic, title);
      setSummaryData(data);
      if (isAuthenticated) {
        saveProgress({
          topic, videoId,
          videoTitle: title,
          thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
          source:    searchParams.get('source') || 'youtube',
          embedUrl:  searchParams.get('embedUrl') || '',
          channel:   searchParams.get('channel') || '',
          duration:  searchParams.get('duration') || '',
        }).catch(() => {});
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [topic, title, videoId, isAuthenticated]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  const handleRegenerate = async (promptOverride) => {
    const prompt = (promptOverride || customPrompt).trim();
    if (!prompt) return;
    setRegenerating(true);
    setRegenError('');
    try {
      const { data } = await api.post('/ai/summary', { topic, title, language, customPrompt: prompt });
      setSummaryData(data);
      setIsCustomized(true);
      setPromptHistory(prev => [prompt, ...prev.filter(p => p !== prompt)].slice(0, 5));
      setCustomPrompt('');
      setShowPromptBox(false);
      setShowSuggestions(false);
    } catch (err) {
      setRegenError(err.response?.data?.error || 'Failed to regenerate. Please try again.');
    } finally { setRegenerating(false); }
  };

  const handleReset = () => {
    setIsCustomized(false);
    setPromptHistory([]);
    loadSummary();
  };

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="page-top-accent" />
      <div className="max-w-7xl mx-auto px-4">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 mt-4 mb-6 text-sm font-body transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
          <ArrowLeft size={15} /> {t.video_back || 'Back'}
        </button>

        <div className="max-w-4xl mx-auto w-full">
          <div className="space-y-4">

            {/* Video */}
            <div className="glass-card overflow-hidden">
              <div className="relative" style={{ paddingBottom: '56.25%' }}>
                {source === 'archive' || source === 'dailymotion' || embedUrl ? (
                  <iframe className="absolute inset-0 w-full h-full"
                    src={embedUrl || `https://archive.org/embed/${videoId.replace('archive_','').replace('dm_','')}`}
                    title={title} frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen />
                ) : (
                  <iframe className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
                    title={title} frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen />
                )}
              </div>
              <div className="p-4">
                <h1 className="font-display font-bold text-lg leading-snug mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="tag">{topic}</span>
                  <span className="flex items-center gap-1 text-xs font-mono" style={{ color: 'var(--accent-primary)', opacity: 0.8 }}>
                    <Sparkles size={10} /> AI-enhanced
                  </span>
                  {source !== 'youtube' && (
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.25)' }}>
                      {source === 'archive' ? '🏛️ Internet Archive' : source === 'dailymotion' ? '📺 Dailymotion' : '🎬 External'}
                    </span>
                  )}
                  {isCustomized && (
                    <span className="flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(139,92,246,0.12)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.25)' }}>
                      <Wand2 size={9} /> Customized
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="glass-card">
              <div className="flex overflow-x-auto scrollbar-hide" style={{ borderBottom: '1px solid var(--border-default)', WebkitOverflowScrolling: 'touch' }}>
                {TABS.map(tab => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button key={tab.id} onClick={() => {
                      setActiveTab(tab.id);
                      try {
                        const usage = JSON.parse(localStorage.getItem('insightmint_tab_usage') || '{}');
                        usage[tab.id] = (usage[tab.id] || 0) + 1;
                        localStorage.setItem('insightmint_tab_usage', JSON.stringify(usage));
                      } catch {}
                    }}
                      className="flex items-center gap-2 px-5 py-4 text-sm font-body whitespace-nowrap flex-shrink-0 transition-all border-b-2"
                      style={{ color: active ? 'var(--accent-primary)' : 'var(--text-muted)', borderBottomColor: active ? 'var(--accent-primary)' : 'transparent', background: active ? 'var(--accent-dim)' : 'transparent' }}>
                      <Icon size={14} />{tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="p-6">
                {/* ── NOTES TAB ── */}
                {activeTab === 'notes' && (
                  <div className="animate-fade-in">
                    {loading ? (
                      <div className="flex flex-col items-center py-12 gap-3">
                        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
                        <p className="font-body text-sm" style={{ color: 'var(--text-secondary)' }}>Generating AI study notes...</p>
                      </div>
                    ) : summaryData ? (
                      <div className="space-y-5">

                        {/* Header */}
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                            Study Notes
                          </h2>
                          <div className="flex items-center gap-2 flex-wrap">
                            {isCustomized && (
                              <button onClick={handleReset}
                                className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-body transition-all"
                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
                                <RotateCcw size={12} /> Reset
                              </button>
                            )}
                            <button onClick={() => downloadNotesPDF(topic, summaryData.summary, summaryData.studyNotes)}
                              className="btn-ghost py-2 px-3 text-sm">
                              <Download size={14} /> PDF
                            </button>
                            <button onClick={() => { setShowPromptBox(!showPromptBox); setShowSuggestions(false); }}
                              className="flex items-center gap-1.5 py-2 px-3 rounded-xl text-sm font-body transition-all"
                              style={{
                                background: showPromptBox ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.08)',
                                border: `1.5px solid ${showPromptBox ? 'rgba(139,92,246,0.50)' : 'rgba(139,92,246,0.20)'}`,
                                color: '#a78bfa', fontWeight: showPromptBox ? '600' : '400'
                              }}>
                              <Wand2 size={14} />
                              {showPromptBox ? 'Close' : 'Regenerate'}
                            </button>
                          </div>
                        </div>

                        {/* ── CUSTOM PROMPT BOX ── */}
                        {showPromptBox && (
                          <div className="rounded-2xl p-5 animate-fade-in"
                               style={{ background: 'rgba(139,92,246,0.06)', border: '1.5px solid rgba(139,92,246,0.25)' }}>
                            <p className="font-display font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                              ✍️ Rewrite notes your way
                            </p>
                            <p className="text-xs font-body mb-4" style={{ color: 'var(--text-muted)' }}>
                              Tell the AI exactly how you want the notes — simpler, more examples, exam format, etc.
                            </p>

                            {/* Suggestions toggle */}
                            <button onClick={() => setShowSuggestions(!showSuggestions)}
                              className="flex items-center gap-1.5 text-xs font-body mb-3 px-3 py-1.5 rounded-xl transition-all"
                              style={{ background: 'rgba(139,92,246,0.10)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.20)' }}>
                              <Lightbulb size={12} /> Quick suggestions
                              {showSuggestions ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                            </button>

                            {/* Suggestion chips */}
                            {showSuggestions && (
                              <div className="flex flex-wrap gap-2 mb-4 animate-fade-in">
                                {PROMPT_SUGGESTIONS.map(s => (
                                  <button key={s.label}
                                    onClick={() => { setCustomPrompt(s.prompt); setShowSuggestions(false); }}
                                    className="px-3 py-1.5 rounded-xl text-xs font-body transition-all"
                                    style={{ background: customPrompt === s.prompt ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.10)', border: `1px solid ${customPrompt === s.prompt ? 'rgba(139,92,246,0.50)' : 'rgba(139,92,246,0.20)'}`, color: '#a78bfa' }}>
                                    {s.label}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Prompt input */}
                            <div className="flex gap-2 items-end">
                              <div className="flex-1">
                                <textarea value={customPrompt}
                                  onChange={e => setCustomPrompt(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleRegenerate(); }}}
                                  placeholder="e.g. Explain like I'm a beginner... Focus only on code... Make shorter... Use simpler language..."
                                  rows={3} className="input-field resize-none text-sm w-full"
                                  style={{ fontFamily: 'DM Sans, sans-serif', lineHeight: '1.6' }} />
                                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                  Enter to regenerate · Shift+Enter for new line
                                </p>
                              </div>
                              <button onClick={() => handleRegenerate()}
                                disabled={!customPrompt.trim() || regenerating}
                                className="btn-primary px-4 py-3 rounded-xl disabled:opacity-40 flex-shrink-0"
                                style={{ background: 'linear-gradient(135deg,#7c3aed,#a78bfa)' }}>
                                {regenerating ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                              </button>
                            </div>

                            {regenError && (
                              <p className="text-xs mt-2 flex items-center gap-1" style={{ color: '#f87171' }}>
                                <X size={11} /> {regenError}
                              </p>
                            )}

                            {/* Prompt history */}
                            {promptHistory.length > 0 && (
                              <div className="mt-3 pt-3 space-y-1" style={{ borderTop: '1px solid rgba(139,92,246,0.15)' }}>
                                <p className="text-xs font-mono mb-1" style={{ color: 'var(--text-muted)' }}>Recent:</p>
                                {promptHistory.map((h, i) => (
                                  <button key={i} onClick={() => setCustomPrompt(h)}
                                    className="w-full text-left text-xs font-body px-2 py-1.5 rounded-lg truncate transition-all"
                                    style={{ color: 'var(--text-muted)' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.08)'; e.currentTarget.style.color = '#a78bfa'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                                    ↩ {h}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Regenerating state */}
                        {regenerating && (
                          <div className="rounded-2xl p-8 text-center animate-fade-in"
                               style={{ background: 'rgba(139,92,246,0.06)', border: '1px dashed rgba(139,92,246,0.30)' }}>
                            <Loader2 size={28} className="animate-spin mx-auto mb-3" style={{ color: '#a78bfa' }} />
                            <p className="font-display font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Rewriting your notes...</p>
                            <p className="text-xs font-body mt-1" style={{ color: 'var(--text-muted)' }}>Applying your custom instructions with AI</p>
                            <div className="flex justify-center gap-1.5 mt-4">
                              {[0,1,2,3,4].map(i => (
                                <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                                     style={{ background: '#a78bfa', animationDelay: `${i*0.12}s` }} />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Notes content */}
                        {!regenerating && (
                          <>
                            {/* Last prompt badge */}
                            {isCustomized && promptHistory[0] && (
                              <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                                   style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}>
                                <Wand2 size={11} style={{ color: '#a78bfa' }} />
                                <span style={{ color: 'var(--text-muted)' }}>Custom prompt:</span>
                                <span className="truncate flex-1" style={{ color: '#a78bfa' }}>{promptHistory[0]}</span>
                              </div>
                            )}

                            {/* Summary */}
                            <div className="rounded-xl p-5" style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}>
                              <h3 className="font-display font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--accent-primary)' }}>
                                <Sparkles size={14} /> Summary
                              </h3>
                              <p className="font-body text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                {summaryData.summary}
                              </p>
                            </div>

                            {/* Key points */}
                            {summaryData.keyPoints?.length > 0 && (
                              <div>
                                <h3 className="font-display font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Key Points</h3>
                                <ul className="space-y-2">
                                  {summaryData.keyPoints.map((pt, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm font-body">
                                      <ChevronRight size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--accent-primary)' }} />
                                      <span style={{ color: 'var(--text-secondary)' }}>{pt}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Sections */}
                            {summaryData.studyNotes?.sections?.map((sec, i) => (
                              <div key={i} className="glass-card p-5">
                                <h3 className="font-display font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{sec.title}</h3>
                                <p className="font-body text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{sec.content}</p>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    ) : (
                      <p className="text-center py-8 font-body" style={{ color: 'var(--text-muted)' }}>
                        Could not generate notes. Please try again.
                      </p>
                    )}
                  </div>
                )}

                {activeTab === 'flashcards' && <Flashcards topic={topic} />}
                {activeTab === 'quiz'       && <Quiz topic={topic} />}
                {activeTab === 'flowchart'  && <Flowchart topic={topic} />}
                {activeTab === 'roadmap'    && <Roadmap topic={topic} />}
                {activeTab === 'chat'       && <ChatBot topic={topic} />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}