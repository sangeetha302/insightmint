const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');
require('dotenv').config();

const authRoutes          = require('./routes/auth');
const videoRoutes         = require('./routes/videos');
const aiRoutes            = require('./routes/ai');
const userRoutes          = require('./routes/user');
const notesRoutes         = require('./routes/notes');
const summarizeRoutes     = require('./routes/summarize');
const roadmapRoutes       = require('./routes/roadmap');
const quizRoutes          = require('./routes/quiz');
const notificationsRoutes = require('./routes/notifications');
const communityRoutes     = require('./routes/community');
const nlpRoutes           = require('./routes/nlp');
const learningStyleRoutes = require('./routes/learningStyle');
const recommendRoutes     = require('./routes/recommend');

const { sendDailyReminder } = require('./utils/emailService');

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ CORS FIX (for deployment + local)
app.use(cors({
  origin: true,
  credentials: true,
}));

// ✅ Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ MongoDB connection (STRICT for deployment)
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1); // stop server if DB fails
  });

// ✅ Routes
app.use('/api/auth',          authRoutes);
app.use('/api/videos',        videoRoutes);
app.use('/api/ai',            aiRoutes);
app.use('/api/user',          userRoutes);
app.use('/api/notes',         notesRoutes);
app.use('/api/summarize',     summarizeRoutes);
app.use('/api/roadmap',       roadmapRoutes);
app.use('/api/quiz',          quizRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/community',     communityRoutes);
app.use('/api/nlp',           nlpRoutes);
app.use('/api/learning-style', learningStyleRoutes);
app.use('/api/recommend',      recommendRoutes);
app.use('/api/feedback',           require('./routes/feedback'));
app.use('/api/userdata',           require('./routes/userData'));
app.use('/api/summarizer-history', require('./routes/summarizerHistory'));
app.use('/api/study-rooms',        require('./routes/roomRoutes'));

// ✅ Health check route (important for Render)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'InsightMint API running' });
});

// ✅ Base route
app.get('/', (req, res) => {
  res.send('🚀 InsightMint Backend Running');
});

// ✅ Cron job (email reminders)
cron.schedule('0 9 * * *', async () => {
  console.log('📧 Running daily reminder cron job...');
  try {
    const { notifPrefs } = require('./routes/notifications');
    const activeUsers = Object.values(notifPrefs).filter(p => p.emailEnabled && p.email);

    for (const prefs of activeUsers) {
      if (
        prefs.frequency === 'daily' ||
        (prefs.frequency === 'weekly' && new Date().getDay() === 1)
      ) {
        await sendDailyReminder({
          to: prefs.email,
          userName: prefs.userName || 'Learner',
          stats: prefs.lastStats || {
            videosWatched: 0,
            roadmapsActive: 0,
            topicsDone: 0
          },
          roadmaps: prefs.lastRoadmaps || [],
          streak: prefs.streak || 0
        });
      }
    }
  } catch (err) {
    console.error('❌ Cron job error:', err.message);
  }
});

// ✅ Start server (Render-friendly)
app.listen(PORT, () => {
  console.log(`🚀 InsightMint server running on port ${PORT}`);
});