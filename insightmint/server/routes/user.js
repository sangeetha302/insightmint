const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

let User;
try { User = require('../models/User'); } catch (e) { User = null; }

// Mock store for when MongoDB isn't available
const mockStore = {};

router.get('/profile', auth, async (req, res) => {
  try {
    if (!User) throw new Error('User model not available');
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Profile error:', err.message);
    // Return safe fallback so Dashboard doesn't crash
    const mock = mockStore[req.userId];
    res.json(mock || {
      id: req.userId, name: 'User', email: '',
      learningHistory: [], savedRoadmaps: []
    });
  }
});

router.post('/progress', auth, async (req, res) => {
  try {
    const { topic, videoId, videoTitle, thumbnail, source, embedUrl, channel, duration } = req.body;
    const entry = {
      topic, videoId, videoTitle, thumbnail,
      source: source || 'youtube',
      embedUrl: embedUrl || '',
      channel:  channel  || '',
      duration: duration || '',
      completedAt: new Date(),
    };
    try {
      const user = await User.findByIdAndUpdate(
        req.userId,
        { $push: { learningHistory: { $each: [entry], $slice: -50 } } }, // keep last 50
        { new: true }
      );
      res.json({ success: true, history: user.learningHistory });
    } catch {
      if (!mockStore[req.userId]) mockStore[req.userId] = { learningHistory: [], savedRoadmaps: [] };
      mockStore[req.userId].learningHistory.push(entry);
      res.json({ success: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /user/history — return recent watched videos ─────────
router.get('/history', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('learningHistory');
    if (!user) return res.json({ history: [] });
    // Return last 20, most recent first, deduplicated by videoId
    const seen = new Set();
    const unique = [...user.learningHistory].reverse().filter(h => {
      if (seen.has(h.videoId)) return false;
      seen.add(h.videoId);
      return true;
    }).slice(0, 20);
    res.json({ history: unique });
  } catch {
    res.json({ history: mockStore[req.userId]?.learningHistory?.slice(-20).reverse() || [] });
  }
});

router.post('/roadmap/save', auth, async (req, res) => {
  try {
    const { topic, roadmap } = req.body;
    try {
      await User.findByIdAndUpdate(req.userId, { $push: { savedRoadmaps: { topic, roadmap } } });
      res.json({ success: true });
    } catch {
      if (!mockStore[req.userId]) mockStore[req.userId] = { learningHistory: [], savedRoadmaps: [] };
      mockStore[req.userId].savedRoadmaps.push({ topic, roadmap, createdAt: new Date() });
      res.json({ success: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;