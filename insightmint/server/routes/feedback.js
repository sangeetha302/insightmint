const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// ── Feedback Schema ───────────────────────────────────────────
const feedbackSchema = new mongoose.Schema({
  type:      { type: String, enum: ['rating', 'bug', 'suggestion', 'general'], required: true },
  rating:    { type: Number, min: 1, max: 5, default: null },
  category:  { type: String, default: '' },
  message:   { type: String, required: true },
  page:      { type: String, default: 'general' },
  userName:  { type: String, default: 'Anonymous' },
  userEmail: { type: String, default: '' },
  userId:    { type: String, default: null },
  status:    { type: String, enum: ['open', 'reviewed', 'resolved'], default: 'open' },
  createdAt: { type: Date, default: Date.now },
});

const Feedback = mongoose.models.Feedback || mongoose.model('Feedback', feedbackSchema);

// ── POST /api/feedback ────────────────────────────────────────
router.post('/', async (req, res) => {
  const { type, rating, category, message, page, userName, userEmail, userId } = req.body;
  if (!message || !type) return res.status(400).json({ error: 'Type and message are required' });
  try {
    const fb = await Feedback.create({ type, rating, category, message, page, userName, userEmail, userId });
    res.json({ success: true, id: fb._id, message: 'Thank you for your feedback!' });
  } catch (err) {
    console.error('Feedback error:', err.message);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

// ── GET /api/feedback ─────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 }).limit(100);
    const stats = {
      total:      feedbacks.length,
      avgRating:  feedbacks.filter(f => f.rating).length
        ? (feedbacks.filter(f => f.rating).reduce((s, f) => s + f.rating, 0) /
           feedbacks.filter(f => f.rating).length).toFixed(1)
        : 0,
      byType: {
        rating:     feedbacks.filter(f => f.type === 'rating').length,
        bug:        feedbacks.filter(f => f.type === 'bug').length,
        suggestion: feedbacks.filter(f => f.type === 'suggestion').length,
        general:    feedbacks.filter(f => f.type === 'general').length,
      }
    };
    res.json({ feedbacks, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;