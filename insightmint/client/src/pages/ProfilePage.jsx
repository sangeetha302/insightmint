import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage, LANGUAGES } from '../context/LanguageContext';
import axios from 'axios';
import {
  User, Bell, BellOff, Mail, Check, Loader2, Send,
  ToggleLeft, ToggleRight, AlertCircle, CheckCircle2,
  Clock, Shield, Palette, Globe, LogOut, Camera,
  ChevronRight, Sun, Moon, Lock, Trash2
} from 'lucide-react';

const api = axios.create({ baseURL: 'https://insightmint-backend-3zax.onrender.com/api' });
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('insightmint_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

const TABS = [
  { id: 'profile',       label: 'Profile',       icon: User },
  { id: 'notifications', label: 'Notifications',  icon: Bell },
  { id: 'appearance',    label: 'Appearance',     icon: Palette },
  { id: 'language',      label: 'Language',       icon: Globe },
];

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { language, setLanguage, languages } = useLanguage();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('profile');

  // Notification prefs
  const [notifPrefs, setNotifPrefs] = useState({
    emailEnabled: false,
    email: user?.email || '',
    time: '09:00',
    frequency: 'daily',
    reminderTypes: { progress: true, streak: true, newContent: false }
  });
  const [savingNotif, setSavingNotif] = useState(false);
  const [testingSend, setTestingSend] = useState(false);
  const [notifStatus, setNotifStatus] = useState(null);

  useEffect(() => {
    loadNotifPrefs();
  }, []);

  const loadNotifPrefs = async () => {
    try {
      const { data } = await api.get('/notifications/preferences');
      setNotifPrefs(prev => ({ ...prev, ...data, email: data.email || user?.email || '' }));
    } catch {}
  };

  const saveNotifPrefs = async () => {
    setSavingNotif(true); setNotifStatus(null);
    try {
      await api.post('/notifications/preferences', {
        ...notifPrefs,
        userName: user?.name,
      });
      setNotifStatus({ type: 'success', msg: 'Notification preferences saved successfully!' });
      setTimeout(() => setNotifStatus(null), 3000);
    } catch {
      setNotifStatus({ type: 'error', msg: 'Failed to save. Please try again.' });
    } finally { setSavingNotif(false); }
  };

  const sendTestEmail = async () => {
    if (!notifPrefs.email) { setNotifStatus({ type: 'error', msg: 'Please enter an email address first.' }); return; }
    setTestingSend(true); setNotifStatus(null);
    try {
      const roadmapProgress = JSON.parse(localStorage.getItem('insightmint_dashboard_roadmaps') || '[]');
      const { data } = await api.post('/notifications/send-reminder', {
        email: notifPrefs.email,
        userName: user?.name || 'Learner',
        stats: { videosWatched: 3, roadmapsActive: roadmapProgress.length, topicsDone: roadmapProgress.filter(r => r.pct === 100).length },
        roadmaps: roadmapProgress.map(r => ({ topic: r.topic, pct: r.pct })),
        streak: 3
      });
      if (data.success) {
        setNotifStatus({ type: 'success', msg: `✅ Email sent to ${notifPrefs.email}! Check your inbox.` });
      } else {
        setNotifStatus({ type: 'error', msg: data.error || 'Failed. Check EMAIL_USER and EMAIL_PASS in server/.env' });
      }
    } catch (err) {
      setNotifStatus({ type: 'error', msg: err.response?.data?.error || 'Failed to send test email.' });
    } finally { setTestingSend(false); }
  };

  const avatarLetter = user?.name?.[0]?.toUpperCase() || 'U';

  return (
    <div className="min-h-screen pt-20 pb-16 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Account Settings</h1>
          <p className="font-body" style={{ color: 'var(--text-muted)' }}>Manage your profile, notifications and preferences</p>
        </div>

        <div className="flex flex-col md:flex-row gap-6">

          {/* Sidebar */}
          <div className="md:w-56 flex-shrink-0">
            {/* Avatar card */}
            <div className="glass-card p-5 text-center mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-mint-400 to-mint-600 flex items-center justify-center text-2xl font-display font-bold text-ink-950 mx-auto mb-3 shadow-lg"
                   style={{ boxShadow: '0 4px 20px var(--shadow-accent)' }}>
                {avatarLetter}
              </div>
              <p className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>{user?.name}</p>
              <p className="text-xs font-body mt-0.5" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
            </div>

            {/* Nav tabs */}
            <div className="glass-card overflow-hidden">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-body text-left transition-all"
                    style={{
                      background: active ? 'var(--accent-dim)' : 'transparent',
                      color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      borderLeft: active ? '3px solid var(--accent-primary)' : '3px solid transparent',
                      fontWeight: active ? '600' : '400'
                    }}>
                    <Icon size={15} />
                    {tab.label}
                    {tab.id === 'notifications' && notifPrefs.emailEnabled && (
                      <span className="ml-auto w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent-primary)' }} />
                    )}
                  </button>
                );
              })}

              <div style={{ borderTop: '1px solid var(--border-default)' }}>
                <button onClick={() => { logout(); navigate('/'); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-body text-left transition-all"
                  style={{ color: '#f87171' }}>
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1">

            {/* ── PROFILE TAB ── */}
            {activeTab === 'profile' && (
              <div className="glass-card p-6 animate-fade-in">
                <h2 className="font-display font-bold text-lg mb-5" style={{ color: 'var(--text-primary)' }}>Profile Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Full Name</label>
                    <input type="text" defaultValue={user?.name} className="input-field" readOnly
                           style={{ opacity: 0.7, cursor: 'default' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Email Address</label>
                    <input type="email" defaultValue={user?.email} className="input-field" readOnly
                           style={{ opacity: 0.7, cursor: 'default' }} />
                  </div>
                  <div className="p-4 rounded-xl text-sm font-body" style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', color: 'var(--text-muted)' }}>
                    <p className="flex items-center gap-2"><Shield size={13} style={{ color: 'var(--accent-primary)' }} /> Your account is secured with authentication.</p>
                  </div>

                  {/* Learning stats */}
                  <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '16px' }}>
                    <h3 className="font-display font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Learning Summary</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { label: 'Videos', value: JSON.parse(localStorage.getItem('insightmint_dashboard_roadmaps') || '[]').length || '—', icon: '📹' },
                        { label: 'Roadmaps', value: JSON.parse(localStorage.getItem('insightmint_dashboard_roadmaps') || '[]').length, icon: '🗺️' },
                        { label: 'Notes', value: '—', icon: '📝' },
                      ].map(s => (
                        <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                          <div className="text-xl mb-1">{s.icon}</div>
                          <div className="font-display font-bold" style={{ color: 'var(--accent-primary)' }}>{s.value}</div>
                          <div className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── NOTIFICATIONS TAB ── */}
            {activeTab === 'notifications' && (
              <div className="glass-card p-6 animate-fade-in">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Email Notifications</h2>
                    <p className="text-sm font-body mt-0.5" style={{ color: 'var(--text-muted)' }}>Get daily learning reminders with your progress summary</p>
                  </div>
                  {/* Master toggle */}
                  <button onClick={() => setNotifPrefs(p => ({ ...p, emailEnabled: !p.emailEnabled }))}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-body transition-all"
                    style={{
                      background: notifPrefs.emailEnabled ? 'var(--accent-dim)' : 'var(--bg-card)',
                      border: `1.5px solid ${notifPrefs.emailEnabled ? 'var(--accent-border)' : 'var(--border-default)'}`,
                      color: notifPrefs.emailEnabled ? 'var(--accent-primary)' : 'var(--text-muted)',
                      fontWeight: '600'
                    }}>
                    {notifPrefs.emailEnabled
                      ? <><ToggleRight size={18} /> Enabled</>
                      : <><ToggleLeft size={18} /> Disabled</>}
                  </button>
                </div>

                <div className={`space-y-5 transition-all ${!notifPrefs.emailEnabled ? 'opacity-40 pointer-events-none' : ''}`}>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                      <span className="flex items-center gap-1.5"><Mail size={10} /> Recipient Email</span>
                    </label>
                    <input type="email" value={notifPrefs.email}
                      onChange={e => setNotifPrefs(p => ({ ...p, email: e.target.value }))}
                      placeholder="your@email.com" className="input-field" />
                    <p className="text-xs font-body mt-1" style={{ color: 'var(--text-muted)' }}>
                      Reminders will be sent from <span style={{ color: 'var(--accent-primary)' }}>insightmintai@gmail.com</span>
                    </p>
                  </div>

                  {/* Frequency + Time */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Frequency</label>
                      <div className="flex gap-2">
                        {['daily', 'weekly'].map(f => (
                          <button key={f} onClick={() => setNotifPrefs(p => ({ ...p, frequency: f }))}
                            className="flex-1 py-2.5 rounded-xl text-sm font-body capitalize transition-all"
                            style={{
                              background: notifPrefs.frequency === f ? 'var(--accent-dim)' : 'var(--bg-card)',
                              border: `1.5px solid ${notifPrefs.frequency === f ? 'var(--accent-border)' : 'var(--border-default)'}`,
                              color: notifPrefs.frequency === f ? 'var(--accent-primary)' : 'var(--text-muted)',
                              fontWeight: notifPrefs.frequency === f ? '600' : '400'
                            }}>{f}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                        <span className="flex items-center gap-1"><Clock size={10} /> Reminder Time</span>
                      </label>
                      <input type="time" value={notifPrefs.time}
                        onChange={e => setNotifPrefs(p => ({ ...p, time: e.target.value }))}
                        className="input-field" />
                    </div>
                  </div>

                  {/* Reminder types */}
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>What to include</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { key: 'progress',   label: 'Progress Update', icon: '📊', desc: 'Roadmap & video stats' },
                        { key: 'streak',     label: 'Streak Reminder', icon: '🔥', desc: 'Learning streak info' },
                        { key: 'newContent', label: 'Tips & Quotes',   icon: '💡', desc: 'Motivational content' },
                      ].map(rt => (
                        <button key={rt.key}
                          onClick={() => setNotifPrefs(p => ({ ...p, reminderTypes: { ...p.reminderTypes, [rt.key]: !p.reminderTypes[rt.key] } }))}
                          className="p-3 rounded-xl text-left transition-all"
                          style={{
                            background: notifPrefs.reminderTypes[rt.key] ? 'var(--accent-dim)' : 'var(--bg-card)',
                            border: `1.5px solid ${notifPrefs.reminderTypes[rt.key] ? 'var(--accent-border)' : 'var(--border-default)'}`,
                          }}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span>{rt.icon}</span>
                            <span className="text-xs font-body font-semibold" style={{ color: notifPrefs.reminderTypes[rt.key] ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{rt.label}</span>
                            {notifPrefs.reminderTypes[rt.key] && <Check size={11} className="ml-auto" style={{ color: 'var(--accent-primary)' }} />}
                          </div>
                          <p className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>{rt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Status */}
                  {notifStatus && (
                    <div className="flex items-center gap-2 p-3 rounded-xl text-sm animate-fade-in"
                         style={{
                           background: notifStatus.type === 'success' ? 'rgba(74,222,128,0.10)' : 'rgba(248,113,113,0.10)',
                           border: `1px solid ${notifStatus.type === 'success' ? 'rgba(74,222,128,0.30)' : 'rgba(248,113,113,0.30)'}`,
                           color: notifStatus.type === 'success' ? '#4ade80' : '#f87171'
                         }}>
                      {notifStatus.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                      {notifStatus.msg}
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-3 flex-wrap">
                    <button onClick={saveNotifPrefs} disabled={savingNotif} className="btn-primary px-6 py-2.5 text-sm disabled:opacity-50">
                      {savingNotif ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Check size={14} /> Save Settings</>}
                    </button>
                    <button onClick={sendTestEmail} disabled={testingSend || !notifPrefs.email} className="btn-ghost px-5 py-2.5 text-sm disabled:opacity-40">
                      {testingSend ? <><Loader2 size={14} className="animate-spin" /> Sending...</> : <><Send size={14} /> Send Email</>}
                    </button>
                  </div>

                  {/* Setup guide */}
                  <div className="rounded-xl p-4" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
                    <p className="text-xs font-mono font-bold mb-2" style={{ color: '#818cf8' }}>⚙️ HOW IT WORKS</p>
                    <p className="text-xs font-body leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      Emails are sent from <strong>insightmintai@gmail.com</strong> to your entered email address.
                      Daily reminders include your roadmap progress, streak info, and motivational content.
                      The server sends reminders automatically every day at your chosen time.
                    </p>
                  </div>
                </div>

                {/* Disabled state message */}
                {!notifPrefs.emailEnabled && (
                  <div className="mt-4 p-4 rounded-xl text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
                    <BellOff size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                    <p className="text-sm font-body" style={{ color: 'var(--text-muted)' }}>Enable notifications to receive daily learning reminders</p>
                  </div>
                )}
              </div>
            )}

            {/* ── APPEARANCE TAB ── */}
            {activeTab === 'appearance' && (
              <div className="glass-card p-6 animate-fade-in">
                <h2 className="font-display font-bold text-lg mb-5" style={{ color: 'var(--text-primary)' }}>Appearance</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Theme</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button onClick={() => !isDark && toggleTheme()}
                        className="p-5 rounded-xl text-left transition-all"
                        style={{
                          background: !isDark ? 'var(--accent-dim)' : 'var(--bg-card)',
                          border: `2px solid ${!isDark ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                        }}>
                        <Sun size={22} className="mb-2" style={{ color: !isDark ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
                        <div className="font-display font-semibold text-sm" style={{ color: !isDark ? 'var(--accent-primary)' : 'var(--text-primary)' }}>Light Mode</div>
                        <div className="text-xs font-body mt-0.5" style={{ color: 'var(--text-muted)' }}>Clean white interface</div>
                        {!isDark && <div className="mt-2 flex items-center gap-1 text-xs" style={{ color: 'var(--accent-primary)' }}><Check size={11} /> Active</div>}
                      </button>
                      <button onClick={() => isDark && toggleTheme()}
                        className="p-5 rounded-xl text-left transition-all"
                        style={{
                          background: isDark ? 'var(--accent-dim)' : 'var(--bg-card)',
                          border: `2px solid ${isDark ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                        }}>
                        <Moon size={22} className="mb-2" style={{ color: isDark ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
                        <div className="font-display font-semibold text-sm" style={{ color: isDark ? 'var(--accent-primary)' : 'var(--text-primary)' }}>Dark Mode</div>
                        <div className="text-xs font-body mt-0.5" style={{ color: 'var(--text-muted)' }}>Easy on the eyes</div>
                        {isDark && <div className="mt-2 flex items-center gap-1 text-xs" style={{ color: 'var(--accent-primary)' }}><Check size={11} /> Active</div>}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── LANGUAGE TAB ── */}
            {activeTab === 'language' && (
              <div className="glass-card p-6 animate-fade-in">
                <h2 className="font-display font-bold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>Language</h2>
                <p className="text-sm font-body mb-5" style={{ color: 'var(--text-muted)' }}>
                  Choose your preferred language for AI-generated content
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {languages.map(lang => (
                    <button key={lang.code} onClick={() => setLanguage(lang.code)}
                      className="p-4 rounded-xl text-left transition-all hover:translate-y-[-2px]"
                      style={{
                        background: language === lang.code ? 'var(--accent-dim)' : 'var(--bg-card)',
                        border: `2px solid ${language === lang.code ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                      }}>
                      <div className="text-2xl mb-2">{lang.flag}</div>
                      <div className="font-display font-semibold text-sm" style={{ color: language === lang.code ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{lang.native}</div>
                      <div className="text-xs font-body" style={{ color: 'var(--text-muted)' }}>{lang.name}</div>
                      {language === lang.code && (
                        <div className="mt-2 flex items-center gap-1 text-xs" style={{ color: 'var(--accent-primary)' }}><Check size={11} /> Active</div>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-xs font-body mt-4" style={{ color: 'var(--text-muted)' }}>
                  This affects AI summaries, flashcards, quizzes, roadmaps, and chat responses.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}