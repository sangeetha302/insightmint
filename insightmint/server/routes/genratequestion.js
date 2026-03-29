// ── POST /api/ai/generate-questions ──────────────────────
// Add this route to your existing ai.js router file (routes/ai.js)
// Place it BEFORE the module.exports line

router.post('/generate-questions', async (req, res) => {
  const { topic, document, numQuestions = 5, difficulty = 'intermediate', language = 'en' } = req.body;

  if (!topic && !document) {
    return res.status(400).json({ error: 'Topic or document content required' });
  }

  const langName = LANGUAGE_NAMES[language] || 'English';

  const difficultyGuide = {
    beginner:     'simple, foundational, recall-based questions suitable for beginners',
    intermediate: 'moderately challenging questions requiring understanding and application',
    advanced:     'deep, analytical questions requiring expert knowledge, analysis, and synthesis',
  };

  const sourceContext = document
    ? `Based on the following document content, generate questions that test understanding of the material:\n\n"""\n${document.slice(0, 6000)}\n"""`
    : `Generate questions about the topic: "${topic}"`;

  const systemPrompt = `You are an expert educator and question designer. 
Always respond with valid JSON only — no markdown, no extra text.
Write ALL question content in ${langName} language.`;

  const userPrompt = `${sourceContext}

Create exactly ${numQuestions} ${difficultyGuide[difficulty] || difficultyGuide.intermediate} questions in ${langName}.

Rules:
- Questions should require written explanation (not yes/no or multiple choice)
- Each question should test a different concept or aspect
- Questions should be clear and unambiguous
- Suitable for ${difficulty} level learners
${document ? '- Base questions ONLY on the provided document content' : '- Cover a broad range of sub-topics within the subject'}

Return ONLY this JSON:
{
  "topic": "${topic || 'Document'}",
  "questions": [
    { "id": 1, "question": "question text in ${langName}" },
    { "id": 2, "question": "question text in ${langName}" },
    { "id": 3, "question": "question text in ${langName}" }
  ]
}

Generate exactly ${numQuestions} questions. Each question must be a complete sentence ending with a question mark.`;

  try {
    const result = await callGroq(systemPrompt, userPrompt, true);

    if (result?.questions && Array.isArray(result.questions)) {
      return res.json({
        topic: result.topic || topic,
        questions: result.questions.slice(0, numQuestions),
      });
    }
    throw new Error('Invalid response structure');
  } catch (err) {
    console.error('Generate questions error:', err.message);

    // Fallback questions if AI fails
    const fallbackQuestions = [
      { id: 1, question: `What are the core principles of ${topic || 'this topic'} and why are they important?` },
      { id: 2, question: `How does ${topic || 'this concept'} work in practice? Give a real-world example.` },
      { id: 3, question: `What are the most common challenges or mistakes related to ${topic || 'this subject'}?` },
      { id: 4, question: `Compare and contrast the different approaches or methods used in ${topic || 'this field'}.` },
      { id: 5, question: `What are the key benefits and limitations of ${topic || 'this technology or concept'}?` },
      { id: 6, question: `How has ${topic || 'this field'} evolved over time and what are the current trends?` },
      { id: 7, question: `Explain the relationship between the main components of ${topic || 'this subject'}.` },
      { id: 8, question: `What best practices should one follow when working with ${topic || 'this topic'}?` },
      { id: 9, question: `How would you apply knowledge of ${topic || 'this subject'} to solve a complex problem?` },
      { id: 10, question: `What are the future implications or developments expected in ${topic || 'this area'}?` },
    ];

    res.json({
      topic: topic || 'General',
      questions: fallbackQuestions.slice(0, numQuestions),
    });
  }
});