const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = 'llama-3.1-8b-instant';

const LANGUAGE_NAMES = {
  en: 'English', hi: 'Hindi', te: 'Telugu',
  ta: 'Tamil', zh: 'Chinese (Simplified)', fr: 'French'
};

async function callGroq(system, user) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      temperature: 0.7,
      max_tokens: 3000
    })
  });
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  try { return JSON.parse(text.replace(/```json|```/g, '').trim()); }
  catch { return null; }
}

// Generate quiz from topic
router.post('/generate', auth, async (req, res) => {
  const { topic, difficulty = 'intermediate', count = 8, language = 'en' } = req.body;
  if (!topic) return res.status(400).json({ error: 'Topic required' });
  const langName = LANGUAGE_NAMES[language] || 'English';

  const difficultyMap = {
    beginner: 'basic, conceptual questions suitable for beginners',
    intermediate: 'moderate questions requiring understanding of concepts',
    advanced: 'challenging questions requiring deep knowledge and application'
  };

  try {
    const result = await callGroq(
      `You are an expert quiz creator. Respond ONLY with valid JSON. Write all content in ${langName}.`,
      `Create ${count} multiple choice quiz questions about "${topic}" at ${difficulty} level (${difficultyMap[difficulty]}).
Write everything in ${langName}.

Return ONLY this JSON:
{
  "topic": "${topic}",
  "difficulty": "${difficulty}",
  "questions": [
    {
      "id": 1,
      "question": "Question text in ${langName}",
      "options": ["A) option text", "B) option text", "C) option text", "D) option text"],
      "correct": 1,
      "explanation": "Detailed explanation in ${langName} of why this answer is correct and why others are wrong"
    }
  ]
}

Rules:
- "correct" is the 0-based index of the correct option (0=A, 1=B, 2=C, 3=D)
- Options must start with "A) ", "B) ", "C) ", "D) "
- Explanations must be detailed and educational (2-3 sentences)
- Questions must be specific and test real knowledge
- Vary question types: definition, application, comparison, code-based (if programming topic)`
    );

    if (result?.questions) return res.json(result);
    throw new Error('Invalid response');
  } catch (err) {
    console.error('Quiz generate error:', err.message);
    // Fallback
    res.json({
      topic, difficulty,
      questions: generateFallbackQuiz(topic, count)
    });
  }
});

// Generate quiz from document content
router.post('/from-document', auth, async (req, res) => {
  const { content, title, difficulty = 'intermediate', count = 8, language = 'en' } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });
  const langName = LANGUAGE_NAMES[language] || 'English';

  try {
    const result = await callGroq(
      `You are an expert quiz creator. Respond ONLY with valid JSON. Write all content in ${langName}.`,
      `Based on the following document content, create ${count} multiple choice questions at ${difficulty} level.
Document: "${title || 'Uploaded Document'}"

Content:
${content.slice(0, 4000)}

Write everything in ${langName}. Return ONLY this JSON:
{
  "topic": "${title || 'Document Quiz'}",
  "difficulty": "${difficulty}",
  "questions": [
    {
      "id": 1,
      "question": "Question based on the document content in ${langName}",
      "options": ["A) option", "B) option", "C) option", "D) option"],
      "correct": 0,
      "explanation": "Explanation referencing the document content in ${langName}"
    }
  ]
}

Rules:
- Questions MUST be based on the actual document content
- "correct" is the 0-based index (0=A, 1=B, 2=C, 3=D)
- Options start with "A) ", "B) ", "C) ", "D) "
- Explanations should reference specific information from the document`
    );

    if (result?.questions) return res.json(result);
    throw new Error('Invalid response');
  } catch (err) {
    console.error('Doc quiz error:', err.message);
    res.status(500).json({ error: 'Failed to generate quiz from document' });
  }
});

function generateFallbackQuiz(topic, count) {
  const questions = [
    { id: 1, question: `What is the primary purpose of ${topic}?`, options: ['A) Entertainment only', 'B) Solving complex problems efficiently', 'C) Only for data analysis', 'D) Exclusively server-side use'], correct: 1, explanation: `${topic} is primarily used to solve complex problems and build efficient applications across many domains.` },
    { id: 2, question: `Which is a best practice in ${topic}?`, options: ['A) Writing very long functions', 'B) Avoiding all documentation', 'C) Writing clean, modular, readable code', 'D) Never testing your code'], correct: 2, explanation: `Clean, modular, well-documented code is the professional standard in ${topic} development.` },
    { id: 3, question: `What is the recommended approach to learn ${topic}?`, options: ['A) Jump to advanced topics immediately', 'B) Build progressively from foundations', 'C) Only memorize syntax', 'D) Watch videos without practicing'], correct: 1, explanation: `Progressive learning ensures each concept is understood before moving to more complex ones.` },
    { id: 4, question: `How should you handle errors in ${topic}?`, options: ['A) Ignore all errors', 'B) Restart the program', 'C) Handle them gracefully with try/catch patterns', 'D) Delete the error code'], correct: 2, explanation: `Proper error handling prevents crashes and improves user experience.` },
    { id: 5, question: `Why are data structures important in ${topic}?`, options: ['A) They are not important', 'B) Only needed for databases', 'C) Enable efficient data organization and manipulation', 'D) Only for senior developers'], correct: 2, explanation: `Choosing the right data structure dramatically improves performance and code clarity.` },
  ];
  return questions.slice(0, count);
}

module.exports = router;