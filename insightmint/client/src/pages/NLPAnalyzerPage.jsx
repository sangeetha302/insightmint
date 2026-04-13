import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Brain, FileText, X, Loader2, Upload, Sparkles,
  Heart, Tag, Activity, BookOpen, Zap, RotateCcw,
  ChevronDown, ChevronUp, Copy, Check, Save, Lightbulb
} from 'lucide-react';
import { extractTextFromFile } from '../utils/fileExtractor';
import { useAuth } from '../context/AuthContext';

const api = axios.create({ baseURL: 'https://insightmint-backend-3zax.onrender.com/api' });
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('insightmint_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

const QUICK_ACTIONS = [
  { label: '📖 Study notes', sample: `Python is a high-level programming language known for its simplicity and readability. It supports multiple programming paradigms including procedural, object-oriented, and functional programming. Python's extensive standard library and active community make it excellent for web development, data science, machine learning, and automation. Key concepts include variables, data types, control flow, functions, classes, and modules.` },
  { label: '📰 Article', sample: `Machine learning is transforming how we interact with technology. Neural networks, inspired by the human brain, can now recognize images, translate languages, and generate human-like text. Companies like Google, OpenAI, and Meta are investing billions in AI research. However, experts warn about potential risks including bias, job displacement, and privacy concerns. Responsible AI development requires collaboration between technologists, policymakers, and ethicists.` },
  { label: '📝 Review', sample: `This online course on data structures was absolutely fantastic! The instructor explained complex concepts like trees, graphs, and dynamic programming in a very clear and engaging way. The practice problems were challenging but extremely rewarding. I finally understood Big O notation after struggling with it for months. The course community was supportive and the projects were real-world applications. Highly recommend to anyone preparing for technical interviews.` },
];

export default function NLPAnalyzerPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [text, setText]               = useState('');
  const [file, setFile]               = useState(null);
  const [extracting, setExtracting]   = useState(false);
  const [analyzing, setAnalyzing]     = useState(false);
  const [results, setResults]         = useState(null);
  const [error, setError]             = useState('');
  const [copied, setCopied]           = useState(false);
  const [savedNote, setSavedNote]     = useState(false);
  const [expanded, setExpanded]       = useState({ summary: true, sentiment: true, topics: true, entities: true });

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  const handleFile = async (f) => {
    setFile(f); setExtracting(true);
    try {
      const extracted = await extractTextFromFile(f);
      setText(extracted.slice(0, 3000));
    } catch { setError('Could not read file.'); }
    finally { setExtracting(false); }
  };

  const handleAnalyze = async () => {
    if (!text.trim() || text.trim().split(/\s+/).length < 10) {
      setError('Please enter at least 10 words to analyze.'); return;
    }
    setAnalyzing(true); setError(''); setResults(null);

    try {
      // Run all 4 NLP models in parallel
      const [summaryRes, sentimentRes, classifyRes, nerRes] = await Promise.allSettled([
        api.post('/nlp/summarize',  { text }),
        api.post('/nlp/sentiment',  { text }),
        api.post('/nlp/classify',   { text }),
        api.post('/nlp/ner',        { text }),
      ]);

      setResults({
        summary:   summaryRes.status   === 'fulfilled' ? summaryRes.value.data   : null,
        sentiment: sentimentRes.status === 'fulfilled' ? sentimentRes.value.data : null,
        classify:  classifyRes.status  === 'fulfilled' ? classifyRes.value.data  : null,
        ner:       nerRes.status       === 'fulfilled' ? nerRes.value.data       : null,
      });
    } catch (err) {
      setError('Analysis failed. Make sure the server is running.');
    } finally { setAnalyzing(false); }
  };

  const saveAsNote = async () => {
    if (!results || !isAuthenticated) { if (!isAuthenticated) navigate('/login'); return; }
    const content = [
      results.summary?.summary && `## AI Summary\n${results.summary.summary}`,
      results.sentiment && `## Sentiment\n${results.sentiment.sentiment} (${results.sentiment.score}% confidence)`,
      results.classify && `## Topic\n${results.classify.topLabel} (${results.classify.topScore}%)`,
    ].filter(Boolean).join('\n\n');

    try {
      await api.post('/notes', { title: `Analysis: ${file?.name || 'My Notes'}`, content, type: 'ai generated' });
      setSavedNote(true); setTimeout(() => setSavedNote(false), 3000);
    } catch {}
  };

  const toggle = (key) => setExpanded(p => ({ ...p, [key]: !p[key] }));

  const heatColor = (score) => {
    if (score >= 80) return '#4ade80';
    if (score >= 60) return '#818cf8';
    if (score >= 40) return '#fbbf24';
    return '#f87171';
  };

  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-mono mb-4"
               style={{ background: 'rgba(129,140,248,0.12)', border: '1px solid rgba(129,140,248,0.25)', color: '#818cf8' }}>
            <Brain size={14} /> AI Note Analyzer
          </div>
          <h1 className="font-display text-4xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            Analyze Your <span style={{ background: 'linear-gradient(135deg,#818cf8,#14b8a6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Notes</span>
          </h1>
          <p className="font-body text-lg max-w-xl mx-auto" style={{ color: 'var(--text-muted)' }}>
            Paste your study notes or any text — get instant AI summary, sentiment, topic detection, and key entities
          </p>
        </div>

        {/* What it does cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { icon: BookOpen, label: 'Summarize',  desc: 'BART NLP model condenses your notes', color: '#14b8a6', bg: 'rgba(20,184,166,0.10)' },
            { icon: Heart,    label: 'Sentiment',  desc: 'DistilBERT detects tone & mood',       color: '#f87171', bg: 'rgba(248,113,113,0.10)' },
            { icon: Tag,      label: 'Topic',      desc: 'BART-MNLI classifies the subject',     color: '#818cf8', bg: 'rgba(129,140,248,0.10)' },
            { icon: Activity, label: 'Entities',   desc: 'BERT-NER finds names & places',        color: '#fbbf24', bg: 'rgba(251,191,36,0.10)' },
          ].map(c => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="glass-card p-4 text-center">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: c.bg }}>
                  <Icon size={16} style={{ color: c.color }} />
                </div>
                <p className="font-display font-semibold text-sm mb-0.5" style={{ color: 'var(--text-primary)' }}>{c.label}</p>
                <p className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>{c.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Input */}
          <div className="lg:col-span-2">
            <div className="glass-card p-5 sticky top-24">
              <h2 className="font-display font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <FileText size={15} style={{ color: '#818cf8' }} /> Your Text
              </h2>

              {/* File upload */}
              <div className="mb-3 p-3 rounded-xl border-dashed border-2 text-center cursor-pointer transition-all"
                   style={{ borderColor: file ? 'rgba(74,222,128,0.4)' : 'var(--border-medium)', background: 'var(--bg-card)' }}
                   onClick={() => fileRef.current?.click()}>
                {extracting ? (
                  <div className="flex items-center justify-center gap-2 text-xs" style={{ color: 'var(--accent-primary)' }}>
                    <Loader2 size={13} className="animate-spin" /> Extracting text...
                  </div>
                ) : file ? (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-body truncate" style={{ color: 'var(--accent-primary)' }}>✓ {file.name}</span>
                    <button onClick={e => { e.stopPropagation(); setFile(null); setText(''); }}
                      style={{ color: '#f87171' }}><X size={13} /></button>
                  </div>
                ) : (
                  <div className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>
                    <Upload size={14} className="mx-auto mb-1" />
                    Upload PDF / TXT / DOCX
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".pdf,.txt,.docx,.md" className="hidden"
                onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value=''; }} />

              {/* Quick samples */}
              <div className="mb-3">
                <p className="text-xs font-mono mb-2" style={{ color: 'var(--text-muted)' }}>Try a sample:</p>
                <div className="flex gap-1.5 flex-wrap">
                  {QUICK_ACTIONS.map(s => (
                    <button key={s.label} onClick={() => { setText(s.sample); setResults(null); setFile(null); }}
                      className="px-2.5 py-1 rounded-lg text-xs font-body transition-all"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}
                      onMouseEnter={e => { e.target.style.color='#818cf8'; e.target.style.borderColor='rgba(129,140,248,0.35)'; }}
                      onMouseLeave={e => { e.target.style.color='var(--text-muted)'; e.target.style.borderColor='var(--border-default)'; }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <textarea value={text}
                onChange={e => { setText(e.target.value); setResults(null); setError(''); }}
                placeholder="Paste your study notes, an article, a book chapter, or any text you want to analyze..."
                rows={10} className="input-field resize-none text-sm w-full mb-2"
                style={{ lineHeight: '1.7', fontFamily: 'DM Sans, sans-serif' }} />

              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                  {wordCount} words
                  {wordCount < 10 && wordCount > 0 && <span style={{ color: '#fbbf24' }}> (need 10+)</span>}
                </span>
                {text && (
                  <button onClick={() => { setText(''); setResults(null); setFile(null); }}
                    className="text-xs font-body flex items-center gap-1" style={{ color: '#f87171' }}>
                    <RotateCcw size={10} /> Clear
                  </button>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl text-xs mb-3"
                     style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }}>
                  <X size={12} /> {error}
                </div>
              )}

              <button onClick={handleAnalyze} disabled={!text.trim() || analyzing || wordCount < 10}
                className="btn-primary w-full justify-center py-3 text-sm disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#6366f1,#818cf8)' }}>
                {analyzing
                  ? <><Loader2 size={16} className="animate-spin" /> Analyzing with 4 NLP models...</>
                  : <><Zap size={16} /> Analyze Notes</>}
              </button>

              {/* Model info */}
              <div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
                <p className="text-xs font-mono font-bold mb-2" style={{ color: '#818cf8' }}>🤖 MODELS USED</p>
                <div className="space-y-1">
                  {[
                    'BART-large-CNN → Summarization',
                    'DistilBERT-SST2 → Sentiment',
                    'BART-MNLI → Topic Classification',
                    'BERT-NER → Entity Detection',
                  ].map(m => (
                    <p key={m} className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>• {m}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-3 space-y-4">

            {/* Analyzing animation */}
            {analyzing && (
              <div className="glass-card p-10 text-center animate-fade-in">
                <div className="flex justify-center gap-3 mb-5">
                  {[BookOpen, Heart, Tag, Activity].map((Icon, i) => (
                    <div key={i} className="w-10 h-10 rounded-xl flex items-center justify-center animate-pulse"
                         style={{ background: ['rgba(20,184,166,0.15)','rgba(248,113,113,0.15)','rgba(129,140,248,0.15)','rgba(251,191,36,0.15)'][i], animationDelay: `${i*0.2}s` }}>
                      <Icon size={18} style={{ color: ['#14b8a6','#f87171','#818cf8','#fbbf24'][i] }} />
                    </div>
                  ))}
                </div>
                <p className="font-display font-bold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>Running 4 NLP models...</p>
                <p className="text-sm font-body mb-5" style={{ color: 'var(--text-muted)' }}>BART · DistilBERT · BART-MNLI · BERT-NER</p>
                <div className="flex justify-center gap-1.5">
                  {[0,1,2,3,4].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full animate-bounce"
                         style={{ background: '#818cf8', animationDelay: `${i*0.15}s` }} />
                  ))}
                </div>
              </div>
            )}

            {/* Results */}
            {results && !analyzing && (
              <div className="space-y-4 animate-fade-in">

                {/* Action bar */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-sm font-body flex items-center gap-2" style={{ color: 'var(--accent-primary)' }}>
                    <Check size={14} /> Analysis complete — 4 NLP models ran
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => { navigator.clipboard.writeText(results.summary?.summary || ''); setCopied(true); setTimeout(()=>setCopied(false),2000); }}
                      className="btn-ghost py-1.5 px-3 text-xs">
                      {copied ? <><Check size={11} style={{ color: '#4ade80' }} /> Copied</> : <><Copy size={11} /> Copy</>}
                    </button>
                    <button onClick={saveAsNote} className="btn-primary py-1.5 px-3 text-xs"
                      style={savedNote ? { background: 'linear-gradient(135deg,#4ade80,#22c55e)', color: '#020817' } : {}}>
                      {savedNote ? <><Check size={11} /> Saved!</> : <><Save size={11} /> Save to Notes</>}
                    </button>
                  </div>
                </div>

                {/* ── 1. AI SUMMARY ── */}
                {results.summary && (
                  <div className="glass-card overflow-hidden" style={{ borderLeft: '3px solid #14b8a6' }}>
                    <button onClick={() => toggle('summary')}
                      className="w-full flex items-center justify-between p-4 transition-all"
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(20,184,166,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(20,184,166,0.12)' }}>
                          <BookOpen size={15} style={{ color: '#14b8a6' }} />
                        </div>
                        <div className="text-left">
                          <p className="font-display font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>AI Summary</p>
                          <p className="text-xs font-mono" style={{ color: '#14b8a6' }}>
                            {results.summary.fallback ? 'Extractive Fallback' : 'facebook/bart-large-cnn'} · NLP Summarization
                          </p>
                        </div>
                      </div>
                      {expanded.summary ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
                    </button>
                    {expanded.summary && (
                      <div className="px-5 pb-5">
                        <div className="p-4 rounded-xl" style={{ background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.20)' }}>
                          <p className="text-sm font-body leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                            {results.summary.summary}
                          </p>
                        </div>
                        <div className="flex gap-4 mt-2 text-xs font-body flex-wrap">
                          <span style={{ color: 'var(--text-muted)' }}>Original: <strong style={{ color: 'var(--text-primary)' }}>{results.summary.inputLength} chars</strong></span>
                          <span style={{ color: 'var(--text-muted)' }}>Summary: <strong style={{ color: '#14b8a6' }}>{results.summary.outputLength} chars</strong></span>
                          <span style={{ color: 'var(--text-muted)' }}>Reduced by: <strong style={{ color: '#14b8a6' }}>{Math.round((1 - results.summary.outputLength / results.summary.inputLength) * 100)}%</strong></span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── 2. SENTIMENT ── */}
                {results.sentiment && (
                  <div className="glass-card overflow-hidden" style={{ borderLeft: `3px solid ${results.sentiment.color}` }}>
                    <button onClick={() => toggle('sentiment')}
                      className="w-full flex items-center justify-between p-4 transition-all"
                      onMouseEnter={e => e.currentTarget.style.background = `${results.sentiment.color}08`}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${results.sentiment.color}18` }}>
                          <Heart size={15} style={{ color: results.sentiment.color }} />
                        </div>
                        <div className="text-left">
                          <p className="font-display font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Sentiment Analysis</p>
                          <p className="text-xs font-mono" style={{ color: results.sentiment.color }}>
                            {results.sentiment.fallback ? 'Keyword Fallback' : 'distilbert-base-uncased-finetuned-sst-2-english'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-display font-bold text-lg" style={{ color: results.sentiment.color }}>
                          {results.sentiment.emoji} {results.sentiment.sentiment}
                        </span>
                        {expanded.sentiment ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
                      </div>
                    </button>
                    {expanded.sentiment && (
                      <div className="px-5 pb-5 space-y-3">
                        <p className="text-sm font-body" style={{ color: 'var(--text-secondary)' }}>{results.sentiment.message}</p>
                        {results.sentiment.allScores?.map(s => (
                          <div key={s.label}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-body" style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                              <span className="font-mono" style={{ color: 'var(--text-muted)' }}>{s.score}%</span>
                            </div>
                            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--border-default)' }}>
                              <div className="h-full rounded-full transition-all duration-1000"
                                   style={{ width: `${s.score}%`, background: s.label === 'POSITIVE' ? '#4ade80' : '#f87171' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── 3. TOPIC CLASSIFICATION ── */}
                {results.classify && (
                  <div className="glass-card overflow-hidden" style={{ borderLeft: '3px solid #818cf8' }}>
                    <button onClick={() => toggle('topics')}
                      className="w-full flex items-center justify-between p-4 transition-all"
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(129,140,248,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(129,140,248,0.12)' }}>
                          <Tag size={15} style={{ color: '#818cf8' }} />
                        </div>
                        <div className="text-left">
                          <p className="font-display font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Topic Classification</p>
                          <p className="text-xs font-mono" style={{ color: '#818cf8' }}>
                            {results.classify.fallback ? 'Keyword Fallback' : 'facebook/bart-large-mnli'} · Zero-Shot NLP
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-display font-bold capitalize px-3 py-1 rounded-full text-sm"
                              style={{ background: 'rgba(129,140,248,0.15)', color: '#818cf8' }}>
                          {results.classify.topLabel}
                        </span>
                        {expanded.topics ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
                      </div>
                    </button>
                    {expanded.topics && (
                      <div className="px-5 pb-5 space-y-2">
                        {results.classify.allLabels?.map(l => (
                          <div key={l.label}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-body capitalize" style={{ color: 'var(--text-secondary)' }}>{l.label}</span>
                              <span className="font-mono" style={{ color: l.score === results.classify.topScore ? '#818cf8' : 'var(--text-muted)' }}>{l.score}%</span>
                            </div>
                            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--border-default)' }}>
                              <div className="h-full rounded-full transition-all duration-700"
                                   style={{ width: `${l.score}%`, background: l.label === results.classify.topLabel ? 'linear-gradient(90deg,#6366f1,#818cf8)' : 'var(--border-medium)' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── 4. NAMED ENTITIES ── */}
                {results.ner && (
                  <div className="glass-card overflow-hidden" style={{ borderLeft: '3px solid #fbbf24' }}>
                    <button onClick={() => toggle('entities')}
                      className="w-full flex items-center justify-between p-4 transition-all"
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(251,191,36,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(251,191,36,0.12)' }}>
                          <Activity size={15} style={{ color: '#fbbf24' }} />
                        </div>
                        <div className="text-left">
                          <p className="font-display font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Named Entities</p>
                          <p className="text-xs font-mono" style={{ color: '#fbbf24' }}>
                            {results.ner.fallback ? 'Pattern Fallback' : 'dslim/bert-base-NER'} · Token Classification
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono" style={{ color: '#fbbf24' }}>
                          {results.ner.totalFound} found
                        </span>
                        {expanded.entities ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
                      </div>
                    </button>
                    {expanded.entities && (
                      <div className="px-5 pb-5">
                        {results.ner.totalFound === 0 ? (
                          <p className="text-sm font-body text-center py-3" style={{ color: 'var(--text-muted)' }}>
                            No named entities found. Try text with people, places, or organizations.
                          </p>
                        ) : (
                          <div className="space-y-4">
                            {Object.entries(results.ner.entities).map(([type, ents]) => {
                              const typeColors = { Person: '#818cf8', Organization: '#14b8a6', Location: '#fbbf24', Miscellaneous: '#f97316', 'Detected Terms': '#a78bfa' };
                              const tc = typeColors[type] || '#fbbf24';
                              return (
                                <div key={type}>
                                  <p className="text-xs font-mono uppercase mb-2" style={{ color: tc }}>{type}</p>
                                  <div className="flex flex-wrap gap-2">
                                    {ents.map((e, i) => (
                                      <span key={i} className="px-2.5 py-1 rounded-full text-xs font-body"
                                            style={{ background: `${tc}18`, color: tc, border: `1px solid ${tc}30` }}>
                                        {e.word}
                                        <span className="ml-1 opacity-60 text-xs">{e.score}%</span>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Study tip */}
                {results.classify?.topLabel && (
                  <div className="glass-card p-4 flex items-start gap-3"
                       style={{ border: '1px solid rgba(129,140,248,0.20)', background: 'rgba(99,102,241,0.05)' }}>
                    <Lightbulb size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#818cf8' }} />
                    <div>
                      <p className="font-display font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                        Study Tip
                      </p>
                      <p className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>
                        Your notes are about <strong style={{ color: '#818cf8' }}>{results.classify.topLabel}</strong>
                        {results.sentiment?.sentiment === 'Positive'
                          ? ' and have a positive tone — great engagement with the material! 🎉'
                          : results.sentiment?.sentiment === 'Negative'
                          ? '. The tone seems negative — consider rewriting in your own words to improve retention.'
                          : '. Try to add your own examples to deepen understanding.'}
                        {' '}Want to <button onClick={() => navigate('/roadmap')} className="underline" style={{ color: 'var(--accent-primary)', cursor: 'pointer' }}>generate a roadmap</button> for this topic?
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Empty state */}
            {!results && !analyzing && (
              <div className="glass-card p-12 text-center">
                <Brain size={40} className="mx-auto mb-4" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
                <h3 className="font-display font-semibold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
                  Paste your notes to get started
                </h3>
                <p className="font-body text-sm max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
                  The AI will summarize them, detect the topic, analyze the tone, and identify key entities — all using real NLP models
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}