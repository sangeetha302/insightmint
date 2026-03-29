const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// In-memory notes store (works without MongoDB)
const notesStore = {};

const getKey = (userId) => userId || 'guest';

router.get('/', auth, (req, res) => {
  const notes = notesStore[getKey(req.userId)] || [];
  res.json({ notes });
});

router.post('/', auth, (req, res) => {
  const { title, content, topic, type = 'custom' } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const key = getKey(req.userId);
  if (!notesStore[key]) notesStore[key] = [];
  const note = {
    id: Date.now().toString(),
    title,
    content: content || '',
    topic: topic || '',
    type, // 'custom' | 'summary' | 'ai generated'
    createdAt: new Date(),
    updatedAt: new Date()
  };
  notesStore[key].unshift(note);
  res.json({ note });
});

router.put('/:id', auth, (req, res) => {
  const key = getKey(req.userId);
  const notes = notesStore[key] || [];
  const idx = notes.findIndex(n => n.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Note not found' });
  notes[idx] = { ...notes[idx], ...req.body, updatedAt: new Date() };
  res.json({ note: notes[idx] });
});

router.delete('/:id', auth, (req, res) => {
  const key = getKey(req.userId);
  notesStore[key] = (notesStore[key] || []).filter(n => n.id !== req.params.id);
  res.json({ success: true });
});

module.exports = router;