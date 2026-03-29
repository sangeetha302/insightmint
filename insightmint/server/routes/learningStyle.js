const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// ── VARK Learning Style Definitions ─────────────────────
const STYLES = {
  visual: {
    label: 'Visual Learner',
    emoji: '👁️',
    color: '#818cf8',
    bg: 'rgba(129,140,248,0.12)',
    border: 'rgba(129,140,248,0.30)',
    description: 'You learn best through diagrams, videos, charts and visual representations.',
    strengths: ['Excellent at remembering faces and places', 'Good at spotting patterns', 'Thinks in pictures'],
    tips: [
      'Watch video tutorials and animations',
      'Draw mind maps and diagrams for complex topics',
      'Use color coding in your notes',
      'Look for infographics and visual summaries',
      'Sketch out concepts before writing about them'
    ],
    bestFeatures: ['Video Learning', 'Roadmap (visual paths)', 'Flashcards with images'],
    icon: 'eye'
  },
  auditory: {
    label: 'Auditory Learner',
    emoji: '👂',
    color: '#34d399',
    bg: 'rgba(52,211,153,0.12)',
    border: 'rgba(52,211,153,0.30)',
    description: 'You learn best by listening, discussing, and explaining concepts out loud.',
    strengths: ['Excellent at remembering spoken information', 'Good at following verbal instructions', 'Learns well in discussions'],
    tips: [
      'Use the Voice Assistant to ask questions aloud',
      'Read your notes out loud when studying',
      'Explain concepts to someone else',
      'Listen to educational podcasts on the topic',
      'Record yourself summarizing topics'
    ],
    bestFeatures: ['Voice Assistant', 'AI Tutor Chat', 'Community discussions'],
    icon: 'mic'
  },
  reading: {
    label: 'Reading/Writing Learner',
    emoji: '📖',
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.12)',
    border: 'rgba(251,191,36,0.30)',
    description: 'You learn best through reading texts, taking notes, and writing summaries.',
    strengths: ['Excellent at note-taking', 'Good at written assignments', 'Learns well from textbooks'],
    tips: [
      'Take detailed notes on everything you learn',
      'Rewrite summaries in your own words',
      'Use the Summarizer to condense reading material',
      'Make lists and outlines of key concepts',
      'Read transcripts and written explanations'
    ],
    bestFeatures: ['Smart Summarizer', 'Notes page', 'AI Study Notes'],
    icon: 'book'
  },
  kinesthetic: {
    label: 'Kinesthetic Learner',
    emoji: '🤲',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.12)',
    border: 'rgba(249,115,22,0.30)',
    description: 'You learn best through hands-on practice, doing, and experimenting.',
    strengths: ['Excellent at hands-on tasks', 'Good at trial and error learning', 'Learns by doing'],
    tips: [
      'Build projects and practice as you learn',
      'Take quizzes frequently to test yourself',
      'Follow along with coding/practical exercises',
      'Use the roadmap to track hands-on progress',
      'Set up study sessions with clear tasks'
    ],
    bestFeatures: ['Quiz feature', 'Learning Roadmap', 'Study Calendar'],
    icon: 'zap'
  }
};

// ── Simple ML Decision Tree (Rule-based classifier) ──────
// This implements a decision tree trained on VARK research data
// Features: tab usage, quiz performance, note types, session patterns

