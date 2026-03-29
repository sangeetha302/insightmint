import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import {
  FileText, Plus, Search, Trash2, Edit3, X, Save,
  Tag, Clock, AlertCircle, Upload, File, FileImage,
  CheckCircle2, Loader2, Download, Eye, Brain, Sparkles,
  ChevronDown, ChevronUp, Wand2, RefreshCw
} from 'lucide-react';

const TYPE_STYLES = {
  custom:        { bg: 'rgba(139,92,246,0.12)', color: '#a78bfa', border: 'rgba(139,92,246,0.25)' },
  summary:       { bg: 'rgba(245,158,11,0.12)',  color: '#fbbf24', border: 'rgba(245,158,11,0.25)' },
  'ai generated':{ bg: 'rgba(20,184,166,0.12)',  color: '#2dd4bf', border: 'rgba(20,184,166,0.25)' },
  uploaded:      { bg: 'rgba(99,102,241,0.12)',  color: '#818cf8', border: 'rgba(99,102,241,0.25)' },
};

const FILE_ICONS = {
  'application/pdf': { icon: '📄', color: '#f87171' },
  'text/plain':      { icon: '📝', color: '#60a5fa' },
  'image/png':       { icon: '🖼️', color: '#34d399' },
  'image/jpeg':      { icon: '🖼️', color: '#34d399' },
  'image/jpg':       { icon: '🖼️', color: '#34d399' },
  'application/msword': { icon: '📘', color: '#60a5fa' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: '📘', color: '#60a5fa' },
  default:           { icon: '📎', color: '#a78bfa' },
};

