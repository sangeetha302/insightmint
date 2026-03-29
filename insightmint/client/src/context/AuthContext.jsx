import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

const LEARNING_KEYS = [
  'insightmint_streak', 'insightmint_sessions', 'insightmint_activity',
  'insightmint_roadmap_progress', 'insightmint_dashboard_roadmaps',
  'insightmint_roadmap_history', 'insightmint_summarizer_history',
  'insightmint_quiz_history', 'insightmint_tab_usage',
  'insightmint_voice_uses', 'insightmint_notes_count',
  'insightmint_recommend_studied',
];

const clearLearningData = () =>
  LEARNING_KEYS.forEach(k => localStorage.removeItem(k));

// ── Pull all user data from MongoDB → localStorage ───────────
const restoreFromDB = async (token) => {
  try {
    const { data } = await axios.get('/api/userdata', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (data.streak?.count !== undefined)
      localStorage.setItem('insightmint_streak', JSON.stringify(data.streak));
    if (data.sessions && Object.keys(data.sessions).length)
      localStorage.setItem('insightmint_sessions', JSON.stringify(data.sessions));
    if (data.activity && Object.keys(data.activity).length)
      localStorage.setItem('insightmint_activity', JSON.stringify(data.activity));
    if (data.quizHistory?.length)
      localStorage.setItem('insightmint_quiz_history', JSON.stringify(data.quizHistory));
    if (data.roadmapProgress && Object.keys(data.roadmapProgress).length)
      localStorage.setItem('insightmint_roadmap_progress', JSON.stringify(data.roadmapProgress));
    if (data.roadmapHistory?.length)
      localStorage.setItem('insightmint_roadmap_history', JSON.stringify(data.roadmapHistory));
    if (data.dashboardRoadmaps?.length)
      localStorage.setItem('insightmint_dashboard_roadmaps', JSON.stringify(data.dashboardRoadmaps));
    if (data.summarizerHistory?.length)
      localStorage.setItem('insightmint_summarizer_history', JSON.stringify(data.summarizerHistory));
    if (data.tabUsage && Object.keys(data.tabUsage).length)
      localStorage.setItem('insightmint_tab_usage', JSON.stringify(data.tabUsage));
    if (data.voiceUses)
      localStorage.setItem('insightmint_voice_uses', String(data.voiceUses));

    // Restore recommend studied topics from tabUsage
    if (data.tabUsage?.recommend_studied?.length)
      localStorage.setItem('insightmint_recommend_studied',
        JSON.stringify(data.tabUsage.recommend_studied));

    console.log('✅ History restored from MongoDB');
  } catch (err) {
    console.log('⚠️ Could not restore from DB:', err.message);
  }
};

// ── Push all localStorage data → MongoDB ─────────────────────
const saveToDB = async (token) => {
  try {
    const safe = (key, fallback) => {
      try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; }
      catch { return fallback; }
    };

    const payload = {};
    const streak   = safe('insightmint_streak', null);
    const sessions = safe('insightmint_sessions', null);
    const activity = safe('insightmint_activity', null);
    const quizH    = safe('insightmint_quiz_history', null);
    const rmProg   = safe('insightmint_roadmap_progress', null);
    const rmHist   = safe('insightmint_roadmap_history', null);
    const dashRM   = safe('insightmint_dashboard_roadmaps', null);
    const sumH     = safe('insightmint_summarizer_history', null);
    const tabU     = safe('insightmint_tab_usage', null);
    const voices   = localStorage.getItem('insightmint_voice_uses');

    // Only include non-empty values to avoid overwriting DB with blanks
    if (streak)                          payload.streak            = streak;
    if (sessions && Object.keys(sessions).length) payload.sessions = sessions;
    if (activity && Object.keys(activity).length) payload.activity = activity;
    if (quizH?.length)                   payload.quizHistory       = quizH;
    if (rmProg && Object.keys(rmProg).length) payload.roadmapProgress = rmProg;
    if (rmHist?.length)                  payload.roadmapHistory    = rmHist;
    if (dashRM?.length)                  payload.dashboardRoadmaps = dashRM;
    if (sumH?.length)                    payload.summarizerHistory = sumH;
    if (tabU && Object.keys(tabU).length) payload.tabUsage         = tabU;
    if (voices)                          payload.voiceUses         = parseInt(voices);

    if (!Object.keys(payload).length) return; // nothing to save

    await axios.post('/api/userdata/sync', payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Data saved to MongoDB');
  } catch (err) {
    console.log('⚠️ Could not save to DB:', err.message);
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(localStorage.getItem('insightmint_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const storedUser = localStorage.getItem('insightmint_user');
      if (storedUser) setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, [token]);

  // Auto-save to DB every 5 minutes while logged in
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => saveToDB(token), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [token]);

  const login = async (email, password) => {
    const { data } = await axios.post('/api/auth/login', { email, password });
    // Clear old data first, then restore this user's data from DB
    clearLearningData();
    localStorage.setItem('insightmint_token', data.token);
    localStorage.setItem('insightmint_user', JSON.stringify(data.user));
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    setToken(data.token);
    setUser(data.user);
    // Restore all history from MongoDB
    await restoreFromDB(data.token);
    return data;
  };

  const signup = async (name, email, password) => {
    const { data } = await axios.post('/api/auth/signup', { name, email, password });
    clearLearningData();
    localStorage.setItem('insightmint_token', data.token);
    localStorage.setItem('insightmint_user', JSON.stringify(data.user));
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    // Save everything to DB before logging out
    if (token) await saveToDB(token);
    setToken(null);
    setUser(null);
    localStorage.removeItem('insightmint_token');
    localStorage.removeItem('insightmint_user');
    clearLearningData();
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};