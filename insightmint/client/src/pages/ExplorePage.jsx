import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Play, Clock, Eye, Loader2, Sparkles, TrendingUp, ExternalLink, History, BookOpen, ChevronRight } from 'lucide-react';
import { searchVideos } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const api = axios.create({ baseURL: 'https://insightmint-backend-3zax.onrender.com/api' });

const SUGGESTIONS = [
  { label: 'Machine Learning', emoji: '🤖' },
  { label: 'React',            emoji: '⚛️' },
  { label: 'Python',           emoji: '🐍' },
  { label: 'JavaScript',       emoji: '💛' },
  { label: 'Data Science',     emoji: '📊' },
  { label: 'TypeScript',       emoji: '🔷' },
  { label: 'Node.js',          emoji: '🟢' },
  { label: 'System Design',    emoji: '🏗️' },
  { label: 'Docker',           emoji: '🐳' },
  { label: 'SQL',              emoji: '🗄️' },
  { label: 'Deep Learning',    emoji: '🧠' },
  { label: 'Rust',             emoji: '🦀' },
];

const SOURCE_FILTERS = [
  { id: 'all',         label: 'All Sources',     icon: '🌐' },
  { id: 'youtube',     label: 'YouTube',          icon: '▶️' },
  { id: 'archive',     label: 'Internet Archive', icon: '🏛️' },
  { id: 'dailymotion', label: 'Dailymotion',      icon: '📺' },
];

const SOURCE_COLORS = {
  youtube:     { bg: 'rgba(248,113,113,0.10)', color: '#f87171', border: 'rgba(248,113,113,0.25)' },
  archive:     { bg: 'rgba(96,165,250,0.10)',  color: '#60a5fa', border: 'rgba(96,165,250,0.25)' },
  dailymotion: { bg: 'rgba(251,191,36,0.10)',  color: '#fbbf24', border: 'rgba(251,191,36,0.25)' },
  vimeo:       { bg: 'rgba(139,92,246,0.10)',  color: '#a78bfa', border: 'rgba(139,92,246,0.25)' },
};