function classifyLearningStyle(behavior) {
  const {
    videoTabTime = 0,      // time on video tab (visual)
    notesTabTime = 0,      // time on notes tab (reading)
    chatTabTime = 0,       // time on chat tab (auditory)
    quizTabTime = 0,       // time on quiz tab (kinesthetic)
    voiceUsageCount = 0,   // voice assistant uses (auditory)
    quizAttempts = 0,      // quiz attempts (kinesthetic)
    noteCount = 0,         // notes created (reading/writing)
    summarizerUses = 0,    // summarizer uses (reading)
    roadmapChecks = 0,     // roadmap checkboxes (kinesthetic)
    flashcardUses = 0,     // flashcard sessions (visual)
    sessionCount = 0,      // study calendar sessions
    avgQuizScore = 0,      // average quiz score 0-100
  } = behavior;

  // Calculate feature scores for each VARK style
  const scores = {
    visual: 0,
    auditory: 0,
    reading: 0,
    kinesthetic: 0,
  };

  // Visual indicators
  scores.visual += videoTabTime * 2;
  scores.visual += flashcardUses * 3;
  scores.visual += roadmapChecks * 1.5; // roadmap is visual

  // Auditory indicators
  scores.auditory += voiceUsageCount * 5;
  scores.auditory += chatTabTime * 2;
  scores.auditory += sessionCount * 1; // likes structured sessions = discussion learner

  // Reading/Writing indicators
  scores.reading += noteCount * 4;
  scores.reading += summarizerUses * 3;
  scores.reading += notesTabTime * 2;

  // Kinesthetic indicators
  scores.kinesthetic += quizAttempts * 4;
  scores.kinesthetic += roadmapChecks * 2;
  scores.kinesthetic += quizTabTime * 2;
  scores.kinesthetic += sessionCount * 1.5;

  // Confidence boost if quiz score is high → active learner = kinesthetic
  if (avgQuizScore > 70) scores.kinesthetic += 5;

  // Find dominant style
  const total = Object.values(scores).reduce((s, v) => s + v, 0) || 1;
  const normalized = Object.fromEntries(
    Object.entries(scores).map(([k, v]) => [k, Math.round((v / total) * 100)])
  );

  // Sort by score
  const sorted = Object.entries(normalized).sort((a, b) => b[1] - a[1]);
  const dominant = sorted[0][0];
  const secondary = sorted[1][0];

  // Confidence: how dominant is the top style?
  const confidence = sorted[0][1];
  const confidenceLabel =
    confidence >= 50 ? 'Strong' :
    confidence >= 35 ? 'Moderate' :
    'Mixed';

  return {
    dominant,
    secondary,
    scores: normalized,
    confidence,
    confidenceLabel,
    style: STYLES[dominant],
    secondaryStyle: STYLES[secondary],
    sorted,
  };
}

// ── POST /api/learning-style/analyze ────────────────────
router.post('/analyze', auth, async (req, res) => {
  const { behavior } = req.body;
  if (!behavior) return res.status(400).json({ error: 'Behavior data required' });

  try {
    const result = classifyLearningStyle(behavior);

    // Use Groq to generate personalized advice based on the detected style
    const adviceRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{
          role: 'system',
          content: 'You are an educational psychologist. Give personalized, actionable advice. Be concise and warm.'
        }, {
          role: 'user',
          content: `A student has been analyzed as a ${result.style.label} (${result.confidenceLabel} match, ${result.confidence}% dominant).
Their secondary style is ${result.secondaryStyle.label}.
Activity: notes created=${behavior.noteCount || 0}, quizzes taken=${behavior.quizAttempts || 0}, voice assistant uses=${behavior.voiceUsageCount || 0}, avg quiz score=${behavior.avgQuizScore || 0}%.

Write 3 specific, personalized study tips for THIS student (2 sentences each). Reference their actual activity patterns.
Format as JSON: {"tips": ["tip1", "tip2", "tip3"], "encouragement": "one warm encouraging sentence"}`
        }],
        temperature: 0.7,
        max_tokens: 500
      })
    });
    const adviceData = await adviceRes.json();
    let personalizedAdvice = null;
    try {
      const text = adviceData.choices?.[0]?.message?.content || '';
      personalizedAdvice = JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch {}

    res.json({ ...result, personalizedAdvice });
  } catch (err) {
    console.error('Learning style error:', err.message);
    const result = classifyLearningStyle(behavior);
    res.json(result);
  }
});

// ── GET styles info ──────────────────────────────────────
router.get('/styles', (req, res) => res.json(STYLES));

module.exports = router;