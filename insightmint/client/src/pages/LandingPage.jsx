import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, TrendingUp, ChevronRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const TRENDING_TOPICS = [
  { name: 'Machine Learning', icon: '🤖', learners: '124K' },
  { name: 'React', icon: '⚛️', learners: '89K' },
  { name: 'Python', icon: '🐍', learners: '201K' },
  { name: 'Data Science', icon: '📊', learners: '78K' },
  { name: 'JavaScript', icon: '⚡', learners: '165K' },
  { name: 'System Design', icon: '🏗️', learners: '52K' },
  { name: 'Blockchain', icon: '🔗', learners: '43K' },
  { name: 'TypeScript', icon: '💙', learners: '67K' },
];

export default function LandingPage() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(`/explore?topic=${encodeURIComponent(query.trim())}`);
  };

  const features = [
    { icon: '🎬', title: t.feat1Title, desc: t.feat1Desc },
    { icon: '🧠', title: t.feat2Title, desc: t.feat2Desc },
    { icon: '🗺️', title: t.feat3Title, desc: t.feat3Desc },
    { icon: '💬', title: t.feat4Title, desc: t.feat4Desc },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero with video bg */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" style={{ zIndex: 0 }}>
          <source src="/hero-bg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0" style={{ zIndex: 1, background: 'linear-gradient(to bottom, rgba(2,8,23,0.72) 0%, rgba(2,8,23,0.55) 50%, rgba(2,8,23,0.85) 100%)' }} />
        <div className="absolute inset-0 opacity-[0.04]" style={{ zIndex: 2, backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="relative max-w-4xl mx-auto px-4 text-center pt-24 pb-16" style={{ zIndex: 3 }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-mono mb-8 animate-fade-in"
               style={{ background: 'rgba(20,184,166,0.18)', border: '1px solid rgba(20,184,166,0.35)', color: '#2dd4bf' }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#2dd4bf' }} />
            {t.badge}
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.05] mb-6 animate-slide-up"
              style={{ color: '#ffffff', textShadow: '0 2px 20px rgba(0,0,0,0.4)' }}>
            {t.heroTitle1}<br />
            <span className="gradient-text">{t.heroTitle2}</span>
          </h1>

          <p className="text-xl font-body font-light max-w-2xl mx-auto mb-12 leading-relaxed animate-fade-in"
             style={{ color: 'rgba(255,255,255,0.75)', textShadow: '0 1px 8px rgba(0,0,0,0.3)' }}>
            {t.heroDesc}
          </p>

          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-6">
            <div className="flex gap-2 p-2 rounded-2xl"
                 style={{ background: 'rgba(2,8,23,0.55)', border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(16px)' }}>
              <div className="flex-1 flex items-center gap-3 px-3">
                <Search size={18} style={{ color: 'rgba(255,255,255,0.45)' }} className="flex-shrink-0" />
                <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="flex-1 bg-transparent outline-none font-body text-base"
                  style={{ color: '#ffffff' }} />
              </div>
              <button type="submit" className="btn-primary rounded-xl px-6 py-3 text-sm flex-shrink-0">
                {t.exploreBtn} <ArrowRight size={14} />
              </button>
            </div>
          </form>

          <p className="text-sm font-body" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {t.tryLabel}{' '}
            {['Machine Learning', 'React', 'System Design'].map((topic, i) => (
              <span key={topic}>
                <button onClick={() => setQuery(topic)} className="transition-colors hover:underline" style={{ color: '#2dd4bf' }}>{topic}</button>
                {i < 2 && <span style={{ color: 'rgba(255,255,255,0.3)' }}> · </span>}
              </span>
            ))}
          </p>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce">
            <div className="w-5 h-8 rounded-full border-2 flex items-start justify-center pt-1.5" style={{ borderColor: 'rgba(255,255,255,0.25)' }}>
              <div className="w-1 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.50)' }} />
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-6" style={{ borderTop: '1px solid var(--border-default)', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-card)' }}>
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[{ n: '500+', l: t.topicsCovered }, { n: '2M+', l: t.videosCurated }, { n: '50K+', l: t.learnersDaily }, { n: '98%', l: t.satisfaction }].map(s => (
            <div key={s.l} className="text-center">
              <div className="font-display text-2xl font-bold" style={{ color: 'var(--accent-primary)' }}>{s.n}</div>
              <div className="text-sm font-body mt-1" style={{ color: 'var(--text-muted)' }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="section-title mb-3">{t.featuresTitle}</h2>
            <p className="font-body" style={{ color: 'var(--text-muted)' }}>{t.featuresSubtitle}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((f, i) => (
              <div key={i} className="glass-card p-6 hover:translate-y-[-2px] transition-all duration-300">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-display font-semibold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>{f.title}</h3>
                <p className="text-sm font-body leading-relaxed" style={{ color: 'var(--text-primary)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trending */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <TrendingUp size={20} style={{ color: 'var(--accent-primary)' }} />
              <h2 className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{t.trendingTitle}</h2>
            </div>
            <button onClick={() => navigate('/explore')} className="text-sm flex items-center gap-1 hover:gap-2 transition-all" style={{ color: 'var(--accent-primary)' }}>
              {t.viewAll} <ChevronRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {TRENDING_TOPICS.map(topic => (
              <button key={topic.name} onClick={() => navigate(`/explore?topic=${encodeURIComponent(topic.name)}`)}
                      className="glass-card p-4 text-left hover:scale-105 transition-all duration-200">
                <div className="text-2xl mb-2">{topic.icon}</div>
                <div className="font-display font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{topic.name}</div>
                <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{topic.learners} {t.learners}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="glass-card p-12 relative overflow-hidden">
            <div className="absolute inset-0 rounded-2xl" style={{ background: 'var(--accent-dim)' }} />
            <div className="relative">
              <h2 className="font-display text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{t.ctaTitle}</h2>
              <p className="font-body mb-8" style={{ color: 'var(--text-muted)' }}>{t.ctaSubtitle}</p>
              <div className="flex gap-3 justify-center flex-wrap">
                <button onClick={() => navigate('/signup')} className="btn-primary text-base px-8 py-3.5">
                  {t.createAccount} <ArrowRight size={16} />
                </button>
                <button onClick={() => navigate('/explore')} className="btn-ghost text-base px-6 py-3.5">
                  {t.browseTopics}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-8 px-4" style={{ borderTop: '1px solid var(--border-default)' }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="font-display font-bold" style={{ color: 'var(--text-muted)' }}>
            Insight<span style={{ color: 'var(--accent-primary)' }}>Mint</span>
          </div>
          <div className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>© 2024 InsightMint. {t.footerText}</div>
        </div>
      </footer>
    </div>
  );
}