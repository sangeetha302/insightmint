import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import {
  Sparkles, Upload, Link2, FileText, Youtube,
  X, Loader2, Copy, Download, Save, Check,
  ChevronDown, ChevronUp, AlertCircle, History,
  File, Image, Globe, Clock, Trash2, RefreshCw,
  Youtube as YoutubeIcon, ExternalLink
} from 'lucide-react';
import { downloadNotesPDF } from '../utils/pdf';
import { extractTextFromFile, getFileTypeLabel } from '../utils/fileExtractor';

const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('insightmint_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

const MODES = [
  { id: 'file',    label: 'Upload File', icon: Upload,   desc: 'PDF, DOC, TXT, Image' },
  { id: 'youtube', label: 'YouTube URL', icon: Youtube,  desc: 'Any YouTube video' },
  { id: 'url',     label: 'Any URL',     icon: Globe,    desc: 'Webpage or article' },
  { id: 'text',    label: 'Paste Text',  icon: FileText, desc: 'Paste any text' },
];

const FILE_ACCEPT = '.pdf,.txt,.doc,.docx,.md,.png,.jpg,.jpeg';
const MAX_SIZE = 15 * 1024 * 1024;
const HISTORY_KEY = 'insightmint_summarizer_history';
const MAX_HISTORY = 30;

// ── History helpers ──────────────────────────────────────

// ── DB helpers for summarizer history ───────────────────────
const saveSummaryToDB = async (entry) => {
  const token = localStorage.getItem('insightmint_token');
  if (!token) return null;
  try {
    const res = await fetch('/api/summarizer-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(entry)
    });
    const data = await res.json();
    return data.item; // returns saved item with _id
  } catch { return null; }
};