// Floating orbs for background
function BackgroundOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Large orbs */}
      <div className="absolute rounded-full"
           style={{ width: '500px', height: '500px', top: '-100px', left: '-150px',
             background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      <div className="absolute rounded-full"
           style={{ width: '400px', height: '400px', top: '-50px', right: '-100px',
             background: 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      <div className="absolute rounded-full"
           style={{ width: '300px', height: '300px', bottom: '0', left: '50%',
             background: 'radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 70%)', filter: 'blur(40px)' }} />

      {/* Grid pattern */}
      <div className="absolute inset-0" style={{
        backgroundImage: `linear-gradient(rgba(99,102,241,0.05) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(99,102,241,0.05) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }} />

      {/* Floating dots */}
      {[
        { top: '15%', left: '8%',  size: 6,  color: '#6366f1', delay: '0s' },
        { top: '25%', right: '12%', size: 4, color: '#8b5cf6', delay: '0.5s' },
        { top: '60%', left: '5%',  size: 5,  color: '#22d3ee', delay: '1s' },
        { top: '40%', right: '8%', size: 3,  color: '#a78bfa', delay: '1.5s' },
        { top: '75%', left: '15%', size: 4,  color: '#6366f1', delay: '0.8s' },
        { top: '20%', left: '45%', size: 3,  color: '#c084fc', delay: '0.3s' },
      ].map((dot, i) => (
        <div key={i} className="absolute rounded-full animate-pulse"
             style={{
               top: dot.top, left: dot.left, right: dot.right,
               width: dot.size, height: dot.size,
               background: dot.color, opacity: 0.5,
               animationDelay: dot.delay,
             }} />
      ))}
    </div>
  );
}

export default function ExplorePage() {
  const [searchParams] = useSearchParams();
  const initialTopic = searchParams.get('topic') || '';
  const [query, setQuery]               = useState(initialTopic);
  const [videos, setVideos]             = useState([]);
  const [allVideos, setAllVideos]       = useState([]);
  const [loading, setLoading]           = useState(false);
  const [searched, setSearched]         = useState(false);
  const [currentTopic, setCurrentTopic] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [sourceCounts, setSourceCounts] = useState({});
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [watchHistory, setWatchHistory] = useState([]);

  // Load watch history from DB
  useEffect(() => {
    if (!isAuthenticated) return;
    const token = localStorage.getItem('insightmint_token');
    fetch('/api/user/history', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => setWatchHistory(d.history || []))
      .catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => { if (initialTopic) doSearch(initialTopic); }, [initialTopic]);

  useEffect(() => {
    if (sourceFilter === 'all') setVideos(allVideos);
    else setVideos(allVideos.filter(v => v.source === sourceFilter));
  }, [sourceFilter, allVideos]);

  const doSearch = async (topic) => {
    if (!topic.trim()) return;
    setLoading(true); setSearched(true); setCurrentTopic(topic); setSourceFilter('all');
    try {
      const { data } = await api.get(`/videos/search?topic=${encodeURIComponent(topic)}&source=all`);
      setAllVideos(data.videos || []);
      setVideos(data.videos || []);
      setSourceCounts(data.sources || {});
    } catch {
      try {
        const { data } = await searchVideos(topic);
        setAllVideos(data.videos || []);
        setVideos(data.videos || []);
      } catch {}
    }
    finally { setLoading(false); }
  };

  const handleVideoClick = (video) => {
    if (video.source === 'archive' || video.source === 'dailymotion' || video.source === 'vimeo') {
      navigate(`/learn/${encodeURIComponent(video.id)}?topic=${encodeURIComponent(currentTopic)}&title=${encodeURIComponent(video.title)}&embedUrl=${encodeURIComponent(video.embedUrl || video.url)}&source=${video.source}`);
    } else {
      navigate(`/learn/${video.id}?topic=${encodeURIComponent(currentTopic)}&title=${encodeURIComponent(video.title)}`);
    }
  };

  return (
    <div className="min-h-screen pb-16" style={{ background: 'var(--bg-primary)' }}>

      {/* ── Hero Section with background ── */}
      <div className="relative pt-24 pb-14 px-4 overflow-hidden"
           style={{ background: 'linear-gradient(180deg, rgba(99,102,241,0.06) 0%, transparent 100%)',
                    borderBottom: '1px solid var(--border-default)' }}>
        <BackgroundOrbs />

        <div className="relative max-w-5xl mx-auto text-center z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono mb-5"
               style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8' }}>
            <Sparkles size={12} /> Multi-platform educational search
          </div>

          {/* Title */}
          <h1 className="font-display text-5xl font-bold mb-3 leading-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Explore <span style={{ background: 'linear-gradient(135deg,#818cf8,#c084fc,#22d3ee)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>anything</span>
          </h1>
          <p className="font-body text-lg mb-6 max-w-lg mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Discover Videos from Top Platforms with a Single Search
          </p>

          {/* Platform pills */}
          <div className="flex items-center justify-center gap-2 flex-wrap mb-8">
            {[
              { icon: '▶️', label: 'Explore',          color: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.30)', text: '#f87171' },
              { icon: '🏛️', label: 'Learn', color: 'rgba(96,165,250,0.15)',  border: 'rgba(96,165,250,0.30)',  text: '#60a5fa' },
              { icon: '📺', label: 'Grow',       color: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.30)', text: '#fbbf24' },
            ].map(p => (
              <span key={p.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body font-medium"
                    style={{ background: p.color, border: `1px solid ${p.border}`, color: p.text }}>
                {p.icon} {p.label}
              </span>
            ))}
          </div>

          {/* Search bar */}
          <form onSubmit={e => { e.preventDefault(); doSearch(query); }} className="max-w-2xl mx-auto">
            <div className="flex gap-2 p-2 rounded-2xl shadow-xl"
                 style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border-medium)',
                          boxShadow: '0 8px 32px rgba(99,102,241,0.15)' }}>
              <div className="flex-1 flex items-center gap-3 px-3">
                <Search size={18} style={{ color: 'var(--accent-primary)' }} />
                <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="Search any topic — Python, ML, React..." autoFocus
                  className="flex-1 bg-transparent outline-none font-body text-base"
                  style={{ color: 'var(--text-primary)' }} />
              </div>
              <button type="submit" disabled={loading} className="btn-primary rounded-xl px-6 py-2.5 text-sm">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <><Search size={14} /> Search</>}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-8">

        {/* Popular topics — only when not searched */}
        {!searched && (
          <div className="animate-fade-in">
            <p className="text-sm font-body mb-4 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <TrendingUp size={14} /> Trending topics
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {SUGGESTIONS.map((s, i) => (
                <button key={s.label}
                  onClick={() => { setQuery(s.label); doSearch(s.label); }}
                  className="glass-card p-3 flex items-center gap-3 text-left hover:translate-y-[-2px] transition-all duration-200 group"
                  style={{ animationDelay: `${i * 0.05}s` }}>
                  <span className="text-xl flex-shrink-0">{s.emoji}</span>
                  <span className="font-body text-sm font-medium transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                        onMouseEnter={e => e.target.style.color = 'var(--accent-primary)'}
                        onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}>
                    {s.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Stats bar */}
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Topics Available', value: '500+', color: '#818cf8' },
                { label: 'Video Sources',    value: '3',    color: '#34d399' },
                { label: 'AI-Enhanced',      value: '100%', color: '#fbbf24' },
              ].map(stat => (
                <div key={stat.label} className="glass-card p-4 text-center">
                  <p className="font-display font-bold text-2xl mb-1" style={{ color: stat.color }}>{stat.value}</p>
                  <p className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
                </div>
              ))}
            </div>

            {/* ── Continue Your Journey ── */}
            {watchHistory.length > 0 && (
              <div className="mt-10 animate-fade-in">
                {/* Section header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                         style={{ background: 'rgba(99,102,241,0.15)' }}>
                      <History size={15} style={{ color: '#818cf8' }} />
                    </div>
                    <div>
                      <h2 className="font-display font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                        Continue Your Journey
                      </h2>
                      <p className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>
                        Pick up where you left off
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono px-2.5 py-1 rounded-full"
                        style={{ background: 'rgba(99,102,241,0.10)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.20)' }}>
                    {watchHistory.length} videos
                  </span>
                </div>

                {/* Video cards — horizontal scroll on mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {watchHistory.slice(0, 6).map((item, i) => {
                    const thumb = item.thumbnail ||
                      (item.source === 'youtube' || !item.source
                        ? `https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`
                        : null);
                    const srcColor = SOURCE_COLORS[item.source || 'youtube'] || SOURCE_COLORS.youtube;

                    return (
                      <button key={item.videoId + i}
                        onClick={() => {
                          if (item.source && item.source !== 'youtube') {
                            navigate(`/learn/${encodeURIComponent(item.videoId)}?topic=${encodeURIComponent(item.topic)}&title=${encodeURIComponent(item.videoTitle)}&embedUrl=${encodeURIComponent(item.embedUrl || '')}&source=${item.source}`);
                          } else {
                            navigate(`/learn/${item.videoId}?topic=${encodeURIComponent(item.topic)}&title=${encodeURIComponent(item.videoTitle)}`);
                          }
                        }}
                        className="glass-card p-3 flex gap-3 text-left hover:translate-y-[-2px] transition-all duration-200 group w-full"
                        style={{ borderLeft: `3px solid ${srcColor.color}40` }}
                        onMouseEnter={e => e.currentTarget.style.borderLeftColor = srcColor.color}
                        onMouseLeave={e => e.currentTarget.style.borderLeftColor = srcColor.color + '40'}>

                        {/* Thumbnail */}
                        <div className="relative flex-shrink-0 rounded-xl overflow-hidden"
                             style={{ width: '80px', height: '56px', background: 'var(--bg-tertiary)' }}>
                          {thumb
                            ? <img src={thumb} alt={item.videoTitle}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={e => e.target.style.display = 'none'} />
                            : <div className="w-full h-full flex items-center justify-center text-lg">🎬</div>}
                          {/* Play overlay */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                               style={{ background: 'rgba(0,0,0,0.3)' }}>
                            <Play size={14} className="text-white" fill="currentColor" />
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-body font-medium text-xs line-clamp-2 mb-1 leading-snug"
                             style={{ color: 'var(--text-primary)' }}>
                            {item.videoTitle}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono px-1.5 py-0.5 rounded-md"
                                  style={{ background: srcColor.bg, color: srcColor.color, border: `1px solid ${srcColor.border}` }}>
                              {item.source === 'archive' ? '🏛️' : item.source === 'dailymotion' ? '📺' : '▶️'}
                            </span>
                            <span className="text-xs font-body truncate" style={{ color: 'var(--text-muted)' }}>
                              {item.topic}
                            </span>
                          </div>
                          {item.completedAt && (
                            <p className="text-xs font-body mt-1" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                              {new Date(item.completedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>

                        <ChevronRight size={14} className="flex-shrink-0 self-center opacity-0 group-hover:opacity-60 transition-opacity"
                                      style={{ color: 'var(--accent-primary)' }} />
                      </button>
                    );
                  })}
                </div>

                {/* Show all button if more than 6 */}
                {watchHistory.length > 6 && (
                  <button onClick={() => setWatchHistory(h => h.length > 6 ? h : watchHistory)}
                    className="mt-3 w-full py-2.5 rounded-xl text-sm font-body transition-all flex items-center justify-center gap-2"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-primary)'; e.currentTarget.style.borderColor = 'var(--accent-border)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-default)'; }}>
                    <BookOpen size={14} /> View all {watchHistory.length} watched videos
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center"
                 style={{ background: 'var(--accent-dim)', border: '2px solid var(--accent-border)' }}>
              <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
            </div>
            <p className="font-display font-semibold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>
              Searching across all platforms...
            </p>
            <p className="font-body text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Finding the best <span style={{ color: 'var(--accent-primary)' }}>"{currentTopic}"</span> videos for you
            </p>
            <div className="flex justify-center gap-3 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              {['▶️ YouTube', '🏛️ Archive.org', '📺 Dailymotion'].map((p, i) => (
                <span key={p} className="flex items-center gap-1 animate-pulse"
                      style={{ animationDelay: `${i * 0.3}s` }}>{p}</span>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {!loading && allVideos.length > 0 && (
          <div className="animate-fade-in">
            {/* Results header */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <h2 className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  Results for <span style={{ color: 'var(--accent-primary)' }}>"{currentTopic}"</span>
                </h2>
                <p className="text-sm font-body mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {allVideos.length} videos from {Object.values(sourceCounts).filter(v => v > 0).length} platforms
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-mono" style={{ color: 'var(--accent-primary)', opacity: 0.8 }}>
                <Sparkles size={13} /> AI notes on every video
              </div>
            </div>

            {/* Source filter tabs */}
            <div className="flex gap-2 mb-5 flex-wrap">
              {SOURCE_FILTERS.map(f => {
                const count = f.id === 'all' ? allVideos.length : (sourceCounts[f.id] || 0);
                if (count === 0 && f.id !== 'all') return null;
                return (
                  <button key={f.id} onClick={() => setSourceFilter(f.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-body transition-all"
                    style={{
                      background: sourceFilter === f.id ? 'var(--accent-dim)' : 'var(--bg-card)',
                      border: `1.5px solid ${sourceFilter === f.id ? 'var(--accent-border)' : 'var(--border-default)'}`,
                      color: sourceFilter === f.id ? 'var(--accent-primary)' : 'var(--text-muted)',
                      fontWeight: sourceFilter === f.id ? '600' : '400'
                    }}>
                    {f.icon} {f.label}
                    <span className="text-xs px-1.5 py-0.5 rounded-full ml-1 font-mono"
                          style={{ background: sourceFilter === f.id ? 'var(--accent-primary)' : 'var(--border-default)', color: sourceFilter === f.id ? '#fff' : 'var(--text-muted)' }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Video grid */}
            {videos.length === 0 ? (
              <div className="glass-card p-10 text-center">
                <p style={{ color: 'var(--text-muted)' }}>No results from this platform. Try another source.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {videos.map((video, i) => {
                  const srcStyle = SOURCE_COLORS[video.source] || SOURCE_COLORS.youtube;
                  return (
                    <button key={video.id} onClick={() => handleVideoClick(video)}
                      className="glass-card p-4 flex gap-4 text-left hover:translate-y-[-2px] transition-all duration-200 group w-full"
                      style={{ animationDelay: `${i * 0.04}s` }}>

                      {/* Thumbnail */}
                      <div className="relative flex-shrink-0 w-44 h-26 rounded-xl overflow-hidden"
                           style={{ background: 'var(--bg-tertiary)', minHeight: '96px' }}>
                        {video.thumbnail ? (
                          <img src={video.thumbnail} alt={video.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={e => { e.target.style.display='none'; }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl"
                               style={{ background: srcStyle.bg }}>{video.sourceIcon || '🎬'}</div>
                        )}
                        {/* Play overlay */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                             style={{ background: 'rgba(0,0,0,0.25)' }}>
                          <div className="w-10 h-10 rounded-full flex items-center justify-center"
                               style={{ background: 'rgba(99,102,241,0.90)' }}>
                            <Play size={16} className="text-white ml-0.5" fill="currentColor" />
                          </div>
                        </div>
                        {/* Rank badge */}
                        <div className="absolute top-2 left-2 text-white text-xs px-2 py-0.5 rounded-full font-mono font-bold"
                             style={{ background: 'rgba(6,8,15,0.80)' }}>#{i+1}</div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-xs px-2 py-0.5 rounded-full font-mono"
                                style={{ background: srcStyle.bg, color: srcStyle.color, border: `1px solid ${srcStyle.border}` }}>
                            {video.sourceIcon} {video.sourceLabel || video.source}
                          </span>
                          {video.year && <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{video.year}</span>}
                        </div>
                        <h3 className="font-display font-semibold line-clamp-2 mb-1.5 leading-snug"
                            style={{ color: 'var(--text-primary)', fontSize: '15px' }}>{video.title}</h3>
                        <p className="text-sm font-body mb-2" style={{ color: 'var(--text-secondary)' }}>{video.channel}</p>
                        {video.description && (
                          <p className="text-xs font-body line-clamp-1 mb-2" style={{ color: 'var(--text-muted)' }}>{video.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                          {video.duration && video.duration !== 'N/A' && (
                            <span className="flex items-center gap-1"><Clock size={11} />{video.duration}</span>
                          )}
                          {video.views && video.views !== 'N/A' && (
                            <span className="flex items-center gap-1"><Eye size={11} />{video.views}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center self-center flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                        {video.source !== 'youtube'
                          ? <ExternalLink size={16} />
                          : <Play size={18} fill="currentColor" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}