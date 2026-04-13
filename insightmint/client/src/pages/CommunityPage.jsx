import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  Users, Plus, Search, Heart, MessageCircle, Eye,
  X, Send, Loader2, ChevronRight, Flame, Lightbulb,
  HelpCircle, MessageSquare, TrendingUp, Clock,
  ArrowLeft, Trash2, Filter
} from 'lucide-react';

const api = axios.create({ baseURL: 'https://insightmint-backend-3zax.onrender.com/api' });
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('insightmint_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

const TYPE_META = {
  question:   { icon: HelpCircle,    color: '#818cf8', bg: 'rgba(129,140,248,0.12)', label: 'Question' },
  discussion: { icon: MessageSquare, color: '#2dd4bf', bg: 'rgba(20,184,166,0.12)',  label: 'Discussion' },
  tip:        { icon: Lightbulb,     color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  label: 'Tip' },
};

const FILTERS = [
  { id: 'all',       label: 'All' },
  { id: 'question',  label: 'Questions' },
  { id: 'discussion',label: 'Discussions' },
  { id: 'tip',       label: 'Tips' },
];

const SORTS = [
  { id: 'latest',      label: 'Latest',       icon: Clock },
  { id: 'popular',     label: 'Popular',      icon: Flame },
  { id: 'most-replies',label: 'Most Replied', icon: MessageCircle },
];

const POPULAR_TAGS = ['React','Python','JavaScript','Machine Learning','SQL','Node.js','TypeScript','System Design','Docker'];

function formatTime(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
  return `${Math.floor(diff/1440)}d ago`;
}

function Avatar({ initial, size = 'md', color }) {
  const sz = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-10 h-10 text-base' : 'w-8 h-8 text-sm';
  const colors = ['#6366f1','#8b5cf6','#14b8a6','#f97316','#f59e0b','#ec4899','#06b6d4'];
  const bg = color || colors[initial?.charCodeAt(0) % colors.length] || '#6366f1';
  return (
    <div className={`${sz} rounded-full flex items-center justify-center font-display font-bold flex-shrink-0`}
         style={{ background: bg + '25', color: bg, border: `1.5px solid ${bg}40` }}>
      {initial}
    </div>
  );
}

export default function CommunityPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [posts, setPosts]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState('all');
  const [sort, setSort]             = useState('latest');
  const [search, setSearch]         = useState('');
  const [activePost, setActivePost] = useState(null);
  const [showNew, setShowNew]       = useState(false);
  const [replyText, setReplyText]   = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [newPost, setNewPost]       = useState({ title: '', content: '', type: 'discussion', tag: '' });
  const [posting, setPosting]       = useState(false);
  const [postError, setPostError]   = useState('');

  useEffect(() => { fetchPosts(); }, [filter, sort, search]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('type', filter);
      if (sort) params.set('sort', sort);
      if (search) params.set('search', search);
      const { data } = await api.get(`/community?${params}`);
      setPosts(data.posts);
    } catch { setPosts([]); }
    finally { setLoading(false); }
  };

  const openPost = async (id) => {
    try {
      const { data } = await api.get(`/community/${id}`);
      setActivePost(data);
    } catch {}
  };

  const handleLike = async (postId, e) => {
    e?.stopPropagation();
    if (!isAuthenticated) { navigate('/login'); return; }
    try {
      const { data } = await api.post(`/community/${postId}/like`);
      setPosts(ps => ps.map(p => p.id === postId ? { ...p, likes: data.likes } : p));
      if (activePost?.id === postId) setActivePost(prev => ({ ...prev, likes: data.likes }));
      setLikedPosts(prev => {
        const n = new Set(prev);
        data.liked ? n.add(postId) : n.delete(postId);
        return n;
      });
    } catch {}
  };

  const handleReply = async () => {
    if (!replyText.trim() || !activePost) return;
    if (!isAuthenticated) { navigate('/login'); return; }
    setSendingReply(true);
    try {
      const { data } = await api.post(`/community/${activePost.id}/reply`, {
        content: replyText, author: user?.name || user?.email?.split('@')[0] || 'anonymous'
      });
      setActivePost(prev => ({ ...prev, replies: [...(prev.replies || []), data] }));
      setPosts(ps => ps.map(p => p.id === activePost.id ? { ...p, replies: [...(p.replies || []), data] } : p));
      setReplyText('');
    } catch {}
    finally { setSendingReply(false); }
  };

  const handlePost = async () => {
    if (!newPost.title.trim()) { setPostError('Please enter a title.'); return; }
    if (!newPost.content.trim()) { setPostError('Please enter some content.'); return; }
    if (!isAuthenticated) { navigate('/login'); return; }
    setPosting(true);
    setPostError('');
    try {
      const { data } = await api.post('/community', {
        ...newPost,
        author: user?.name || user?.email?.split('@')[0] || 'User'
      });
      setPosts(prev => [data, ...prev]);
      setNewPost({ title: '', content: '', type: 'discussion', tag: '' });
      setShowNew(false);
    } catch (err) {
      console.error('Post error:', err);
      setPostError(err.response?.data?.error || 'Failed to post. Make sure the server is running.');
    } finally { setPosting(false); }
  };

  const handleDelete = async (postId) => {
    try {
      await api.delete(`/community/${postId}`);
      setPosts(ps => ps.filter(p => p.id !== postId));
      if (activePost?.id === postId) setActivePost(null);
    } catch {}
  };

  // ── POST DETAIL VIEW ────────────────────────────────
  if (activePost) {
    const meta = TYPE_META[activePost.type] || TYPE_META.discussion;
    const Icon = meta.icon;
    return (
      <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="page-top-accent" />
        <div className="max-w-3xl mx-auto">
          <button onClick={() => setActivePost(null)}
            className="flex items-center gap-2 mb-6 text-sm font-body transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
            <ArrowLeft size={15} /> Back to Community
          </button>

          {/* Post card */}
          <div className="glass-card p-6 mb-4 animate-fade-in">
            <div className="flex items-start gap-4">
              <Avatar initial={activePost.authorInitial} size="lg" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono"
                        style={{ background: meta.bg, color: meta.color }}>
                    <Icon size={11} /> {meta.label}
                  </span>
                  {activePost.tag && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono"
                          style={{ background: 'var(--accent-dim)', color: 'var(--accent-primary)', border: '1px solid var(--accent-border)' }}>
                      {activePost.tag}
                    </span>
                  )}
                </div>
                <h1 className="font-display font-bold text-xl mb-3" style={{ color: 'var(--text-primary)' }}>{activePost.title}</h1>
                <p className="font-body leading-relaxed whitespace-pre-wrap mb-4" style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>{activePost.content}</p>
                <div className="flex items-center gap-4 flex-wrap">
                  <button onClick={(e) => handleLike(activePost.id, e)}
                    className="flex items-center gap-1.5 text-sm font-body transition-all"
                    style={{ color: likedPosts.has(activePost.id) ? '#f87171' : 'var(--text-muted)' }}>
                    <Heart size={15} fill={likedPosts.has(activePost.id) ? 'currentColor' : 'none'} />
                    {activePost.likes}
                  </button>
                  <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
                    <Eye size={14} /> {activePost.views || 0} views
                  </span>
                  <span className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>
                    by <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>{activePost.author}</span>
                  </span>
                  <span className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>{formatTime(activePost.createdAt)}</span>
                  {user?.name === activePost.author && (
                    <button onClick={() => handleDelete(activePost.id)}
                      className="ml-auto flex items-center gap-1 text-xs"
                      style={{ color: '#f87171' }}>
                      <Trash2 size={12} /> Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Replies */}
          <div className="glass-card p-6 mb-4">
            <h2 className="font-display font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <MessageCircle size={16} style={{ color: 'var(--accent-primary)' }} />
              {activePost.replies?.length || 0} {activePost.replies?.length === 1 ? 'Reply' : 'Replies'}
            </h2>

            {(!activePost.replies || activePost.replies.length === 0) ? (
              <p className="text-sm font-body text-center py-6" style={{ color: 'var(--text-muted)' }}>
                No replies yet. Be the first to respond!
              </p>
            ) : (
              <div className="space-y-4">
                {activePost.replies.map(reply => (
                  <div key={reply.id} className="flex gap-3 p-4 rounded-xl animate-fade-in"
                       style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                    <Avatar initial={reply.authorInitial} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-body font-semibold" style={{ color: 'var(--text-primary)' }}>{reply.author}</span>
                        <span className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>{formatTime(reply.createdAt)}</span>
                      </div>
                      <p className="text-sm font-body leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{reply.content}</p>
                      <button className="flex items-center gap-1 mt-2 text-xs transition-all"
                              style={{ color: 'var(--text-muted)' }}>
                        <Heart size={11} /> {reply.likes}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reply box */}
            {isAuthenticated ? (
              <div className="mt-4 flex gap-3 items-end">
                <Avatar initial={user?.name?.[0]?.toUpperCase()} size="sm" />
                <div className="flex-1">
                  <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
                    placeholder="Write a helpful reply..."
                    rows={3} className="input-field resize-none text-sm"
                    style={{ fontFamily: 'DM Sans, sans-serif', lineHeight: '1.6' }} />
                  <button onClick={handleReply} disabled={sendingReply || !replyText.trim()}
                    className="btn-primary mt-2 px-5 py-2 text-sm disabled:opacity-40">
                    {sendingReply ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    {sendingReply ? 'Posting...' : 'Post Reply'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 text-center p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                <p className="text-sm font-body mb-2" style={{ color: 'var(--text-muted)' }}>Sign in to reply</p>
                <button onClick={() => navigate('/login')} className="btn-primary text-sm px-5 py-2">Sign in</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN LIST VIEW ──────────────────────────────────
  return (
    <div className="min-h-screen pt-0 pb-16">

      {/* Header */}
      <div className="pt-20 pb-8 px-4" style={{ background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)', borderBottom: '1px solid var(--border-default)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                   style={{ background: 'rgba(129,140,248,0.15)', border: '1px solid rgba(129,140,248,0.25)' }}>
                <Users size={20} style={{ color: '#818cf8' }} />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Community</h1>
                <p className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>Ask questions, share notes, and learn together</p>
              </div>
            </div>
            <button onClick={() => { if (!isAuthenticated) { navigate('/login'); return; } setShowNew(!showNew); }}
              className="btn-primary px-5 py-2.5 text-sm"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              {showNew ? <><X size={15} /> Cancel</> : <><Plus size={15} /> New Post</>}
            </button>
          </div>

          {/* New post form */}
          {showNew && (
            <div className="glass-card p-5 mb-5 animate-fade-in" style={{ border: '1.5px solid rgba(99,102,241,0.35)' }}>
              <h3 className="font-display font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Create a Post</h3>
              <div className="space-y-3">
                {/* Type selector */}
                <div className="flex gap-2">
                  {Object.entries(TYPE_META).map(([type, meta]) => {
                    const Icon = meta.icon;
                    return (
                      <button key={type} onClick={() => setNewPost(p => ({ ...p, type }))}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-body capitalize transition-all"
                        style={{
                          background: newPost.type === type ? meta.bg : 'var(--bg-card)',
                          border: `1.5px solid ${newPost.type === type ? meta.color + '50' : 'var(--border-default)'}`,
                          color: newPost.type === type ? meta.color : 'var(--text-muted)',
                          fontWeight: newPost.type === type ? '600' : '400'
                        }}>
                        <Icon size={12} /> {meta.label}
                      </button>
                    );
                  })}
                </div>
                <input type="text" value={newPost.title} onChange={e => setNewPost(p => ({ ...p, title: e.target.value }))}
                  placeholder="Title — what's your question or topic?" className="input-field" />
                <textarea value={newPost.content} onChange={e => setNewPost(p => ({ ...p, content: e.target.value }))}
                  placeholder="Share more details, code snippets, or resources..."
                  rows={4} className="input-field resize-none"
                  style={{ fontFamily: 'DM Sans, sans-serif', lineHeight: '1.6' }} />
                <div className="flex gap-3 items-center flex-wrap">
                  <input type="text" value={newPost.tag} onChange={e => setNewPost(p => ({ ...p, tag: e.target.value }))}
                    placeholder="Tag (e.g. React, Python...)" className="input-field text-sm" style={{ maxWidth: '200px' }} />
                  <div className="flex gap-1.5 flex-wrap">
                    {POPULAR_TAGS.slice(0, 5).map(t => (
                      <button key={t} onClick={() => setNewPost(p => ({ ...p, tag: t }))}
                        className="px-2 py-1 rounded-lg text-xs font-body transition-all"
                        style={{ background: newPost.tag === t ? 'var(--accent-dim)' : 'var(--bg-card)', border: `1px solid ${newPost.tag === t ? 'var(--accent-border)' : 'var(--border-default)'}`, color: newPost.tag === t ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                {postError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl text-sm animate-fade-in"
                       style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }}>
                    <X size={13} /> {postError}
                  </div>
                )}
                <button onClick={handlePost} disabled={posting}
                  className="btn-primary px-6 py-2.5 text-sm disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                  {posting ? <><Loader2 size={14} className="animate-spin" /> Posting...</> : <><Send size={14} /> Post</>}
                </button>
              </div>
            </div>
          )}

          {/* Search + filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl max-w-md"
                 style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)' }}>
              <Search size={16} style={{ color: 'var(--text-muted)' }} />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search posts..." className="flex-1 bg-transparent outline-none font-body text-sm"
                style={{ color: 'var(--text-primary)' }} />
              {search && <button onClick={() => setSearch('')}><X size={13} style={{ color: 'var(--text-muted)' }} /></button>}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1.5 flex-wrap">
              {FILTERS.map(f => (
                <button key={f.id} onClick={() => setFilter(f.id)}
                  className="px-4 py-2 rounded-xl text-sm font-body transition-all"
                  style={{
                    background: filter === f.id ? 'rgba(129,140,248,0.15)' : 'var(--bg-card)',
                    border: `1.5px solid ${filter === f.id ? 'rgba(129,140,248,0.40)' : 'var(--border-default)'}`,
                    color: filter === f.id ? '#818cf8' : 'var(--text-muted)',
                    fontWeight: filter === f.id ? '600' : '400'
                  }}>{f.label}</button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div className="flex gap-2 mt-3">
            {SORTS.map(s => {
              const Icon = s.icon;
              return (
                <button key={s.id} onClick={() => setSort(s.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body transition-all"
                  style={{
                    background: sort === s.id ? 'var(--accent-dim)' : 'transparent',
                    color: sort === s.id ? 'var(--accent-primary)' : 'var(--text-muted)',
                    fontWeight: sort === s.id ? '600' : '400'
                  }}>
                  <Icon size={12} /> {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Posts list */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full animate-spin" style={{ border: '2px solid var(--border-default)', borderTopColor: '#818cf8' }} />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <Users size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
            <h3 className="font-display font-semibold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>No posts found</h3>
            <p className="font-body text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              {search ? 'Try a different search term' : 'Be the first to post!'}
            </p>
            <button onClick={() => { if (!isAuthenticated) { navigate('/login'); return; } setShowNew(true); window.scrollTo(0,0); }}
              className="btn-primary text-sm" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              <Plus size={14} /> Create Post
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map(post => {
              const meta = TYPE_META[post.type] || TYPE_META.discussion;
              const Icon = meta.icon;
              return (
                <div key={post.id} onClick={() => openPost(post.id)}
                  className="w-full glass-card p-5 text-left hover:translate-y-[-1px] transition-all duration-200 group cursor-pointer"
                  style={{ borderLeft: `3px solid ${meta.color}40` }}
                  onMouseEnter={e => e.currentTarget.style.borderLeftColor = meta.color}
                  onMouseLeave={e => e.currentTarget.style.borderLeftColor = meta.color + '40'}>
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                         style={{ background: meta.bg }}>
                      <Icon size={16} style={{ color: meta.color }} />
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <h3 className="font-display font-semibold text-base group-hover:text-mint-400 transition-colors"
                            style={{ color: 'var(--text-primary)' }}>{post.title}</h3>
                        {post.tag && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-mono flex-shrink-0"
                                style={{ background: 'var(--accent-dim)', color: 'var(--accent-primary)', border: '1px solid var(--accent-border)' }}>
                            {post.tag}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-body line-clamp-2 mb-3" style={{ color: 'var(--text-muted)' }}>{post.content}</p>
                      <div className="flex items-center gap-4 flex-wrap">
                        <button onClick={(e) => handleLike(post.id, e)}
                          className="flex items-center gap-1.5 text-sm font-body transition-all hover:scale-110"
                          style={{ color: likedPosts.has(post.id) ? '#f87171' : 'var(--text-muted)' }}>
                          <Heart size={13} fill={likedPosts.has(post.id) ? 'currentColor' : 'none'} /> {post.likes}
                        </button>
                        <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
                          <MessageCircle size={13} /> {post.replies?.length || 0} {post.replies?.length === 1 ? 'reply' : 'replies'}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                          <Eye size={11} /> {post.views || 0}
                        </span>
                        <span className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>
                          by <span style={{ color: 'var(--text-secondary)' }}>{post.author}</span>
                        </span>
                        <span className="text-xs font-body ml-auto" style={{ color: 'var(--text-muted)' }}>{formatTime(post.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Popular tags */}
        {!search && posts.length > 0 && (
          <div className="mt-8 glass-card p-5">
            <h3 className="font-display font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <TrendingUp size={15} style={{ color: 'var(--accent-primary)' }} /> Popular Topics
            </h3>
            <div className="flex flex-wrap gap-2">
              {POPULAR_TAGS.map(tag => (
                <button key={tag} onClick={() => setSearch(tag)}
                  className="px-3 py-1.5 rounded-full text-sm font-body transition-all hover:scale-105"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}
                  onMouseEnter={e => { e.target.style.color='var(--accent-primary)'; e.target.style.borderColor='var(--accent-border)'; }}
                  onMouseLeave={e => { e.target.style.color='var(--text-muted)'; e.target.style.borderColor='var(--border-default)'; }}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}