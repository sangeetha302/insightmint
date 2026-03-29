// routes/examHistory.js
const express  = require('express');
const router   = express.Router();
const mongoose = require('mongoose');

// ── Schema ────────────────────────────────────────────────
const examHistorySchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  id:             { type: String, required: true, unique: true }, // client-generated ID
  topic:          { type: String, default: 'General' },
  difficulty:     { type: String, enum: ['beginner','intermediate','advanced'], default: 'intermediate' },
  evalMode:       { type: String, enum: ['one','all'], default: 'all' },
  avgScore:       { type: Number, default: 0 },
  grade:          { type: String, default: 'B' },
  totalQuestions: { type: Number, default: 0 },
  date:           { type: Date, default: Date.now },
  questions:      [{ id: Number, question: String }],
  answers:        { type: mongoose.Schema.Types.Mixed, default: {} },
  results: [{
    question:        String,
    answer:          String,
    totalScore:      Number,
    grade:           String,
    overallFeedback: String,
    rubric:          [{ dimension: String, score: Number, comment: String }],
    strengths:       [String],
    improvements:    [String],
    modelAnswer:     String,
    encouragement:   String,
  }],
}, { timestamps: true });

const ExamHistory = mongoose.models.ExamHistory || mongoose.model('ExamHistory', examHistorySchema);

// ── Auth middleware (reuse your existing one or inline) ───
function requireAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId || decoded.id || decoded._id;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ── GET /api/exam-history — fetch all for user ────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const entries = await ExamHistory
      .find({ userId: req.userId })
      .sort({ date: -1 })
      .limit(50)
      .lean();

    // Add synced: true to all DB entries
    res.json(entries.map(e => ({ ...e, synced: true })));
  } catch (err) {
    console.error('ExamHistory GET error:', err.message);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// ── POST /api/exam-history — save one entry ───────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const entry = req.body;
    if (!entry.id) return res.status(400).json({ error: 'Entry ID required' });

    // Upsert — if same client ID already exists, update it
    const saved = await ExamHistory.findOneAndUpdate(
      { id: entry.id, userId: req.userId },
      { ...entry, userId: req.userId },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, id: saved.id, synced: true });
  } catch (err) {
    console.error('ExamHistory POST error:', err.message);
    res.status(500).json({ error: 'Failed to save history' });
  }
});

// ── DELETE /api/exam-history/:id — delete one entry ──────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await ExamHistory.deleteOne({ id: req.params.id, userId: req.userId });
    res.json({ success: true });
  } catch (err) {
    console.error('ExamHistory DELETE error:', err.message);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

// ── DELETE /api/exam-history — clear all for user ────────
router.delete('/', requireAuth, async (req, res) => {
  try {
    await ExamHistory.deleteMany({ userId: req.userId });
    res.json({ success: true });
  } catch (err) {
    console.error('ExamHistory DELETE ALL error:', err.message);
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

module.exports = router;