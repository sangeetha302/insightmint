// routes/studyBuddy.js
const express = require('express');
const router  = express.Router();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL   = 'llama-3.1-8b-instant';

// ── Auth middleware ───────────────────────────────────────
function requireAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const jwt     = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId    = decoded.userId || decoded.id || decoded._id;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ── Compatibility calculation helpers ─────────────────────

// Topic similarity: Jaccard index × 100
function topicScore(topicsA, topicsB) {
  if (!topicsA?.length || !topicsB?.length) return 0;
  const setA = new Set(topicsA.map(t => t.toLowerCase()));
  const setB = new Set(topicsB.map(t => t.toLowerCase()));
  const intersection = [...setA].filter(t => setB.has(t)).length;
  const union        = new Set([...setA, ...setB]).size;
  return Math.round((intersection / union) * 100);
}

// Speed similarity: exact=100, adjacent=55, opposite=10
function speedScore(a, b) {
  const ORDER = { slow: 0, medium: 1, fast: 2 };
  if (!a || !b) return 50;
  const diff = Math.abs((ORDER[a] ?? 1) - (ORDER[b] ?? 1));
  return diff === 0 ? 100 : diff === 1 ? 55 : 10;
}

// Activity similarity: exact=100, adjacent=60, opposite=20
function activityScore(a, b) {
  const ORDER = { low: 0, medium: 1, high: 2 };
  if (!a || !b) return 50;
  const diff = Math.abs((ORDER[a] ?? 1) - (ORDER[b] ?? 1));
  return diff === 0 ? 100 : diff === 1 ? 60 : 20;
}

// Weighted overall score: topics 50%, speed 30%, activity 20%
function overallCompatibility(topicsA, topicsB, speedA, speedB, actA, actB) {
  const ts = topicScore(topicsA, topicsB);
  const ss = speedScore(speedA, speedB);
  const as_ = activityScore(actA, actB);
  return {
    total:    Math.round(ts * 0.50 + ss * 0.30 + as_ * 0.20),
    breakdown: { topics: ts, speed: ss, activity: as_ },
  };
}

function commonTopics(topicsA, topicsB) {
  if (!topicsA?.length || !topicsB?.length) return [];
  const setB = new Set(topicsB.map(t => t.toLowerCase()));
  return topicsA.filter(t => setB.has(t.toLowerCase()));
}

// ── Groq: generate friendly recommendation explanation ────
async function generateExplanation({ myProfile, aiMatch, friendMatch }) {
  const prompt = `You are a friendly study advisor helping students find study partners.

Student's profile:
- Name: ${myProfile.name}
- Topics: ${myProfile.topics.join(', ')}
- Learning speed: ${myProfile.speed}
- Activity: ${myProfile.activity}

${aiMatch ? `Best AI-matched partner:
- Name: ${aiMatch.name}
- Compatibility: ${aiMatch.compatibility}%
- Common topics: ${aiMatch.commonTopics?.join(', ') || 'none'}
- Speed match: ${aiMatch.breakdown.speed}%, Activity match: ${aiMatch.breakdown.activity}%` : 'No AI match found (not enough users).'}

${friendMatch ? `Invited friend:
- Name: ${friendMatch.name}
- Compatibility: ${friendMatch.compatibility}%` : 'No friend was invited for comparison.'}

Based on this data, give:
1. A short title (max 8 words) for the recommendation
2. A recommendation type: "ai" (study with AI match), "friend" (study with friend), or "both" (group study)
3. A 2-3 sentence friendly explanation for why this recommendation makes sense

Return ONLY this JSON:
{
  "title": "short recommendation title",
  "type": "ai|friend|both",
  "explanation": "2-3 friendly sentences explaining the recommendation"
}`;

  try {
    const res  = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: 'You are a helpful study advisor. Always respond with valid JSON only.' },
          { role: 'user',   content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch {
    // Fallback recommendation
    if (aiMatch && friendMatch) {
      const winner = aiMatch.compatibility >= friendMatch.compatibility ? 'ai' : 'friend';
      return {
        type: aiMatch.compatibility > 0 && friendMatch.compatibility > 0 &&
              Math.abs(aiMatch.compatibility - friendMatch.compatibility) < 15 ? 'both' : winner,
        title: winner === 'ai' ? 'Go with the AI Match!' : 'Your Friend is a Great Fit!',
        explanation: `Both ${aiMatch.name} and ${friendMatch.name} are good options for you. ${aiMatch.compatibility >= friendMatch.compatibility
          ? `The AI match scores slightly higher at ${aiMatch.compatibility}% vs ${friendMatch.compatibility}%.`
          : `Your friend scores ${friendMatch.compatibility}% vs the AI match at ${aiMatch.compatibility}%.`} Consider a group session for extra motivation!`,
      };
    }
    if (aiMatch) return { type: 'ai', title: `${aiMatch.name} is your best match!`, explanation: `With ${aiMatch.compatibility}% compatibility, ${aiMatch.name} aligns well with your study style and topics. Reach out and start studying together!` };
    return { type: 'friend', title: 'Study with your friend!', explanation: `Your friend is ready to study with you. Check your common topics and set a schedule together!` };
  }
}

// ── GET /api/study-buddy/search-users ────────────────────
router.get('/search-users', requireAuth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ users: [] });

    // Try to find users from your existing User model
    let User;
    try { User = require('../models/User'); } catch { User = null; }

    if (!User) return res.json({ users: [] });

    const users = await User.find({
      _id:   { $ne: req.userId }, // exclude self
      $or: [
        { name:  { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ],
    })
    .select('name email studyProfile')
    .limit(8)
    .lean();

    res.json({ users });
  } catch (err) {
    console.error('Search users error:', err.message);
    res.json({ users: [] });
  }
});

