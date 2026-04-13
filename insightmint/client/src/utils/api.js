import axios from 'axios';

// ✅ Use env variable for production, fallback for local
const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
});

// ✅ Attach token automatically
api.interceptors.request.use(config => {
  const token = localStorage.getItem('insightmint_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ✅ Language helper
const getLang = () => localStorage.getItem('insightmint_language') || 'en';

// ✅ API calls
export const searchVideos = (topic) =>
  api.get(`/videos/search?topic=${encodeURIComponent(topic)}`);

export const getSummary = (topic, videoTitle) =>
  api.post('/ai/summary', { topic, videoTitle, language: getLang() });

export const getFlashcards = (topic) =>
  api.post('/ai/flashcards', { topic, language: getLang() });

export const getQuiz = (topic) =>
  api.post('/ai/quiz', { topic, language: getLang() });

export const getFlowchart = (topic, type = 'concept') =>
  api.post('/ai/flowchart', { topic, type });

export const getRoadmap = (topic) =>
  api.post('/roadmap/generate', { topic, language: getLang() });

export const sendChat = (message, topic, history = []) =>
  api.post('/ai/chat', { message, topic, history, language: getLang() });

export const saveProgress = (data) =>
  api.post('/user/progress', data);

export const getProfile = () =>
  api.get('/user/profile');

export default api;