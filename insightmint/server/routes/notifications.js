const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { sendDailyReminder, sendTestEmail } = require('../utils/emailService');

// In-memory notification preferences store
const notifPrefs = {};

// Get user preferences
router.get('/preferences', auth, (req, res) => {
  const prefs = notifPrefs[req.userId] || {
    emailEnabled: false,
    email: '',
    time: '09:00',
    frequency: 'daily',
    reminderTypes: { progress: true, streak: true, newContent: true }
  };
  res.json(prefs);
});

// Save user preferences
router.post('/preferences', auth, (req, res) => {
  const { emailEnabled, email, time, frequency, reminderTypes } = req.body;
  notifPrefs[req.userId] = { emailEnabled, email, time, frequency, reminderTypes, userId: req.userId, updatedAt: new Date() };
  res.json({ success: true, prefs: notifPrefs[req.userId] });
});

// Send test email
router.post('/test', auth, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const result = await sendTestEmail(email);
  res.json(result);
});

// Manually trigger a reminder (for testing)
router.post('/send-reminder', auth, async (req, res) => {
  const { email, userName, stats, roadmaps, streak } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const result = await sendDailyReminder({
    to: email,
    userName: userName || 'Learner',
    stats: stats || { videosWatched: 0, roadmapsActive: 0, topicsDone: 0 },
    roadmaps: roadmaps || [],
    streak: streak || 0
  });
  res.json(result);
});

// Get all users with notifications enabled (for cron job)
router.get('/active-users', (req, res) => {
  const active = Object.values(notifPrefs).filter(p => p.emailEnabled && p.email);
  res.json({ users: active });
});

module.exports = router;
module.exports.notifPrefs = notifPrefs;