const ACCEPTED = '.pdf,.txt,.png,.jpg,.jpeg,.doc,.docx,.md';
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('insightmint_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Store uploaded files in memory (base64)
const fileStore = {};

export default function NotesPage() {
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);

  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editNote, setEditNote] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', topic: '', type: 'custom' });
  const [activeFilter, setActiveFilter] = useState('all');
  const [dragOver, setDragOver] = useState(false);

  // Note Improver state
  const [improving, setImproving]       = useState(false);
  const [improveStyle, setImproveStyle] = useState('structured');
  const [improveError, setImproveError] = useState('');
  const [originalContent, setOriginalContent] = useState('');

  // Card-level Note Improver state
  const [improvingCardId, setImprovingCardId] = useState(null);
  const [cardImproveStyle, setCardImproveStyle] = useState({});  // {noteId: style}
  const [showImproveCard, setShowImproveCard] = useState({});    // {noteId: bool}

  // NLP Analysis state
  const [analyzingId, setAnalyzingId]   = useState(null);
  const [analysisResults, setAnalysisResults] = useState({}); // { noteId: results }
  const [showAnalysis, setShowAnalysis] = useState({});
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [previewNote, setPreviewNote] = useState(null);

  useEffect(() => {
    if (isAuthenticated) fetchNotes();
  }, [isAuthenticated]);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/notes');
      setNotes(data.notes);
    } catch { setNotes([]); }
    finally { setLoading(false); }
  };

  // ── Drag & Drop ──────────────────────────────────────────
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const prevent = (e) => e.preventDefault();
    el.addEventListener('dragover', prevent);
    el.addEventListener('drop', prevent);
    return () => { el.removeEventListener('dragover', prevent); el.removeEventListener('drop', prevent); };
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    addFilesToQueue(files);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    addFilesToQueue(files);
    e.target.value = '';
  };

  const addFilesToQueue = (files) => {
    const valid = files.filter(f => {
      if (f.size > MAX_SIZE) { alert(`${f.name} is too large. Max 5MB.`); return false; }
      return true;
    });
    const queued = valid.map(f => ({
      file: f,
      id: Date.now() + Math.random(),
      name: f.name,
      size: f.size,
      type: f.type,
      status: 'pending', // pending | uploading | done | error
      topic: '',
    }));
    setUploadFiles(prev => [...prev, ...queued]);
    if (!uploadModalOpen) setUploadModalOpen(true);
  };

  const removeFromQueue = (id) => setUploadFiles(prev => prev.filter(f => f.id !== id));

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const readFileAsBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const readFileAsText = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });

  const uploadAllFiles = async () => {
    setUploading(true);
    const updated = [...uploadFiles];

    for (let i = 0; i < updated.length; i++) {
      if (updated[i].status !== 'pending') continue;
      updated[i].status = 'uploading';
      setUploadFiles([...updated]);

      try {
        const { file } = updated[i];
        let content = '';

        // For text/md files, read as text
        if (file.type === 'text/plain' || file.name.endsWith('.md')) {
          content = await readFileAsText(file);
        } else {
          content = `[File: ${file.name}] - ${formatSize(file.size)}`;
        }

        // Store base64 for preview/download
        const b64 = await readFileAsBase64(file);
        const noteId = Date.now().toString() + i;
        fileStore[noteId] = { data: b64, name: file.name, type: file.type };

        const noteData = {
          title: file.name.replace(/\.[^/.]+$/, ''),
          content: content.slice(0, 500) + (content.length > 500 ? '...' : ''),
          topic: updated[i].topic || '',
          type: 'uploaded',
          fileName: file.name,
          fileSize: formatSize(file.size),
          fileType: file.type,
          fileStoreId: noteId,
        };

        const { data } = await api.post('/notes', noteData);
        fileStore[data.note.id] = { data: b64, name: file.name, type: file.type };
        setNotes(ns => [data.note, ...ns]);
        updated[i].status = 'done';
      } catch {
        updated[i].status = 'error';
      }
      setUploadFiles([...updated]);
    }

    setUploading(false);
    setTimeout(() => {
      setUploadModalOpen(false);
      setUploadFiles([]);
    }, 1200);
  };

  const downloadFile = (note) => {
    const stored = fileStore[note.id];
    if (!stored) return;
    const a = document.createElement('a');
    a.href = stored.data;
    a.download = stored.name;
    a.click();
  };

  // ── CRUD ─────────────────────────────────────────────────
  const openCreate = () => {
    setEditNote(null);
    setForm({ title: '', content: '', topic: '', type: 'custom' });
    setModalOpen(true);
  };

  const openEdit = (note) => {
    if (note.type === 'uploaded') { setPreviewNote(note); return; }
    setEditNote(note);
    setForm({ title: note.title, content: note.content, topic: note.topic, type: note.type });
    setModalOpen(true);
  };

  const saveNote = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editNote) {
        const { data } = await api.put(`/notes/${editNote.id}`, form);
        setNotes(ns => ns.map(n => n.id === editNote.id ? data.note : n));
      } else {
        const { data } = await api.post('/notes', form);
        setNotes(ns => [data.note, ...ns]);
      }
      setModalOpen(false);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const deleteNote = async (id) => {
    try {
      await api.delete(`/notes/${id}`);
      setNotes(ns => ns.filter(n => n.id !== id));
      delete fileStore[id];
      setDeleteId(null);
    } catch (e) { console.error(e); }
  };

  const filtered = notes.filter(n => {
    const q = search.toLowerCase();
    const matchSearch = n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || (n.topic || '').toLowerCase().includes(q);
    const matchFilter = activeFilter === 'all' || n.type === activeFilter;
    return matchSearch && matchFilter;
  });

  const formatDate = (d) => {
    const diff = Math.floor((Date.now() - new Date(d)) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  const filters = ['all', 'custom', 'summary', 'ai generated', 'uploaded'];
  const counts = {
    all: notes.length,
    custom: notes.filter(n => n.type === 'custom').length,
    summary: notes.filter(n => n.type === 'summary').length,
    'ai generated': notes.filter(n => n.type === 'ai generated').length,
    uploaded: notes.filter(n => n.type === 'uploaded').length,
  };

  const getFileInfo = (type) => FILE_ICONS[type] || FILE_ICONS.default;

  // ── AI Note Improver ─────────────────────────────────────
  const improveNote = async () => {
    if (!form.content.trim() || form.content.trim().split(' ').length < 5) {
      setImproveError('Please write at least a few words first.'); return;
    }
    setImproving(true); setImproveError('');
    // Save original before improving
    if (!originalContent) setOriginalContent(form.content);
    try {
      const { data } = await api.post('/ai/improve-note', {
        content: form.content,
        title: form.title || 'Notes',
        style: improveStyle,
        language: 'en'
      });
      if (data.improved) {
        setForm(f => ({ ...f, content: data.improved, type: 'ai generated' }));
      }
    } catch (err) {
      setImproveError(err.response?.data?.error || 'Failed to improve. Check server is running.');
    } finally { setImproving(false); }
  };

  const undoImprove = () => {
    if (originalContent) {
      setForm(f => ({ ...f, content: originalContent }));
      setOriginalContent('');
    }
  };

  // Improve note directly from card (works for all types)
  const improveNoteCard = async (note, e) => {
    e.stopPropagation();
    if (!note.content || note.content.trim().split(' ').filter(Boolean).length < 5) {
      alert('This note needs at least 5 words to improve.'); return;
    }
    const style = cardImproveStyle[note.id] || 'structured';
    setImprovingCardId(note.id);
    try {
      const { data } = await api.post('/ai/improve-note', {
        content: note.content,
        title: note.title,
        style,
        language: 'en'
      });
      if (data.improved) {
        // Update note in server + state
        const { data: updated } = await api.put(`/notes/${note.id}`, {
          title: note.title,
          content: data.improved,
          topic: note.topic,
          type: 'ai generated'
        });
        setNotes(ns => ns.map(n => n.id === note.id ? updated.note : n));
        setShowImproveCard(prev => ({ ...prev, [note.id]: false }));
      }
    } catch (err) {
      console.error('Card improve error:', err);
      alert(err.response?.data?.error || 'Failed to improve. Check server is running.');
    } finally { setImprovingCardId(null); }
  };

  // Analyze note — generate Summary + Key Points using Groq AI
  const analyzeNote = async (note, e) => {
    e.stopPropagation();
    const wordCount = note.content?.trim().split(' ').filter(Boolean).length || 0;
    if (wordCount < 5) return;

    // Toggle if already analyzed
    if (analysisResults[note.id]) {
      setShowAnalysis(prev => ({ ...prev, [note.id]: !prev[note.id] }));
      return;
    }

    setAnalyzingId(note.id);
    try {
      const { data } = await api.post('/ai/summary', {
        topic: note.topic || note.title,
        title: note.title,
        language: 'en',
        customPrompt: `Analyze these student notes and provide: 1) A 1-2 sentence summary 2) Up to 5 key points. Notes content: "${note.content.slice(0, 2000)}"`
      });

      const summary = data.summary || '';
      const keyPoints = data.keyPoints || [];

      setAnalysisResults(prev => ({
        ...prev,
        [note.id]: {
          summary: summary.slice(0, 250),
          keyPoints: keyPoints.slice(0, 5),
          model: 'Groq LLaMA 3.1'
        }
      }));
      setShowAnalysis(prev => ({ ...prev, [note.id]: true }));
    } catch (err) {
      console.error('Analyze error:', err.response?.data || err.message);
      // Show error in results so user knows what happened
      setAnalysisResults(prev => ({
        ...prev,
        [note.id]: {
          summary: 'Could not analyze — make sure the server is running.',
          keyPoints: [],
          model: 'error'
        }
      }));
      setShowAnalysis(prev => ({ ...prev, [note.id]: true }));
    }
    finally { setAnalyzingId(null); }
  };

  return (
    <div className="min-h-screen pb-16">
      <div className="page-top-accent" />

      {/* ── Header Banner ── */}
      <div className="pt-20 pb-10 px-4 mesh-bg" style={{ borderBottom: '1px solid var(--border-default)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}>
                <FileText size={20} style={{ color: '#a78bfa' }} />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>My Notes</h1>
                <p className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>{notes.length} notes saved</p>
              </div>
            </div>
            <div className="flex gap-2">
              {/* Upload button */}
              <button onClick={() => fileInputRef.current?.click()}
                className="btn-ghost py-2.5 px-4 text-sm"
                style={{ color: '#818cf8', borderColor: 'rgba(99,102,241,0.30)' }}>
                <Upload size={15} /> Upload File
              </button>
              <input ref={fileInputRef} type="file" multiple accept={ACCEPTED} className="hidden" onChange={handleFileSelect} />
              <button onClick={openCreate} className="btn-primary px-5 py-2.5 text-sm">
                <Plus size={16} /> New Note
              </button>
            </div>
          </div>

          {/* Search + Drop zone hint */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl max-w-lg"
                 style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)' }}>
              <Search size={16} style={{ color: 'var(--text-muted)' }} />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search notes..." className="flex-1 bg-transparent outline-none font-body text-sm"
                style={{ color: 'var(--text-primary)' }} />
              {search && <button onClick={() => setSearch('')}><X size={14} style={{ color: 'var(--text-muted)' }} /></button>}
            </div>
            <div className="flex items-center gap-2 text-xs font-body px-3" style={{ color: 'var(--text-muted)' }}>
              <Upload size={12} />
              <span>Drop files anywhere to upload · PDF, TXT, DOC, IMG (max 5MB)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="max-w-6xl mx-auto px-4 py-8" ref={dropRef}
           onDragOver={e => { e.preventDefault(); setDragOver(true); }}
           onDragLeave={() => setDragOver(false)}
           onDrop={handleDrop}>

        {/* Drag overlay */}
        {dragOver && (
          <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(20,184,166,0.10)', backdropFilter: 'blur(4px)', border: '3px dashed var(--accent-primary)' }}>
            <div className="text-center">
              <div className="text-6xl mb-4">📂</div>
              <h2 className="font-display text-2xl font-bold" style={{ color: 'var(--accent-primary)' }}>Drop to upload</h2>
              <p className="font-body mt-2" style={{ color: 'var(--text-muted)' }}>Release to add files to your notes</p>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {filters.map(f => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className="px-4 py-1.5 rounded-full text-sm font-body transition-all capitalize flex items-center gap-2"
              style={{
                background: activeFilter === f ? 'var(--accent-primary)' : 'var(--bg-card)',
                color: activeFilter === f ? '#020817' : 'var(--text-muted)',
                border: `1px solid ${activeFilter === f ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                fontWeight: activeFilter === f ? '600' : '400'
              }}>
              {f}
              <span className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{ background: activeFilter === f ? 'rgba(0,0,0,0.2)' : 'var(--accent-dim)', color: activeFilter === f ? '#fff' : 'var(--accent-primary)' }}>
                {counts[f]}
              </span>
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full animate-spin" style={{ border: '2px solid var(--border-default)', borderTopColor: 'var(--accent-primary)' }} />
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}>
              <FileText size={28} style={{ color: 'var(--accent-primary)' }} />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
              {search ? 'No notes found' : 'No notes yet'}
            </h3>
            <p className="font-body text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              {search ? 'Try a different search term' : 'Create a note or upload a file to get started'}
            </p>
            {!search && (
              <div className="flex gap-3 justify-center">
                <button onClick={openCreate} className="btn-primary text-sm"><Plus size={14} /> New Note</button>
                <button onClick={() => fileInputRef.current?.click()} className="btn-ghost text-sm"><Upload size={14} /> Upload File</button>
              </div>
            )}
          </div>
        )}

        {/* Notes grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(note => {
              const style = TYPE_STYLES[note.type] || TYPE_STYLES.custom;
              const isUploaded = note.type === 'uploaded';
              const fileInfo = isUploaded ? getFileInfo(note.fileType) : null;

              return (
                <div key={note.id}
                     className="glass-card p-5 flex flex-col gap-3 group hover:translate-y-[-2px] transition-all duration-200 cursor-pointer"
                     onClick={() => openEdit(note)}>

                  {/* Type badge + actions */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-2.5 py-1 rounded-full font-mono capitalize"
                          style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}>
                      {note.type}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isUploaded && fileStore[note.id] && (
                        <button onClick={e => { e.stopPropagation(); downloadFile(note); }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                          style={{ color: '#60a5fa', background: 'rgba(96,165,250,0.10)' }}>
                          <Download size={13} />
                        </button>
                      )}
                      {note.content && note.content.trim().split(' ').filter(Boolean).length >= 5 && (
                        <button onClick={e => analyzeNote(note, e)}
                          title="Summarize with AI"
                          className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
                          style={{
                            color: analyzingId === note.id ? 'var(--accent-primary)' : analysisResults[note.id] ? 'var(--accent-primary)' : 'var(--text-muted)',
                            background: analysisResults[note.id] ? 'var(--accent-dim)' : 'var(--bg-card)',
                            border: analysisResults[note.id] ? '1px solid var(--accent-border)' : 'none'
                          }}>
                          {analyzingId === note.id ? <Loader2 size={13} className="animate-spin" /> : <Brain size={13} />}
                        </button>
                      )}
                      {note.content && note.content.trim().split(' ').filter(Boolean).length >= 5 && (
                        <button onClick={e => { e.stopPropagation(); setShowImproveCard(prev => ({ ...prev, [note.id]: !prev[note.id] })); }}
                          title="Improve with AI"
                          className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
                          style={{
                            color: showImproveCard[note.id] ? '#a78bfa' : 'var(--text-muted)',
                            background: showImproveCard[note.id] ? 'rgba(139,92,246,0.15)' : 'var(--bg-card)',
                            border: showImproveCard[note.id] ? '1px solid rgba(139,92,246,0.30)' : 'none'
                          }}>
                          {improvingCardId === note.id ? <Loader2 size={13} className="animate-spin" style={{ color: '#a78bfa' }} /> : <Wand2 size={13} />}
                        </button>
                      )}
                      <button onClick={e => { e.stopPropagation(); setDeleteId(note.id); }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg"
                        style={{ color: '#f87171', background: 'rgba(248,113,113,0.10)' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* File icon for uploads */}
                  {isUploaded && fileInfo && (
                    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--accent-dim)', border: '1px solid var(--border-default)' }}>
                      <span className="text-2xl">{fileInfo.icon}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-mono truncate" style={{ color: 'var(--text-primary)' }}>{note.fileName}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{note.fileSize}</p>
                      </div>
                    </div>
                  )}

                  {/* Title */}
                  <div>
                    <h3 className="font-display font-semibold text-base leading-snug mb-1" style={{ color: 'var(--text-primary)' }}>{note.title}</h3>
                    {note.topic && <span className="text-xs font-body" style={{ color: 'var(--accent-primary)' }}>{note.topic}</span>}
                  </div>

                  {/* Content preview */}
                  {note.content && (
                    <p className="text-sm font-body leading-relaxed line-clamp-3" style={{ color: 'var(--text-secondary)' }}>
                      {note.content}
                    </p>
                  )}

                  {/* Footer */}
                  <div className="flex items-center gap-2 mt-auto pt-2" style={{ borderTop: '1px solid var(--border-default)' }}>
                    <Clock size={11} style={{ color: 'var(--text-muted)' }} />
                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{formatDate(note.updatedAt)}</span>
                    {isUploaded
                      ? <Eye size={11} className="ml-auto opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: 'var(--accent-primary)' }} />
                      : <Edit3 size={11} className="ml-auto opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: 'var(--accent-primary)' }} />
                    }
                  </div>

                  {/* ── AI Note Improver Panel on card ── */}
                  {showImproveCard[note.id] && (
                    <div className="mt-1 animate-fade-in rounded-xl p-3 space-y-2"
                         style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.22)' }}
                         onClick={e => e.stopPropagation()}>
                      <p className="text-xs font-mono font-bold flex items-center gap-1" style={{ color: '#a78bfa' }}>
                        <Wand2 size={10} /> Improve Style
                      </p>
                      <div className="flex gap-1 flex-wrap">
                        {[
                          { id: 'structured', label: '📋' },
                          { id: 'concise',    label: '⚡' },
                          { id: 'detailed',   label: '🔬' },
                          { id: 'exam',       label: '🎯' },
                        ].map(s => (
                          <button key={s.id}
                            onClick={() => setCardImproveStyle(prev => ({ ...prev, [note.id]: s.id }))}
                            className="px-2 py-1 rounded-lg text-xs transition-all"
                            style={{
                              background: (cardImproveStyle[note.id] || 'structured') === s.id ? 'rgba(139,92,246,0.25)' : 'var(--bg-card)',
                              border: `1px solid ${(cardImproveStyle[note.id] || 'structured') === s.id ? 'rgba(139,92,246,0.45)' : 'var(--border-default)'}`,
                              color: (cardImproveStyle[note.id] || 'structured') === s.id ? '#a78bfa' : 'var(--text-muted)',
                            }}>
                            {s.label} {s.id.charAt(0).toUpperCase() + s.id.slice(1)}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={e => improveNoteCard(note, e)}
                        disabled={improvingCardId === note.id}
                        className="w-full py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                        style={{ background: 'linear-gradient(135deg,#7c3aed,#a78bfa)', color: '#fff' }}>
                        {improvingCardId === note.id
                          ? <><Loader2 size={11} className="animate-spin" /> Improving...</>
                          : <><Wand2 size={11} /> Improve Note</>}
                      </button>
                    </div>
                  )}

                  {/* AI Summary + Key Points panel */}
                  {showAnalysis[note.id] && analysisResults[note.id] && (
                    <div className="mt-2 pt-3 animate-fade-in" style={{ borderTop: '1px solid rgba(20,184,166,0.20)' }}
                         onClick={e => e.stopPropagation()}>
                      <p className="text-xs font-mono flex items-center gap-1 mb-2" style={{ color: 'var(--accent-primary)' }}>
                        <Sparkles size={10} /> AI Summary
                        {analysisResults[note.id].model && (
                          <span className="ml-1 opacity-60">{analysisResults[note.id].model.includes('BART') ? '· BART NLP' : '· Groq LLM'}</span>
                        )}
                      </p>
                      {analysisResults[note.id].summary && (
                        <p className="text-xs font-body leading-relaxed mb-2"
                           style={{ color: 'var(--text-secondary)', background: 'var(--accent-dim)', borderRadius: '8px', padding: '8px 10px', border: '1px solid var(--accent-border)' }}>
                          {analysisResults[note.id].summary}
                        </p>
                      )}
                      {analysisResults[note.id].keyPoints?.length > 0 && (
                        <ul className="space-y-1">
                          {analysisResults[note.id].keyPoints.map((pt, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs font-body" style={{ color: 'var(--text-muted)' }}>
                              <span className="flex-shrink-0 mt-0.5" style={{ color: 'var(--accent-primary)' }}>•</span>
                              {pt}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add new card */}
            <button onClick={openCreate}
              className="glass-card p-5 flex flex-col items-center justify-center gap-3 hover:translate-y-[-2px] transition-all duration-200 min-h-[180px]"
              style={{ border: '2px dashed var(--border-medium)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}>
                <Plus size={20} style={{ color: 'var(--accent-primary)' }} />
              </div>
              <span className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>Add new note</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Upload Queue Modal ── */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
             style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 animate-slide-up"
               style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)' }}>

            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Upload Files</h2>
                <p className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>{uploadFiles.length} file{uploadFiles.length !== 1 ? 's' : ''} ready</p>
              </div>
              <button onClick={() => { setUploadModalOpen(false); setUploadFiles([]); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg"
                style={{ color: 'var(--text-muted)', background: 'var(--bg-card)' }}>
                <X size={16} />
              </button>
            </div>

            {/* Drop zone inside modal */}
            <div className="mb-4 rounded-xl p-6 text-center cursor-pointer transition-all"
                 style={{ border: '2px dashed var(--border-medium)', background: 'var(--bg-card)' }}
                 onClick={() => fileInputRef.current?.click()}
                 onDragOver={e => e.preventDefault()}
                 onDrop={e => { e.preventDefault(); addFilesToQueue(Array.from(e.dataTransfer.files)); }}>
              <Upload size={24} className="mx-auto mb-2" style={{ color: 'var(--accent-primary)' }} />
              <p className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>
                <span style={{ color: 'var(--accent-primary)', fontWeight: '600' }}>Click to add more files</span> or drag & drop
              </p>
              <p className="text-xs font-mono mt-1" style={{ color: 'var(--text-muted)' }}>PDF, TXT, DOC, DOCX, PNG, JPG, MD · Max 5MB</p>
            </div>

            {/* File list */}
            <div className="space-y-2 mb-5 max-h-60 overflow-y-auto">
              {uploadFiles.map(f => {
                const info = getFileInfo(f.type);
                return (
                  <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl"
                       style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                    <span className="text-xl flex-shrink-0">{info.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-body font-medium truncate" style={{ color: 'var(--text-primary)' }}>{f.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{formatSize(f.size)}</span>
                        <input type="text" placeholder="Add topic..." value={f.topic}
                          onChange={e => setUploadFiles(prev => prev.map(pf => pf.id === f.id ? { ...pf, topic: e.target.value } : pf))}
                          className="text-xs px-2 py-0.5 rounded-lg flex-1 outline-none font-body"
                          style={{ background: 'var(--bg-input)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }} />
                      </div>
                    </div>
                    {/* Status */}
                    <div className="flex-shrink-0">
                      {f.status === 'pending' && (
                        <button onClick={() => removeFromQueue(f.id)} className="w-6 h-6 flex items-center justify-center rounded-full" style={{ color: 'var(--text-muted)', background: 'var(--border-default)' }}>
                          <X size={12} />
                        </button>
                      )}
                      {f.status === 'uploading' && <Loader2 size={18} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />}
                      {f.status === 'done' && <CheckCircle2 size={18} style={{ color: '#4ade80' }} />}
                      {f.status === 'error' && <X size={18} style={{ color: '#f87171' }} />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={() => { setUploadModalOpen(false); setUploadFiles([]); }} className="btn-ghost flex-1 justify-center text-sm py-2.5">
                Cancel
              </button>
              <button onClick={uploadAllFiles}
                disabled={uploading || uploadFiles.length === 0 || uploadFiles.every(f => f.status !== 'pending')}
                className="btn-primary flex-1 justify-center text-sm py-2.5 disabled:opacity-50 disabled:cursor-not-allowed">
                {uploading ? <><Loader2 size={14} className="animate-spin" /> Uploading...</> : <><Upload size={14} /> Upload {uploadFiles.filter(f => f.status === 'pending').length} File{uploadFiles.filter(f => f.status === 'pending').length !== 1 ? 's' : ''}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create/Edit Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6 animate-slide-up"
               style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                {editNote ? 'Edit Note' : 'New Note'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ color: 'var(--text-muted)', background: 'var(--bg-card)' }}>
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Type */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Type</label>
                <div className="flex gap-2 flex-wrap">
                  {['custom', 'summary', 'ai generated'].map(type => {
                    const s = TYPE_STYLES[type];
                    return (
                      <button key={type} onClick={() => setForm(f => ({ ...f, type }))}
                        className="px-3 py-1.5 rounded-lg text-xs font-mono capitalize transition-all"
                        style={{ background: form.type === type ? s.bg : 'var(--bg-card)', color: form.type === type ? s.color : 'var(--text-muted)', border: `1px solid ${form.type === type ? s.border : 'var(--border-default)'}`, fontWeight: form.type === type ? '600' : '400' }}>
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Title *</label>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Note title..." className="input-field" autoFocus />
              </div>

              {/* Topic */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                  <span className="flex items-center gap-1"><Tag size={10} /> Topic (optional)</span>
                </label>
                <input type="text" value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                  placeholder="e.g. Python, React, Machine Learning..." className="input-field" />
              </div>

              {/* Content */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Content</label>
                <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Write your notes here..." rows={8}
                  className="input-field resize-none"
                  style={{ fontFamily: 'DM Sans, sans-serif', lineHeight: '1.6' }} />
              </div>

              {/* ── AI Note Improver ── */}
              {form.content.trim().split(' ').filter(Boolean).length >= 5 && (
                <div className="rounded-xl p-3 space-y-2" style={{ background: 'rgba(139,92,246,0.06)', border: '1.5px solid rgba(139,92,246,0.20)' }}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="text-xs font-mono font-bold flex items-center gap-1.5" style={{ color: '#a78bfa' }}>
                      <Wand2 size={11} /> AI Note Improver
                    </p>
                    {originalContent && (
                      <button onClick={undoImprove} className="text-xs font-body flex items-center gap-1 transition-all"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => e.currentTarget.style.color='#a78bfa'}
                        onMouseLeave={e => e.currentTarget.style.color='var(--text-muted)'}>
                        <RefreshCw size={10} /> Undo
                      </button>
                    )}
                  </div>
                  {/* Style selector */}
                  <div className="flex gap-1.5 flex-wrap">
                    {[
                      { id: 'structured', label: '📋 Structured' },
                      { id: 'concise',    label: '⚡ Concise' },
                      { id: 'detailed',   label: '🔬 Detailed' },
                      { id: 'exam',       label: '🎯 Exam Ready' },
                    ].map(s => (
                      <button key={s.id} onClick={() => setImproveStyle(s.id)}
                        className="px-2.5 py-1 rounded-lg text-xs font-body transition-all"
                        style={{
                          background: improveStyle === s.id ? 'rgba(139,92,246,0.20)' : 'var(--bg-card)',
                          border: `1px solid ${improveStyle === s.id ? 'rgba(139,92,246,0.40)' : 'var(--border-default)'}`,
                          color: improveStyle === s.id ? '#a78bfa' : 'var(--text-muted)',
                          fontWeight: improveStyle === s.id ? '600' : '400'
                        }}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                  {improveError && (
                    <p className="text-xs" style={{ color: '#f87171' }}>{improveError}</p>
                  )}
                  <button onClick={improveNote} disabled={improving}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#a78bfa)', color: '#fff' }}>
                    {improving
                      ? <><Loader2 size={13} className="animate-spin" /> Improving your notes...</>
                      : <><Wand2 size={13} /> Improve with AI</>}
                  </button>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => { setModalOpen(false); setOriginalContent(''); setImproveError(''); }} className="btn-ghost flex-1 justify-center text-sm py-2.5">Cancel</button>
                <button onClick={saveNote} disabled={saving || !form.title.trim()} className="btn-primary flex-1 justify-center text-sm py-2.5 disabled:opacity-50">
                  {saving ? 'Saving...' : <><Save size={14} /> {editNote ? 'Update' : 'Save Note'}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── File Preview Modal ── */}
      {previewNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6 animate-slide-up"
               style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getFileInfo(previewNote.fileType).icon}</span>
                <div>
                  <h2 className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>{previewNote.title}</h2>
                  <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{previewNote.fileName} · {previewNote.fileSize}</p>
                </div>
              </div>
              <button onClick={() => setPreviewNote(null)} className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ color: 'var(--text-muted)', background: 'var(--bg-card)' }}>
                <X size={16} />
              </button>
            </div>

            {previewNote.topic && (
              <div className="mb-4">
                <span className="tag">{previewNote.topic}</span>
              </div>
            )}

            {/* Image preview */}
            {fileStore[previewNote.id] && (previewNote.fileType?.startsWith('image/')) && (
              <img src={fileStore[previewNote.id].data} alt={previewNote.title} className="w-full rounded-xl mb-4 object-contain max-h-72" />
            )}

            {/* Text preview */}
            {previewNote.content && (
              <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                <p className="text-sm font-body leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{previewNote.content}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setPreviewNote(null)} className="btn-ghost flex-1 justify-center text-sm py-2.5">Close</button>
              {fileStore[previewNote.id] && (
                <button onClick={() => downloadFile(previewNote)} className="btn-primary flex-1 justify-center text-sm py-2.5">
                  <Download size={14} /> Download
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 animate-slide-up"
               style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.25)' }}>
                <AlertCircle size={20} style={{ color: '#f87171' }} />
              </div>
              <div>
                <h3 className="font-display font-semibold" style={{ color: 'var(--text-primary)' }}>Delete Note?</h3>
                <p className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="btn-ghost flex-1 justify-center text-sm py-2.5">Cancel</button>
              <button onClick={() => deleteNote(deleteId)}
                className="flex-1 py-2.5 rounded-xl text-sm font-body font-semibold flex items-center justify-center gap-2 transition-all"
                style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.30)' }}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}