const loadSummaryFromDB = async () => {
  const token = localStorage.getItem('insightmint_token');
  if (!token) return [];
  try {
    const res = await fetch('/api/summarizer-history', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    return data.history || [];
  } catch { return []; }
};

const deleteSummaryFromDB = async (id) => {
  const token = localStorage.getItem('insightmint_token');
  if (!token) return;
  try {
    await fetch('/api/summarizer-history/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
  } catch {}
};

const clearSummaryFromDB = async () => {
  const token = localStorage.getItem('insightmint_token');
  if (!token) return;
  try {
    await fetch('/api/summarizer-history', {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
  } catch {}
};

const loadHistory = () => {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
};

const saveHistory = (history) => {
  const sliced = history.slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(sliced));
};

const addToHistory = (entry) => {
  const history = loadHistory();
  // Remove duplicate if same source
  const filtered = history.filter(h => h.source !== entry.source);
  const newHistory = [{ ...entry, id: Date.now().toString(), savedAt: new Date().toISOString() }, ...filtered];
  saveHistory(newHistory);
  return newHistory;
};

// ── Markdown parser ──────────────────────────────────────
function parseMarkdownSummary(text) {
  const sections = [];
  const lines = text.split('\n');
  let current = null;
  for (const line of lines) {
    if (line.startsWith('## ') || line.startsWith('# ')) {
      if (current) sections.push(current);
      current = { title: line.replace(/^#+\s/, '').trim(), content: [] };
    } else if (current && line.trim()) {
      current.content.push(line);
    }
  }
  if (current) sections.push(current);
  return sections.filter(s => s.content.length > 0);
}

// ── Type icon/color map ──────────────────────────────────
const TYPE_META = {
  file:    { icon: '📄', color: '#60a5fa', label: 'File' },
  youtube: { icon: '📺', color: '#f87171', label: 'YouTube' },
  url:     { icon: '🌐', color: '#a78bfa', label: 'URL' },
  text:    { icon: '📝', color: '#4ade80', label: 'Text' },
};

function formatDate(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (diff < 1) return 'Just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  if (diff < 10080) return `${Math.floor(diff / 1440)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function SummarizerPage() {
  const { isAuthenticated, user } = useAuth();
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  const [mode, setMode] = useState('file');
  const [url, setUrl] = useState('');
  const [textInput, setTextInput] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [file, setFile] = useState(null);
  const [fileLabel, setFileLabel] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractedChars, setExtractedChars] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [savedNote, setSavedNote] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [history, setHistory] = useState(loadHistory);
  const [showHistory, setShowHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [clearConfirm, setClearConfirm] = useState(false);

  // Reload history from DB whenever user logs in
  useEffect(() => {
    if (user) {
      loadSummaryFromDB().then(dbItems => {
        if (dbItems.length > 0) {
          const merged = dbItems.map(item => ({ ...item, id: item._id || item.id }));
          setHistory(merged);
          localStorage.setItem(HISTORY_KEY, JSON.stringify(merged));
        } else {
          const stored = loadHistory();
          if (stored.length > 0) setHistory(stored);
        }
      });
    }
  }, [user]);
  const fileRef = useRef(null);
  const extractedTextRef = useRef('');

  // Keep history synced
  // Only save to localStorage when history actually changes (not on first load)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    saveHistory(history);
  }, [history]);

  const handleFile = async (f) => {
    if (f.size > MAX_SIZE) { setError(`File too large. Max 15MB.`); return; }
    setFile(f); setError(''); setResult(null);
    setExtracting(true);
    setFileLabel(getFileTypeLabel(f));
    extractedTextRef.current = '';
    setExtractedChars(0);
    try {
      const text = await extractTextFromFile(f);
      extractedTextRef.current = text;
      setExtractedChars(text.length);
    } catch (err) {
      setError(`Could not read file: ${err.message}`);
      setFile(null);
    } finally { setExtracting(false); }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const isYouTube = (u) => u.includes('youtube.com') || u.includes('youtu.be');
  const getYouTubeId = (u) => u.match(/(?:v=|youtu\.be\/|shorts\/)([^&\n?#]+)/)?.[1];

  const handleSummarize = async () => {
    setError(''); setResult(null); setLoading(true); setSavedNote(false);

    try {
      let data;

      if (mode === 'file') {
        if (!file) { setError('Please select a file.'); setLoading(false); return; }
        if (!extractedTextRef.current) { setError('File content could not be extracted.'); setLoading(false); return; }
        const { data: d } = await api.post('/summarize/text', {
          content: extractedTextRef.current.slice(0, 6000),
          title: file.name, language
        });
        data = { ...d, title: file.name.replace(/\.[^/.]+$/, ''), type: 'file', fileLabel, source: file.name };

      } else if (mode === 'youtube' || (mode === 'url' && isYouTube(url))) {
        if (!url.trim()) { setError('Please enter a YouTube URL.'); setLoading(false); return; }
        const { data: d } = await api.post('/summarize/youtube', { url: url.trim(), language });
        data = { ...d, title: d.videoTitle, type: 'youtube', source: url.trim() };

      } else if (mode === 'url') {
        if (!url.trim()) { setError('Please enter a URL.'); setLoading(false); return; }
        const { data: d } = await api.post('/summarize/url', { url: url.trim(), language });
        data = { ...d, title: url.trim(), type: 'url', source: url.trim() };

      } else if (mode === 'text') {
        if (!textInput.trim()) { setError('Please paste some text.'); setLoading(false); return; }
        const { data: d } = await api.post('/summarize/text', {
          content: textInput, title: textTitle || 'Pasted Text', language
        });
        data = { ...d, title: textTitle || 'Pasted Text', type: 'text', source: textTitle || 'Pasted Text' };
      }

      setResult(data);

      // ── Save to history ──
      const historyEntry = {
        type: data.type,
        title: data.title || data.source,
        source: data.source,
        summary: (data.summary || '').slice(0, 500),
        thumbnail: data.thumbnail || null,
        channelName: data.channelName || null,
        videoId: data.videoId || null,
        fileLabel: data.fileLabel || null,
        language,
        id: Date.now().toString(),
        savedAt: new Date().toISOString(),
      };
      // Save to DB first, then update state with DB id
      saveSummaryToDB(historyEntry).then(saved => {
        const entryWithId = saved ? { ...historyEntry, id: saved._id || historyEntry.id } : historyEntry;
        setHistory(prev => {
          const filtered = prev.filter(h => h.source !== entryWithId.source);
          const newHistory = [entryWithId, ...filtered].slice(0, MAX_HISTORY);
          localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
          return newHistory;
        });
      });

      // Expand sections
      const sections = parseMarkdownSummary(data.summary || '');
      const expanded = {};
      sections.forEach((_, i) => { expanded[i] = true; });
      setExpandedSections(expanded);

    } catch (err) {
      setError(err.response?.data?.error || 'Failed to summarize. Please try again.');
    } finally { setLoading(false); }
  };

  const loadFromHistory = (entry) => {
    setShowHistory(false);
    setResult({
      type: entry.type,
      title: entry.title,
      source: entry.source,
      summary: entry.summary,
      thumbnail: entry.thumbnail,
      channelName: entry.channelName,
      videoId: entry.videoId,
      fileLabel: entry.fileLabel,
    });
    const sections = parseMarkdownSummary(entry.summary || '');
    const expanded = {};
    sections.forEach((_, i) => { expanded[i] = true; });
    setExpandedSections(expanded);
  };

  const deleteHistoryItem = (id, e) => {
    e.stopPropagation();
    deleteSummaryFromDB(id);
    setHistory(prev => {
      const newHistory = prev.filter(h => h.id !== id && h._id !== id);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const clearHistory = () => {
    clearSummaryFromDB();
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
    setClearConfirm(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result?.summary || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveAsNote = async () => {
    if (!result) return;
    if (!isAuthenticated) { navigate('/login'); return; }
    try {
      await api.post('/notes', {
        title: result.title || 'AI Summary',
        content: result.summary || '',
        topic: result.title || '',
        type: 'ai generated',
      });
      setSavedNote(true);
      setTimeout(() => setSavedNote(false), 3000);
    } catch (e) { console.error(e); }
  };

  const downloadPDF = () => {
    if (!result) return;
    const sections = parseMarkdownSummary(result.summary || '');
    const summarySection = sections.find(s => s.title.toLowerCase().includes('summary'));
    downloadNotesPDF(
      result.title || 'Summary',
      summarySection?.content.join('\n') || result.summary,
      { sections: sections.map(s => ({ title: s.title, content: s.content.join('\n') })) }
    );
  };

  const sections = result ? parseMarkdownSummary(result.summary || '') : [];

  const canSummarize = () => {
    if (loading || extracting) return false;
    if (mode === 'file') return !!file && extractedChars > 0;
    if (mode === 'youtube' || mode === 'url') return url.trim().length > 5;
    if (mode === 'text') return textInput.trim().length > 20;
    return false;
  };

  const filteredHistory = historyFilter === 'all'
    ? history
    : history.filter(h => h.type === historyFilter);

  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="page-top-accent" />
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-mono mb-3"
                 style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', color: 'var(--accent-primary)' }}>
              <Sparkles size={14} /> AI Smart Summarizer
            </div>
            <h1 className="font-display text-4xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Summarize <span className="gradient-text">anything</span>
            </h1>
            <p className="font-body" style={{ color: 'var(--text-muted)' }}>
              Files, YouTube links, URLs, or text — instant AI summaries
            </p>
          </div>
          {/* History toggle */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-body text-sm transition-all relative"
            style={{
              background: showHistory ? 'var(--accent-dim)' : 'var(--bg-card)',
              border: `1px solid ${showHistory ? 'var(--accent-border)' : 'var(--border-default)'}`,
              color: showHistory ? 'var(--accent-primary)' : 'var(--text-secondary)'
            }}>
            <History size={16} />
            History
            {history.length > 0 && (
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-mono"
                    style={{ background: 'var(--accent-primary)', color: '#020817' }}>
                {history.length > 9 ? '9+' : history.length}
              </span>
            )}
          </button>
        </div>

        {/* ── HISTORY PANEL ── */}
        {showHistory && (
          <div className="glass-card p-5 mb-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                Summarizer History
                <span className="ml-2 text-sm font-body font-normal" style={{ color: 'var(--text-muted)' }}>
                  ({history.length} items)
                </span>
              </h2>
              {history.length > 0 && (
                clearConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>Clear all?</span>
                    <button onClick={clearHistory} className="px-3 py-1.5 rounded-lg text-xs font-body"
                      style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}>Yes, clear</button>
                    <button onClick={() => setClearConfirm(false)} className="btn-ghost py-1.5 px-3 text-xs">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setClearConfirm(true)} className="btn-ghost py-1.5 px-3 text-sm flex items-center gap-1.5" style={{ color: '#f87171', borderColor: 'rgba(248,113,113,0.20)' }}>
                    <Trash2 size={12} /> Clear all
                  </button>
                )
              )}
            </div>

            {/* Filter pills */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {['all', 'file', 'youtube', 'url', 'text'].map(f => {
                const count = f === 'all' ? history.length : history.filter(h => h.type === f).length;
                if (count === 0 && f !== 'all') return null;
                return (
                  <button key={f} onClick={() => setHistoryFilter(f)}
                    className="px-3 py-1 rounded-full text-xs font-mono capitalize transition-all flex items-center gap-1"
                    style={{
                      background: historyFilter === f ? 'var(--accent-primary)' : 'var(--bg-card)',
                      color: historyFilter === f ? '#020817' : 'var(--text-muted)',
                      border: `1px solid ${historyFilter === f ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                      fontWeight: historyFilter === f ? '600' : '400'
                    }}>
                    {f !== 'all' && TYPE_META[f]?.icon} {f} ({count})
                  </button>
                );
              })}
            </div>

            {/* History list */}
            {filteredHistory.length === 0 ? (
              <div className="text-center py-10">
                <History size={28} className="mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                <p className="font-body text-sm" style={{ color: 'var(--text-secondary)' }}>No history yet. Start summarizing!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {filteredHistory.map(entry => {
                  const meta = TYPE_META[entry.type] || TYPE_META.file;
                  return (
                    <button key={entry.id}
                      onClick={() => loadFromHistory(entry)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl text-left group transition-all"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-border)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-default)'}>

                      {/* Thumbnail or icon */}
                      <div className="flex-shrink-0">
                        {entry.thumbnail ? (
                          <img src={entry.thumbnail} alt="" className="w-14 h-10 object-cover rounded-lg" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                               style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}30` }}>
                            {meta.icon}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: `${meta.color}18`, color: meta.color }}>
                            {meta.label}
                          </span>
                          {entry.language && entry.language !== 'en' && (
                            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{entry.language.toUpperCase()}</span>
                          )}
                        </div>
                        <p className="font-body font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{entry.title}</p>
                        <p className="text-xs font-body truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {entry.summary?.slice(0, 80)}...
                        </p>
                      </div>

                      {/* Right side */}
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <button onClick={(e) => deleteHistoryItem(entry.id, e)}
                          className="w-6 h-6 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: 'rgba(248,113,113,0.10)', color: '#f87171' }}>
                          <X size={11} />
                        </button>
                        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                          {formatDate(entry.savedAt)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Mode selector */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {MODES.map(m => {
            const Icon = m.icon;
            const active = mode === m.id;
            return (
              <button key={m.id}
                onClick={() => { setMode(m.id); setResult(null); setError(''); setFile(null); setUrl(''); setTextInput(''); extractedTextRef.current = ''; setExtractedChars(0); }}
                className="p-4 rounded-2xl text-left transition-all duration-200 hover:translate-y-[-2px]"
                style={{
                  background: active ? 'var(--accent-dim)' : 'var(--bg-card)',
                  border: `2px solid ${active ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                  boxShadow: active ? '0 4px 20px var(--shadow-accent)' : 'none'
                }}>
                <Icon size={20} className="mb-2" style={{ color: active ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
                <div className="font-display font-semibold text-sm" style={{ color: active ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{m.label}</div>
                <div className="text-xs font-body mt-0.5" style={{ color: 'var(--text-muted)' }}>{m.desc}</div>
              </button>
            );
          })}
        </div>

        {/* Input area */}
        <div className="glass-card p-6 mb-6">

          {/* FILE */}
          {mode === 'file' && (
            <div>
              <div
                className="rounded-2xl p-8 text-center cursor-pointer transition-all duration-200"
                style={{
                  border: `2px dashed ${dragOver ? 'var(--accent-primary)' : file ? 'rgba(74,222,128,0.5)' : 'var(--border-medium)'}`,
                  background: dragOver ? 'var(--accent-dim)' : 'var(--bg-card)',
                }}
                onClick={() => !file && fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}>
                {file ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 rounded-xl"
                         style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-dim)' }}>
                          {file.type.startsWith('image/') ? <Image size={18} style={{ color: 'var(--accent-primary)' }} /> : <File size={18} style={{ color: 'var(--accent-primary)' }} />}
                        </div>
                        <div className="text-left">
                          <p className="font-body font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{file.name}</p>
                          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(1)} KB · {fileLabel}</p>
                        </div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); setFile(null); extractedTextRef.current = ''; setExtractedChars(0); }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ background: 'rgba(248,113,113,0.10)', color: '#f87171' }}>
                        <X size={14} />
                      </button>
                    </div>
                    {extracting ? (
                      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
                           style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}>
                        <Loader2 size={14} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
                        <span style={{ color: 'var(--accent-primary)' }}>Extracting text from {fileLabel}...</span>
                      </div>
                    ) : extractedChars > 0 ? (
                      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
                           style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)' }}>
                        <Check size={14} style={{ color: '#4ade80' }} />
                        <span style={{ color: '#4ade80' }}>✓ Extracted {extractedChars.toLocaleString()} characters</span>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                         style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}>
                      <Upload size={28} style={{ color: 'var(--accent-primary)' }} />
                    </div>
                    <p className="font-display font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Drop your file here</p>
                    <p className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>
                      or <span style={{ color: 'var(--accent-primary)', fontWeight: '600' }}>click to browse</span>
                    </p>
                    <p className="text-xs font-mono mt-2" style={{ color: 'var(--text-muted)' }}>PDF · TXT · DOC · DOCX · MD · PNG · JPG · Max 15MB</p>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept={FILE_ACCEPT} className="hidden"
                onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = ''; }} />
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { ext: 'PDF', note: 'Full text', color: '#f87171' },
                  { ext: 'DOCX', note: 'Full text', color: '#60a5fa' },
                  { ext: 'TXT/MD', note: 'Full text', color: '#4ade80' },
                  { ext: 'IMG', note: 'AI analysis', color: '#c084fc' },
                ].map(f => (
                  <div key={f.ext} className="flex items-center gap-2 p-2 rounded-lg text-xs"
                       style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                    <span className="font-mono font-bold" style={{ color: f.color }}>{f.ext}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{f.note}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* YOUTUBE */}
          {mode === 'youtube' && (
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>YouTube Video URL</label>
              <div className="flex gap-3 items-center p-2 rounded-2xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)' }}>
                <Youtube size={20} className="ml-2 flex-shrink-0" style={{ color: '#f87171' }} />
                <input type="url" value={url} onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSummarize()}
                  placeholder="https://youtube.com/watch?v=... or https://youtu.be/..."
                  className="flex-1 bg-transparent outline-none font-body py-2.5 text-sm" style={{ color: 'var(--text-primary)' }} />
                {url && <button onClick={() => setUrl('')} className="mr-2" style={{ color: 'var(--text-muted)' }}><X size={14} /></button>}
              </div>
              {url && isYouTube(url) && getYouTubeId(url) && (
                <div className="mt-4 flex items-center gap-3 p-3 rounded-xl"
                     style={{ background: 'var(--bg-card)', border: '1px solid rgba(74,222,128,0.25)' }}>
                  <img src={`https://img.youtube.com/vi/${getYouTubeId(url)}/mqdefault.jpg`}
                    className="w-24 h-14 object-cover rounded-lg flex-shrink-0"
                    onError={e => e.target.style.display = 'none'} alt="" />
                  <div>
                    <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>ID: {getYouTubeId(url)}</p>
                    <p className="text-xs font-body mt-1" style={{ color: '#4ade80' }}>✓ Valid YouTube URL detected</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ANY URL */}
          {mode === 'url' && (
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Website / Article URL</label>
              <div className="flex gap-3 items-center p-2 rounded-2xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)' }}>
                <Link2 size={20} className="ml-2 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                <input type="url" value={url} onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSummarize()}
                  placeholder="https://example.com/article..."
                  className="flex-1 bg-transparent outline-none font-body py-2.5 text-sm" style={{ color: 'var(--text-primary)' }} />
                {url && <button onClick={() => setUrl('')} className="mr-2" style={{ color: 'var(--text-muted)' }}><X size={14} /></button>}
              </div>
              <p className="text-xs font-body mt-2" style={{ color: 'var(--text-muted)' }}>💡 YouTube links also work here</p>
            </div>
          )}

          {/* PASTE TEXT */}
          {mode === 'text' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Title (optional)</label>
                <input type="text" value={textTitle} onChange={e => setTextTitle(e.target.value)}
                  placeholder="Give your text a title..." className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                  Paste your text · <span style={{ color: 'var(--accent-primary)' }}>{textInput.length.toLocaleString()} chars</span>
                </label>
                <textarea value={textInput} onChange={e => setTextInput(e.target.value)}
                  placeholder="Paste any text — articles, notes, research papers, code, essays..."
                  rows={9} className="input-field resize-none text-sm"
                  style={{ lineHeight: '1.7', fontFamily: 'DM Sans, sans-serif' }} />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 flex items-start gap-2 p-3 rounded-xl text-sm font-body"
                 style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }}>
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />{error}
            </div>
          )}

          {/* Button */}
          <button onClick={handleSummarize} disabled={!canSummarize()}
            className="btn-primary w-full justify-center mt-5 py-3.5 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ fontSize: '1rem' }}>
            {loading ? <><Loader2 size={18} className="animate-spin" /> Analyzing with Groq AI...</>
            : extracting ? <><Loader2 size={18} className="animate-spin" /> Reading file...</>
            : <><Sparkles size={18} /> Summarize Now</>}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="glass-card p-12 text-center">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                 style={{ background: 'var(--accent-dim)', border: '2px solid var(--accent-border)' }}>
              <Sparkles size={28} className="animate-pulse" style={{ color: 'var(--accent-primary)' }} />
            </div>
            <h3 className="font-display font-bold text-xl mb-2" style={{ color: 'var(--text-primary)' }}>Analyzing content...</h3>
            <p className="font-body text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Groq AI is generating your summary</p>
            <div className="flex justify-center gap-1.5">
              {[0,1,2,3,4].map(i => (
                <div key={i} className="w-2 h-2 rounded-full animate-bounce"
                     style={{ background: 'var(--accent-primary)', animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <div className="space-y-4 animate-fade-in">
            {/* Result header */}
            <div className="glass-card p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {result.thumbnail && (
                    <img src={result.thumbnail} alt="" className="w-20 h-12 object-cover rounded-lg flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs px-2.5 py-1 rounded-full font-mono"
                            style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', color: 'var(--accent-primary)' }}>
                        {TYPE_META[result.type]?.icon} {TYPE_META[result.type]?.label || result.type}
                        {result.fileLabel && ` · ${result.fileLabel}`}
                      </span>
                      <span className="text-xs font-mono flex items-center gap-1 px-2 py-0.5 rounded-full"
                            style={{ background: result.usedNLP ? 'rgba(20,184,166,0.12)' : 'var(--accent-dim)', color: result.usedNLP ? '#14b8a6' : 'var(--accent-primary)', border: `1px solid ${result.usedNLP ? 'rgba(20,184,166,0.30)' : 'var(--accent-border)'}` }}>
                        {result.usedNLP ? '🤖' : <Sparkles size={10} />}
                        {result.modelType || 'Groq LLaMA 3.1'}
                      </span>
                      <span className="text-xs font-mono flex items-center gap-1" style={{ color: '#4ade80' }}>
                        <History size={10} /> Saved to history
                      </span>
                    </div>
                    <h2 className="font-display font-bold text-lg leading-snug" style={{ color: 'var(--text-primary)' }}>{result.title}</h2>
                    {result.channelName && <p className="text-sm font-body mt-1" style={{ color: 'var(--text-muted)' }}>{result.channelName}</p>}
                    {result.source && result.type !== 'file' && result.type !== 'text' && (
                      <a href={result.source} target="_blank" rel="noopener noreferrer"
                        className="text-xs font-mono mt-1 flex items-center gap-1 hover:underline"
                        style={{ color: 'var(--accent-primary)' }}
                        onClick={e => e.stopPropagation()}>
                        <ExternalLink size={10} /> {result.source.slice(0, 60)}{result.source.length > 60 ? '...' : ''}
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0 flex-wrap">
                  <button onClick={copyToClipboard} className="btn-ghost py-2 px-3 text-sm">
                    {copied ? <><Check size={14} style={{ color: '#4ade80' }} /> Copied!</> : <><Copy size={14} /> Copy</>}
                  </button>
                  <button onClick={downloadPDF} className="btn-ghost py-2 px-3 text-sm">
                    <Download size={14} /> PDF
                  </button>
                  <button onClick={saveAsNote} className="btn-primary py-2 px-3 text-sm"
                    style={savedNote ? { background: 'linear-gradient(135deg,#4ade80,#22c55e)', color: '#020817' } : {}}>
                    {savedNote ? <><Check size={14} /> Saved!</> : <><Save size={14} /> Save Note</>}
                  </button>
                </div>
              </div>
            </div>

            {/* YouTube embed */}
            {result.type === 'youtube' && result.videoId && (
              <div className="glass-card overflow-hidden">
                <div className="relative" style={{ paddingBottom: '56.25%' }}>
                  <iframe className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${result.videoId}?rel=0&modestbranding=1`}
                    title={result.title} frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                </div>
              </div>
            )}

            {/* Summary sections */}
            {sections.length > 0 ? (
              <div className="space-y-3">
                {sections.map((sec, i) => (
                  <div key={i} className="glass-card overflow-hidden">
                    <button className="w-full flex items-center justify-between p-5 text-left transition-colors"
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-dim)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      onClick={() => setExpandedSections(prev => ({ ...prev, [i]: !prev[i] }))}>
                      <h3 className="font-display font-bold" style={{ color: 'var(--accent-primary)' }}>{sec.title}</h3>
                      {expandedSections[i] ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                    </button>
                    {expandedSections[i] && (
                      <div className="px-5 pb-5 space-y-1">
                        {sec.content.map((line, j) => {
                          const isBullet = /^[-•*]\s/.test(line);
                          return isBullet ? (
                            <div key={j} className="flex items-start gap-2 py-0.5">
                              <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: 'var(--accent-primary)' }} />
                              <p className="text-sm font-body leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{line.replace(/^[-•*]\s/, '')}</p>
                            </div>
                          ) : (
                            <p key={j} className="text-sm font-body leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{line}</p>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card p-6">
                <p className="text-sm font-body leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{result.summary}</p>
              </div>
            )}

            <div className="text-center pt-2">
              <button onClick={() => { setResult(null); setFile(null); setUrl(''); setTextInput(''); setError(''); extractedTextRef.current = ''; setExtractedChars(0); }}
                className="btn-ghost text-sm px-6">↩ Summarize another</button>
            </div>
          </div>
        )}

        {/* Quick history strip at bottom when no result */}
        {!result && !loading && history.length > 0 && !showHistory && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-body flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                <Clock size={13} /> Recent summaries
              </p>
              <button onClick={() => setShowHistory(true)} className="text-xs font-body" style={{ color: 'var(--accent-primary)' }}>
                View all →
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {history.slice(0, 5).map(entry => {
                const meta = TYPE_META[entry.type] || TYPE_META.file;
                return (
                  <button key={entry.id} onClick={() => loadFromHistory(entry)}
                    className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all hover:translate-y-[-1px]"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', minWidth: '160px', maxWidth: '200px' }}>
                    {entry.thumbnail
                      ? <img src={entry.thumbnail} alt="" className="w-10 h-7 object-cover rounded flex-shrink-0" />
                      : <span className="text-base flex-shrink-0">{meta.icon}</span>
                    }
                    <div className="min-w-0">
                      <p className="text-xs font-body font-medium truncate" style={{ color: 'var(--text-primary)' }}>{entry.title}</p>
                      <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{formatDate(entry.savedAt)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}