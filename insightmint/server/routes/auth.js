const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// In-memory users for mock mode
const mockUsers = [];

let User;
try {
  User = require('../models/User');
} catch (e) { User = null; }

const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET || 'insightmint_secret', { expiresIn: '7d' });

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'All fields required' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const user = await User.create({ name, email, password });
    const token = generateToken(user._id);
    console.log('✅ New user saved to MongoDB:', email);
    return res.json({ token, user: { id: user._id, name, email } });
  } catch (err) {
    console.error('❌ Signup error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(400).json({ error: 'Invalid credentials' });

    const token = generateToken(user._id);
    console.log('✅ User logged in:', email);
    return res.json({ token, user: { id: user._id, name: user.name, email } });
  } catch (err) {
    console.error('❌ Login error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;