// ── POST /api/study-buddy/match ───────────────────────────
router.post('/match', requireAuth, async (req, res) => {
  const { myProfile, friend } = req.body;

  if (!myProfile?.topics?.length) {
    return res.status(400).json({ error: 'Profile with topics required' });
  }

  try {
    // ── 1. Find available users from DB ──────────────────
    let availableUsers = [];
    try {
      const User = require('../models/User');
      const dbUsers = await User.find({
        _id: { $ne: req.userId },
        'studyProfile.topics': { $exists: true, $not: { $size: 0 } },
      })
      .select('name email studyProfile')
      .limit(100)
      .lean();

      availableUsers = dbUsers.map(u => ({
        id:       u._id.toString(),
        name:     u.name,
        email:    u.email,
        topics:   u.studyProfile?.topics   || [],
        speed:    u.studyProfile?.speed    || 'medium',
        activity: u.studyProfile?.activity || 'medium',
      }));
    } catch { /* model not found or no users — proceed with empty */ }

    // ── 2. If no users with studyProfile, use mock pool ──
    // (Remove this block once real users populate studyProfile)
    if (availableUsers.length === 0) {
      availableUsers = [
        { id: 'mock1', name: 'Priya Sharma',  email: 'priya@example.com',  topics: ['Mathematics', 'Physics', 'Computer Science'], speed: 'medium', activity: 'high' },
        { id: 'mock2', name: 'Arjun Mehta',   email: 'arjun@example.com',  topics: ['Machine Learning', 'Data Science', 'Python'],  speed: 'fast',   activity: 'high' },
        { id: 'mock3', name: 'Sneha Reddy',   email: 'sneha@example.com',  topics: ['Biology', 'Chemistry', 'Medicine'],            speed: 'slow',   activity: 'medium' },
        { id: 'mock4', name: 'Rahul Verma',   email: 'rahul@example.com',  topics: ['Web Development', 'Design', 'Computer Science'], speed: 'fast', activity: 'medium' },
        { id: 'mock5', name: 'Ananya Gupta',  email: 'ananya@example.com', topics: ['Economics', 'Business', 'Mathematics'],        speed: 'medium', activity: 'low' },
        { id: 'mock6', name: 'Dev Patel',     email: 'dev@example.com',    topics: ['History', 'Philosophy', 'Literature'],         speed: 'slow',   activity: 'medium' },
        { id: 'mock7', name: 'Kavya Nair',    email: 'kavya@example.com',  topics: ['Psychology', 'Law', 'Philosophy'],             speed: 'medium', activity: 'high' },
        { id: 'mock8', name: 'Vikram Singh',  email: 'vikram@example.com', topics: ['Engineering', 'Physics', 'Mathematics'],       speed: 'fast',   activity: 'high' },
      ];
    }

    // ── 3. Score all available users ─────────────────────
    const scored = availableUsers.map(u => {
      const { total, breakdown } = overallCompatibility(
        myProfile.topics, u.topics,
        myProfile.speed,  u.speed,
        myProfile.activity, u.activity
      );
      return {
        ...u,
        compatibility: total,
        breakdown,
        commonTopics: commonTopics(myProfile.topics, u.topics),
      };
    }).sort((a, b) => b.compatibility - a.compatibility);

    const aiMatch = scored[0] || null;

    // ── 4. Score the friend (if provided) ─────────────────
    let friendMatch = null;
    if (friend?.name) {
      const friendTopics   = friend.topics   || [];
      const friendSpeed    = friend.speed    || 'medium';
      const friendActivity = friend.activity || 'medium';

      const { total, breakdown } = overallCompatibility(
        myProfile.topics, friendTopics,
        myProfile.speed,  friendSpeed,
        myProfile.activity, friendActivity
      );

      friendMatch = {
        name:         friend.name,
        email:        friend.email || null,
        topics:       friendTopics,
        compatibility: total,
        breakdown,
        commonTopics: commonTopics(myProfile.topics, friendTopics),
      };
    }

    // ── 5. AI-generated recommendation ───────────────────
    const recommendation = await generateExplanation({ myProfile, aiMatch, friendMatch });

    // ── 6. Save studyProfile for current user (for future matching) ──
    try {
      const User = require('../models/User');
      await User.findByIdAndUpdate(req.userId, {
        $set: {
          'studyProfile.topics':   myProfile.topics,
          'studyProfile.speed':    myProfile.speed,
          'studyProfile.activity': myProfile.activity,
          'studyProfile.updatedAt': new Date(),
        },
      });
    } catch { /* ignore if User model differs */ }

    res.json({ aiMatch, friendMatch, recommendation, totalPool: availableUsers.length });

  } catch (err) {
    console.error('Study buddy match error:', err.message);
    res.status(500).json({ error: 'Matching failed. Please try again.' });
  }
});

module.exports = router;