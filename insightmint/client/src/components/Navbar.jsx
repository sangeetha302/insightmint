import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Search, User, LogOut, Menu, X, Sparkles, Sun, Moon,
  Globe, ChevronDown, FileText, Zap, Map, Brain, Settings,
  Users, TrendingUp, LayoutGrid, BookOpen, MessageSquare, Target
} from 'lucide-react';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { language, setLanguage, currentLang, languages, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen]   = useState(false);
  const [langOpen, setLangOpen]   = useState(false);
  const [moreOpen, setMoreOpen]   = useState(false);
  const langRef = useRef(null);
  const moreRef = useRef(null);

  const isActive = (path) => location.pathname === path;
  const handleLogout = () => { logout(); navigate('/'); };

  useEffect(() => {
    const handler = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Primary nav — always visible on desktop
  const primaryLinks = [
    { to: '/explore',   label: 'Explore',    icon: Search },
    { to: '/summarize', label: 'Summarizer', icon: Zap },
    { to: '/roadmap',   label: 'Roadmap',    icon: Map,      auth: true },
    { to: '/quiz',      label: 'Quiz',       icon: Brain,    auth: true },
    { to: '/dashboard',       label: 'Dashboard',        icon: LayoutGrid,   auth: true },
  ];

  // Secondary — in "More" dropdown
  const moreLinks = [
    { to: '/notes',           label: 'Notes',            icon: FileText,     auth: true },
    { to: '/recommend',       label: "What's Next",      icon: TrendingUp },
    { to: '/learning-style',  label: 'Learning Style',   icon: Brain },
    { to: '/evaluate',        label: 'Answer Evaluator', icon: Target },
    { to: '/study-rooms', label: 'Study Rooms', icon: Users },
    { to: '/community', label: 'Community',  icon: Users },
    { to: '/feedback',        label: 'Feedback',         icon: MessageSquare },
    
  ];

  const dropdownStyle = {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-medium)',
    borderRadius: '14px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl"
         style={{ background: 'var(--nav-bg)', borderBottom: '1px solid var(--nav-border)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-15" style={{ height: '60px' }}>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg"
                 style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              <Sparkles size={15} className="text-white" />
            </div>
            <span className="font-display font-bold text-base tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Insight<span style={{ background: 'linear-gradient(135deg,#818cf8,#c084fc)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Mint</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {primaryLinks.map(link => {
              if (link.auth && !isAuthenticated) return null;
              const Icon = link.icon;
              const active = isActive(link.to);
              return (
                <Link key={link.to} to={link.to}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                  style={{
                    color: active ? 'var(--accent-light)' : 'var(--text-secondary)',
                    background: active ? 'var(--accent-dim)' : 'transparent',
                    fontFamily: 'Inter, sans-serif',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-card)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                  <Icon size={14} />
                  {link.label}
                </Link>
              );
            })}

            {/* More dropdown */}
            <div className="relative" ref={moreRef}>
              <button onClick={() => setMoreOpen(!moreOpen)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  color: moreLinks.some(l => isActive(l.to)) ? 'var(--accent-light)' : 'var(--text-secondary)',
                  background: moreLinks.some(l => isActive(l.to)) ? 'var(--accent-dim)' : 'transparent',
                  fontFamily: 'Inter, sans-serif',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card)'}
                onMouseLeave={e => { if (!moreOpen && !moreLinks.some(l => isActive(l.to))) e.currentTarget.style.background = 'transparent'; }}>
                More
                <ChevronDown size={13} className={`transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
              </button>

              {moreOpen && (
                <div className="absolute top-full left-0 mt-2 w-44 overflow-hidden z-50" style={dropdownStyle}>
                  {moreLinks.map(link => {
                    if (link.auth && !isAuthenticated) return null;
                    const Icon = link.icon;
                    const active = isActive(link.to);
                    return (
                      <Link key={link.to} to={link.to}
                        onClick={() => setMoreOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm transition-all"
                        style={{
                          color: active ? 'var(--accent-light)' : 'var(--text-secondary)',
                          background: active ? 'var(--accent-dim)' : 'transparent',
                          fontFamily: 'Inter, sans-serif',
                        }}
                        onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--accent-dim)'; }}
                        onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                        <Icon size={14} /> {link.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-2">

            {/* Language */}
            <div className="relative" ref={langRef}>
              <button onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', color: 'var(--accent-light)' }}>
                <Globe size={13} />
                {currentLang.flag} {currentLang.native}
                <ChevronDown size={11} className={`transition-transform ${langOpen ? 'rotate-180' : ''}`} />
              </button>
              {langOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 overflow-hidden z-50" style={dropdownStyle}>
                  {languages.map(lang => (
                    <button key={lang.code} onClick={() => { setLanguage(lang.code); setLangOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-all"
                      style={{ background: language === lang.code ? 'var(--accent-dim)' : 'transparent', color: language === lang.code ? 'var(--accent-light)' : 'var(--text-secondary)' }}
                      onMouseEnter={e => { if (language !== lang.code) e.currentTarget.style.background = 'var(--bg-card)'; }}
                      onMouseLeave={e => { if (language !== lang.code) e.currentTarget.style.background = 'transparent'; }}>
                      <span>{lang.flag}</span>
                      <span>{lang.native}</span>
                      {language === lang.code && <span className="ml-auto text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Theme toggle */}
            <button onClick={toggleTheme}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
              style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', color: 'var(--accent-light)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--accent-dim)'}>
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {/* User */}
            {isAuthenticated ? (
              <div className="flex items-center gap-1.5">
                <button onClick={() => navigate('/profile')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all"
                  style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.20)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--accent-dim)'}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                       style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                    {user?.name?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>
                    {user?.name?.split(' ')[0]}
                  </span>
                </button>
                <button onClick={handleLogout}
                  className="w-9 h-9 flex items-center justify-center rounded-xl transition-all"
                  style={{ color: 'var(--text-muted)', background: 'transparent', border: '1px solid var(--border-default)' }}
                  onMouseEnter={e => { e.currentTarget.style.color='#f87171'; e.currentTarget.style.borderColor='rgba(248,113,113,0.30)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color='var(--text-muted)'; e.currentTarget.style.borderColor='var(--border-default)'; }}>
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="px-3 py-2 text-sm font-medium transition-all rounded-xl"
                  style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
                  Sign in
                </Link>
                <Link to="/signup" className="btn-primary py-2 px-4 text-sm">
                  Get started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile toggle */}
          <button className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl"
                  style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
                  onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden px-4 pb-4 pt-2"
             style={{ background: 'var(--mobile-menu-bg)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--nav-border)' }}>
          <div className="space-y-0.5 mb-3">
            {[...primaryLinks, ...moreLinks].map(link => {
              if (link.auth && !isAuthenticated) return null;
              const Icon = link.icon;
              const active = isActive(link.to);
              return (
                <Link key={link.to} to={link.to}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{ color: active ? 'var(--accent-light)' : 'var(--text-secondary)', background: active ? 'var(--accent-dim)' : 'transparent' }}
                  onClick={() => setMenuOpen(false)}>
                  <Icon size={15} /> {link.label}
                </Link>
              );
            })}
          </div>

          {/* Mobile language grid */}
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {languages.map(lang => (
              <button key={lang.code} onClick={() => { setLanguage(lang.code); setMenuOpen(false); }}
                className="flex flex-col items-center gap-0.5 p-2 rounded-xl text-xs transition-all"
                style={{ background: language === lang.code ? 'var(--accent-dim)' : 'var(--bg-card)', border: `1px solid ${language === lang.code ? 'var(--accent-border)' : 'var(--border-default)'}`, color: language === lang.code ? 'var(--accent-light)' : 'var(--text-muted)' }}>
                <span className="text-lg">{lang.flag}</span>
                <span>{lang.native}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid var(--border-default)' }}>
            <button onClick={toggleTheme}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
              {isDark ? 'Light' : 'Dark'}
            </button>
            {isAuthenticated ? (
              <button onClick={() => { handleLogout(); setMenuOpen(false); }}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm"
                style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }}>
                <LogOut size={14} /> Sign out
              </button>
            ) : (
              <Link to="/login" onClick={() => setMenuOpen(false)}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm"
                style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', color: 'var(--accent-light)' }}>
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}