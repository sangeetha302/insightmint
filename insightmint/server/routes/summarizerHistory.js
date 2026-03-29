const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const SummarizerHistory = require('../models/SummarizerHistory');

// ── GET /api/summarizer-history — load all for user ──────────
router.get('/', auth, async (req, res) => {
  try {
    const items = await SummarizerHistory
      .find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(30);
    res.json({ history: items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/summarizer-history — save one item ─────────────
router.post('/', auth, async (req, res) => {
  try {
    const { type, title, source, summary, thumbnail,
            channelName, videoId, fileLabel, language } = req.body;
    const item = await SummarizerHistory.create({
      userId: req.userId,
      type, title, source, summary, thumbnail,
      channelName, videoId, fileLabel, language,
    });
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/summarizer-history/:id ───────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    await SummarizerHistory.deleteOne({ _id: req.params.id, userId: req.userId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/summarizer-history — clear all ───────────────
router.delete('/', auth, async (req, res) => {
  try {
    await SummarizerHistory.deleteMany({ userId: req.userId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;