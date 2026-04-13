// ── userDataSync.js ──────────────────────────────────────────
// Bridges localStorage ↔ MongoDB for all learning data
// Every feature still works offline via localStorage,
// but syncs to MongoDB when user is logged in.

import axios from 'axios';

const api = axios.create({ baseURL: 'https://insightmint-backend-3zax.onrender.com/api' });
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('insightmint_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

const isLoggedIn = () => !!localStorage.getItem('insightmint_token');

// ── LOAD: Pull from MongoDB → write to localStorage ──────────
export async function loadFromDB() {
  if (!isLoggedIn()) return;
  try {
    const { data } = await api.get('/userdata');

    // Streak
    if (data.streak?.count !== undefined)
      localStorage.setItem('insightmint_streak', JSON.stringify(data.streak));

    // Sessions (calendar)
    if (data.sessions && Object.keys(data.sessions).length)
      localStorage.setItem('insightmint_sessions', JSON.stringify(data.sessions));

    // Activity heatmap
    if (data.activity && Object.keys(data.activity).length)
      localStorage.setItem('insightmint_activity', JSON.stringify(data.activity));

    // Quiz history
    if (data.quizHistory?.length)
      localStorage.setItem('insightmint_quiz_history', JSON.stringify(data.quizHistory));

    // Roadmap progress
    if (data.roadmapProgress && Object.keys(data.roadmapProgress).length)
      localStorage.setItem('insightmint_roadmap_progress', JSON.stringify(data.roadmapProgress));

    // Roadmap history
    if (data.roadmapHistory?.length)
      localStorage.setItem('insightmint_roadmap_history', JSON.stringify(data.roadmapHistory));

    // Dashboard roadmaps
    if (data.dashboardRoadmaps?.length)
      localStorage.setItem('insightmint_dashboard_roadmaps', JSON.stringify(data.dashboardRoadmaps));

    // Summarizer history
    if (data.summarizerHistory?.length)
      localStorage.setItem('insightmint_summarizer_history', JSON.stringify(data.summarizerHistory));

    // Tab usage (for ML)
    if (data.tabUsage && Object.keys(data.tabUsage).length)
      localStorage.setItem('insightmint_tab_usage', JSON.stringify(data.tabUsage));

    // Voice uses (for ML)
    if (data.voiceUses !== undefined)
      localStorage.setItem('insightmint_voice_uses', String(data.voiceUses));

    console.log('✅ User data loaded from MongoDB');
  } catch (err) {
    console.log('⚠️ Could not load from DB, using localStorage:', err.message);
  }
}

// ── SYNC ALL: Push everything from localStorage → MongoDB ─────
export async function syncAllToDB() {
  if (!isLoggedIn()) return;
  try {
    const safe = (key, fallback) => {
      try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; }
      catch { return fallback; }
    };

    await api.post('/userdata/sync', {
      streak:            safe('insightmint_streak',             { count: 0, lastDate: '' }),
      sessions:          safe('insightmint_sessions',           {}),
      activity:          safe('insightmint_activity',           {}),
      quizHistory:       safe('insightmint_quiz_history',       []),
      roadmapProgress:   safe('insightmint_roadmap_progress',   {}),
      roadmapHistory:    safe('insightmint_roadmap_history',    []),
      dashboardRoadmaps: safe('insightmint_dashboard_roadmaps', []),
      summarizerHistory: safe('insightmint_summarizer_history', []),
      tabUsage:          safe('insightmint_tab_usage',          {}),
      voiceUses:         parseInt(localStorage.getItem('insightmint_voice_uses') || '0'),
    });
    console.log('✅ All data synced to MongoDB');
  } catch (err) {
    console.log('⚠️ Sync failed:', err.message);
  }
}

// ── INDIVIDUAL SYNC HELPERS ───────────────────────────────────

export async function syncStreak(streak) {
  if (!isLoggedIn()) return;
  try { await api.patch('/userdata/streak', { streak }); } catch {}
}

export async function syncQuizResult(topic, score, total, difficulty) {
  if (!isLoggedIn()) return;
  try { await api.post('/userdata/quiz', { topic, score, total, difficulty }); } catch {}
}

export async function syncRoadmapProgress(topic, progress) {
  if (!isLoggedIn()) return;
  try { await api.post('/userdata/roadmap-progress', { topic, progress }); } catch {}
}

export async function syncSummarizerItem(title, summary, type) {
  if (!isLoggedIn()) return;
  try { await api.post('/userdata/summarizer', { title, summary, type }); } catch {}
}

export async function syncActivity(date, count) {
  if (!isLoggedIn()) return;
  try { await api.patch('/userdata/activity', { date, count }); } catch {}
}

export async function syncSessions(date, sessions) {
  if (!isLoggedIn()) return;
  try { await api.patch('/userdata/sessions', { date, sessions }); } catch {}
}

export async function incrementVoiceUses() {
  if (!isLoggedIn()) return;
  try { await api.patch('/userdata/voice'); } catch {}
}

export async function trackTabUsage(tab) {
  if (!isLoggedIn()) return;
  try { await api.patch('/userdata/tab-usage', { tab }); } catch {}
}