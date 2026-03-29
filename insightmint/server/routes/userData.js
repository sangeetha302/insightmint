const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const UserData = require('../models/UserData');

// ── Helper: get or create user data doc ─────────────────────
async function getOrCreate(userId) {
  let doc = await UserData.findOne({ userId });
  if (!doc) doc = await UserData.create({ userId });
  return doc;
}

// ── GET /api/userdata — load everything for this user ────────
router.get('/', auth, async (req, res) => {
  try {
    const doc = await getOrCreate(req.userId);
    res.json({
      streak:            doc.streak,
      sessions:          Object.fromEntries(doc.sessions || new Map()),
      activity:          Object.fromEntries(doc.activity || new Map()),
      quizHistory:       doc.quizHistory       || [],
      roadmapProgress:   Object.fromEntries(doc.roadmapProgress || new Map()),
      roadmapHistory:    doc.roadmapHistory     || [],
      dashboardRoadmaps: doc.dashboardRoadmaps  || [],
      summarizerHistory: doc.summarizerHistory  || [],
      tabUsage:          Object.fromEntries(doc.tabUsage || new Map()),
      voiceUses:         doc.voiceUses          || 0,
    });
  } catch (err) {
    console.error('UserData GET error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/userdata/sync — save everything at once ────────
router.post('/sync', auth, async (req, res) => {
  try {
    const {
      streak, sessions, activity, quizHistory,
      roadmapProgress, roadmapHistory, dashboardRoadmaps,
      summarizerHistory, tabUsage, voiceUses,
    } = req.body;

    const update = { updatedAt: new Date() };
    if (streak            !== undefined) update.streak            = streak;
    if (sessions          !== undefined) update.sessions          = sessions;
    if (activity          !== undefined) update.activity          = activity;
    if (quizHistory       !== undefined) update.quizHistory       = quizHistory.slice(-50); // keep last 50
    if (roadmapProgress   !== undefined) update.roadmapProgress   = roadmapProgress;
    if (roadmapHistory    !== undefined) update.roadmapHistory    = roadmapHistory.slice(-20);
    if (dashboardRoadmaps !== undefined) update.dashboardRoadmaps = dashboardRoadmaps;
    if (summarizerHistory !== undefined) update.summarizerHistory = summarizerHistory.slice(-30);
    if (tabUsage          !== undefined) update.tabUsage          = tabUsage;
    if (voiceUses         !== undefined) update.voiceUses         = voiceUses;

    await UserData.findOneAndUpdate(
      { userId: req.userId },
      { $set: update },
      { upsert: true, new: true }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('UserData SYNC error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH individual fields ──────────────────────────────────

// Save streak
router.patch('/streak', auth, async (req, res) => {
  try {
    await UserData.findOneAndUpdate(
      { userId: req.userId },
      { $set: { streak: req.body.streak, updatedAt: new Date() } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Save quiz result
router.post('/quiz', auth, async (req, res) => {
  try {
    const { topic, score, total, difficulty } = req.body;
    await UserData.findOneAndUpdate(
      { userId: req.userId },
      {
        $push: { quizHistory: { $each: [{ topic, score, total, difficulty }], $slice: -50 } },
        $set:  { updatedAt: new Date() }
      },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Save roadmap progress
router.post('/roadmap-progress', auth, async (req, res) => {
  try {
    const { topic, progress } = req.body;
    await UserData.findOneAndUpdate(
      { userId: req.userId },
      {
        $set: {
          [`roadmapProgress.${topic}`]: progress,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Save summarizer history item
router.post('/summarizer', auth, async (req, res) => {
  try {
    const { title, summary, type } = req.body;
    await UserData.findOneAndUpdate(
      { userId: req.userId },
      {
        $push: { summarizerHistory: { $each: [{ title, summary, type }], $slice: -30 } },
        $set:  { updatedAt: new Date() }
      },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Save activity (heatmap)
router.patch('/activity', auth, async (req, res) => {
  try {
    const { date, count } = req.body;
    await UserData.findOneAndUpdate(
      { userId: req.userId },
      { $set: { [`activity.${date}`]: count, updatedAt: new Date() } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Save sessions (calendar)
router.patch('/sessions', auth, async (req, res) => {
  try {
    const { date, sessions } = req.body;
    await UserData.findOneAndUpdate(
      { userId: req.userId },
      { $set: { [`sessions.${date}`]: sessions, updatedAt: new Date() } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Increment voice uses
router.patch('/voice', auth, async (req, res) => {
  try {
    await UserData.findOneAndUpdate(
      { userId: req.userId },
      { $inc: { voiceUses: 1 }, $set: { updatedAt: new Date() } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Save tab usage
router.patch('/tab-usage', auth, async (req, res) => {
  try {
    const { tab } = req.body;
    await UserData.findOneAndUpdate(
      { userId: req.userId },
      { $inc: { [`tabUsage.${tab}`]: 1 }, $set: { updatedAt: new Date() } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;