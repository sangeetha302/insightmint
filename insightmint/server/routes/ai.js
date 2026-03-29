const express = require('express');
const router = express.Router();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = 'llama-3.1-8b-instant';

const LANGUAGE_NAMES = {
  en: 'English',
  hi: 'Hindi',
  te: 'Telugu',
  ta: 'Tamil',
  zh: 'Chinese (Simplified)',
  fr: 'French'
};

async function callGroq(systemPrompt, userPrompt, json = false) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })
  });
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  if (json) {
    try {
      const cleaned = text.replace(/```json|```/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
  return text;
}

// ── Summary ──────────────────────────────────────────────
router.post('/summary', async (req, res) => {
  const { topic, videoTitle, title, language = 'en', customPrompt } = req.body;
  if (!topic) return res.status(400).json({ error: 'Topic required' });
  const langName = LANGUAGE_NAMES[language] || 'English';
  const videoName = videoTitle || title || topic;

  const systemPrompt = customPrompt
    ? `You are an expert educational content creator. Always respond with valid JSON only, no markdown, no extra text. Write ALL content in ${langName} language.
SPECIAL INSTRUCTION FROM STUDENT: "${customPrompt}"
Apply this instruction when generating the study notes — adjust tone, depth, style, and focus based on what the student asked for.`
    : `You are an expert educational content creator. Always respond with valid JSON only, no markdown, no extra text. Write ALL content in ${langName} language.`;

  const userPrompt = customPrompt
    ? `Create study notes for the topic "${topic}" based on the video "${videoName}".
The student has given this specific instruction: "${customPrompt}"
Write everything in ${langName}, following the student's instruction for tone, style, depth and focus.
Return ONLY this JSON:
{
  "summary": "summary following student's instruction in ${langName}",
  "keyPoints": ["point 1", "point 2", "point 3", "point 4", "point 5", "point 6"],
  "studyNotes": {
    "overview": "overview following student's instruction in ${langName}",
    "sections": [
      { "title": "Section 1", "content": "content following student instruction" },
      { "title": "Section 2", "content": "content following student instruction" },
      { "title": "Section 3", "content": "content following student instruction" },
      { "title": "Section 4", "content": "content following student instruction" }
    ]
  }
}`
    : `Create detailed study notes for the topic "${topic}" based on a video titled "${videoName}".
Write everything in ${langName} language.
Return ONLY this JSON:
{
  "summary": "2-3 paragraph comprehensive summary in ${langName}",
  "keyPoints": ["point 1 in ${langName}", "point 2", "point 3", "point 4", "point 5", "point 6", "point 7"],
  "studyNotes": {
    "overview": "one paragraph overview in ${langName}",
    "sections": [
      { "title": "1. Foundations", "content": "detailed content in ${langName}" },
      { "title": "2. Core Concepts", "content": "detailed content in ${langName}" },
      { "title": "3. Practical Application", "content": "detailed content in ${langName}" },
      { "title": "4. Advanced Topics", "content": "detailed content in ${langName}" }
    ]
  }
}`;

  try {
    const result = await callGroq(systemPrompt, userPrompt, true);
    if (result) return res.json(result);
    throw new Error('Invalid response');
  } catch (err) {
    console.error('Groq summary error:', err.message);
    res.json({
      summary: `This video provides a comprehensive introduction to ${topic}, covering core concepts, practical applications, and best practices.`,
      keyPoints: [
        `Introduction to ${topic}`, `Core concepts`, `Hands-on examples`,
        `Common mistakes to avoid`, `Best practices`, `Building your first project`, `Resources for learning`
      ],
      studyNotes: {
        overview: `${topic} is a fundamental skill in modern technology.`,
        sections: [
          { title: '1. Foundations', content: `Understanding the basics of ${topic} is essential.` },
          { title: '2. Core Concepts', content: `Key concepts include data structures and algorithms.` },
          { title: '3. Practical Application', content: `Apply knowledge by building small projects.` },
          { title: '4. Advanced Topics', content: `Explore performance optimization and design patterns.` }
        ]
      }
    });
  }
});

// ── Flashcards ────────────────────────────────────────────
router.post('/flashcards', async (req, res) => {
  const { topic, language = 'en' } = req.body;
  if (!topic) return res.status(400).json({ error: 'Topic required' });
  const langName = LANGUAGE_NAMES[language] || 'English';

  try {
    const result = await callGroq(
      `You are an expert educator. Always respond with valid JSON only, no markdown. Write ALL content in ${langName} language.`,
      `Create 8 flashcards for learning "${topic}". Write questions and answers in ${langName}.
Return ONLY this JSON:
{
  "flashcards": [
    { "id": 1, "front": "question in ${langName}", "back": "detailed answer in ${langName}" },
    { "id": 2, "front": "question in ${langName}", "back": "detailed answer in ${langName}" },
    { "id": 3, "front": "question in ${langName}", "back": "detailed answer in ${langName}" },
    { "id": 4, "front": "question in ${langName}", "back": "detailed answer in ${langName}" },
    { "id": 5, "front": "question in ${langName}", "back": "detailed answer in ${langName}" },
    { "id": 6, "front": "question in ${langName}", "back": "detailed answer in ${langName}" },
    { "id": 7, "front": "question in ${langName}", "back": "detailed answer in ${langName}" },
    { "id": 8, "front": "question in ${langName}", "back": "detailed answer in ${langName}" }
  ]
}`,
      true
    );

    if (result?.flashcards) return res.json(result);
    throw new Error('Invalid response');
  } catch (err) {
    console.error('Groq flashcards error:', err.message);
    res.json({
      flashcards: [
        { id: 1, front: `What is ${topic}?`, back: `${topic} is a fundamental technology for building modern applications efficiently.` },
        { id: 2, front: `Core concepts of ${topic}?`, back: `Basic syntax, data management, control flow, functions, and error handling.` },
        { id: 3, front: `Best practices in ${topic}?`, back: `Write clean code, document thoroughly, test regularly, handle errors gracefully.` },
        { id: 4, front: `How to debug in ${topic}?`, back: `Use debugging tools, add logging, isolate the problem, read error messages carefully.` },
        { id: 5, front: `Tools used with ${topic}?`, back: `Git, package managers, testing frameworks, build tools, and IDEs.` },
        { id: 6, front: `What is abstraction in ${topic}?`, back: `Hiding complexity and exposing only what's necessary to reduce cognitive load.` },
        { id: 7, front: `Why is modularity important?`, back: `It improves maintainability, enables reuse, and makes testing easier.` },
        { id: 8, front: `How to get started with ${topic}?`, back: `Read docs, follow tutorials, build small projects, join communities, practice daily.` }
      ]
    });
  }
});

// ── Quiz ──────────────────────────────────────────────────
router.post('/quiz', async (req, res) => {
  const { topic, language = 'en' } = req.body;
  if (!topic) return res.status(400).json({ error: 'Topic required' });
  const langName = LANGUAGE_NAMES[language] || 'English';

  try {
    const result = await callGroq(
      `You are an expert educator. Always respond with valid JSON only, no markdown. Write ALL content in ${langName} language.`,
      `Create 5 multiple choice quiz questions about "${topic}" in ${langName} language.
Return ONLY this JSON:
{
  "quiz": [
    { "id": 1, "question": "question in ${langName}", "options": ["option A", "option B", "option C", "option D"], "correct": 0, "explanation": "explanation in ${langName}" },
    { "id": 2, "question": "question in ${langName}", "options": ["option A", "option B", "option C", "option D"], "correct": 1, "explanation": "explanation in ${langName}" },
    { "id": 3, "question": "question in ${langName}", "options": ["option A", "option B", "option C", "option D"], "correct": 2, "explanation": "explanation in ${langName}" },
    { "id": 4, "question": "question in ${langName}", "options": ["option A", "option B", "option C", "option D"], "correct": 1, "explanation": "explanation in ${langName}" },
    { "id": 5, "question": "question in ${langName}", "options": ["option A", "option B", "option C", "option D"], "correct": 2, "explanation": "explanation in ${langName}" }
  ]
}
The "correct" field is the 0-based index of the correct option.`,
      true
    );

    if (result?.quiz) return res.json(result);
    throw new Error('Invalid response');
  } catch (err) {
    console.error('Groq quiz error:', err.message);
    res.json({
      quiz: [
        { id: 1, question: `What is the primary purpose of ${topic}?`, options: ['Entertainment only', 'Solving problems and building apps efficiently', 'Only for data analysis', 'Server-side only'], correct: 1, explanation: `${topic} is used to solve complex problems and build scalable applications.` },
        { id: 2, question: `Best approach to learn ${topic}?`, options: ['Jump to advanced topics', 'Build progressively from foundations', 'Memorize syntax first', 'Only watch videos'], correct: 1, explanation: `Progressive learning ensures understanding before complexity.` },
        { id: 3, question: `Which is a best practice in ${topic}?`, options: ['Long complex functions', 'Avoid documentation', 'Clean readable modular code', 'Never test code'], correct: 2, explanation: `Clean, modular, documented code is professional standard.` },
        { id: 4, question: `Most effective debugging approach?`, options: ['Restart and hope', 'Isolate problem systematically', 'Delete and rewrite', 'Ignore errors'], correct: 1, explanation: `Systematic debugging is the most reliable approach.` },
        { id: 5, question: `Why are data structures important?`, options: ['They are not', 'Only for seniors', 'Enable efficient data organization', 'Only for databases'], correct: 2, explanation: `Right data structures dramatically improve performance.` }
      ]
    });
  }
});

// ── Roadmap ───────────────────────────────────────────────
router.post('/roadmap', async (req, res) => {
  const { topic, language = 'en' } = req.body;
  if (!topic) return res.status(400).json({ error: 'Topic required' });
  const langName = LANGUAGE_NAMES[language] || 'English';

  try {
    const result = await callGroq(
      `You are an expert learning coach. Always respond with valid JSON only, no markdown. Write ALL content in ${langName} language.`,
      `Create a 5-stage learning roadmap for mastering "${topic}" in ${langName} language.
Return ONLY this JSON:
{
  "topic": "${topic}",
  "stages": [
    { "stage": 1, "title": "stage name", "duration": "X-Y weeks", "color": "#6366f1", "skills": ["skill 1", "skill 2", "skill 3", "skill 4"], "resources": ["resource 1", "resource 2", "resource 3"] },
    { "stage": 2, "title": "stage name", "duration": "X-Y weeks", "color": "#8b5cf6", "skills": ["skill 1", "skill 2", "skill 3", "skill 4"], "resources": ["resource 1", "resource 2", "resource 3"] },
    { "stage": 3, "title": "stage name", "duration": "X-Y weeks", "color": "#a855f7", "skills": ["skill 1", "skill 2", "skill 3", "skill 4"], "resources": ["resource 1", "resource 2", "resource 3"] },
    { "stage": 4, "title": "stage name", "duration": "X-Y weeks", "color": "#c084fc", "skills": ["skill 1", "skill 2", "skill 3", "skill 4"], "resources": ["resource 1", "resource 2", "resource 3"] },
    { "stage": 5, "title": "stage name", "duration": "Ongoing",   "color": "#e879f9", "skills": ["skill 1", "skill 2", "skill 3", "skill 4"], "resources": ["resource 1", "resource 2", "resource 3"] }
  ]
}`,
      true
    );

    if (result?.stages) return res.json(result);
    throw new Error('Invalid response');
  } catch (err) {
    console.error('Groq roadmap error:', err.message);
    res.json({
      topic,
      stages: [
        { stage: 1, title: 'Foundations',        duration: '2-3 weeks',  color: '#6366f1', skills: [`${topic} basics`, 'Setup environment', 'Core terminology', 'First project'],        resources: ['Official docs', 'Beginner tutorials', 'Coding platforms'] },
        { stage: 2, title: 'Core Concepts',       duration: '4-6 weeks',  color: '#8b5cf6', skills: ['Data structures', 'Control flow', 'Functions', 'Error handling'],                  resources: ['Intermediate courses', 'Practice problems', 'Code challenges'] },
        { stage: 3, title: 'Practical Projects',  duration: '6-8 weeks',  color: '#a855f7', skills: ['Real applications', 'Working with APIs', 'Database integration', 'Testing'],       resources: ['Project tutorials', 'Open source', 'GitHub portfolio'] },
        { stage: 4, title: 'Advanced Skills',     duration: '8-12 weeks', color: '#c084fc', skills: ['Optimization', 'Design patterns', 'Security', 'DevOps'],                           resources: ['Advanced books', 'Conferences', 'Technical blogs'] },
        { stage: 5, title: 'Mastery',             duration: 'Ongoing',    color: '#e879f9', skills: ['Open source', 'Mentoring', 'Specialization', 'Certifications'],                   resources: ['Community', 'Networking', 'Continuous learning'] }
      ]
    });
  }
});

// ── Chat ──────────────────────────────────────────────────
router.post('/chat', async (req, res) => {
  const { message, topic, history = [], language = 'en', systemPrompt } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });
  const langName = LANGUAGE_NAMES[language] || 'English';

  try {
    const sysContent = systemPrompt ||
      `You are an expert AI tutor helping a student learn about "${topic}".
IMPORTANT: Always respond in ${langName} language only.
Be concise, friendly, and educational. Give practical examples when helpful.
Keep responses under 150 words.`;

    const messages = [
      { role: 'system', content: sysContent },
      ...history.slice(-6).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: GROQ_MODEL, messages, temperature: 0.7, max_tokens: 300 })
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;
    if (reply) return res.json({ response: reply, reply });
    throw new Error('No response');
  } catch (err) {
    console.error('Groq chat error:', err.message);
    const fallback = `Great question about ${topic}! Focus on understanding the core principles — that knowledge will help you apply concepts flexibly. Would you like me to explain further?`;
    res.json({ response: fallback, reply: fallback });
  }
});

// ── Note Improver (improve-notes) ────────────────────────
router.post('/improve-notes', async (req, res) => {
  const { content, title, style = 'structured', language = 'en' } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content required' });
  const langName = LANGUAGE_NAMES[language] || 'English';

  const stylePrompts = {
    structured: 'Rewrite as clean, well-structured notes with clear headings, bullet points for key points, and organized sections.',
    concise:    'Rewrite as ultra-concise notes — remove all fluff, keep only the essential points in short bullets.',
    detailed:   'Expand and enrich these notes with more detail, examples, and explanations while keeping them organized.',
    exam:       'Rewrite as exam-ready revision notes — highlight key definitions, important facts, and potential exam questions.',
  };

  try {
    const result = await callGroq(
      `You are an expert note-taking assistant. Rewrite student notes to be clear, organized and useful. Respond in ${langName}.`,
      `Here are a student's rough notes about "${title || 'a topic'}":

${content.slice(0, 3000)}

Task: ${stylePrompts[style] || stylePrompts.structured}

Rules:
- Write in ${langName}
- Keep all important information from the original
- Add structure with ## headings
- Use bullet points (- ) for lists
- Bold (**text**) key terms and definitions
- Add a "## Key Takeaways" section at the end with 3-5 main points
- Do NOT add information that wasn't in the original notes`
    );

    res.json({ improved: result, style, success: true });
  } catch (err) {
    console.error('Note improve error:', err.message);
    res.status(500).json({ error: 'Failed to improve notes' });
  }
});

// ── Note Improver (improve-note) ─────────────────────────
router.post('/improve-note', async (req, res) => {
  const { content, title, style = 'structured', language = 'en' } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });
  const langName = LANGUAGE_NAMES[language] || 'English';

  const stylePrompts = {
    structured: `Rewrite these rough notes into well-structured, clean study notes with clear headings, organized points, and proper formatting.`,
    concise:    `Rewrite these notes into a concise, bullet-point summary. Remove redundancy, keep only the most important points.`,
    detailed:   `Expand and improve these rough notes into comprehensive study notes. Add explanations, examples, and context where helpful.`,
    exam:       `Rewrite these notes in exam-ready format: key definitions highlighted, important formulas/concepts clearly listed, memory tips included.`,
  };

  try {
    const result = await callGroq(
      `You are an expert note editor and educator. Always respond in ${langName}. Output only the improved notes, no preamble.`,
      `${stylePrompts[style] || stylePrompts.structured}

Title: "${title || 'Notes'}"
Original rough notes:
${content.slice(0, 3000)}

Write the improved version in ${langName}. Use markdown formatting (## headings, - bullets, **bold** for key terms).`
    );

    res.json({ improved: result, style, success: true });
  } catch (err) {
    console.error('Note improve error:', err.message);
    res.status(500).json({ error: 'Failed to improve notes' });
  }
});

// ── Flowchart Generator ───────────────────────────────────
router.post('/flowchart', async (req, res) => {
  const { topic, type = 'concept' } = req.body;
  if (!topic) return res.status(400).json({ error: 'Topic required' });

  const typePrompts = {
    concept:  `Create a concept flow diagram showing how the main ideas of "${topic}" connect and flow from basic to advanced.`,
    process:  `Create a process flowchart showing the step-by-step algorithm or procedure for "${topic}".`,
    decision: `Create a decision tree flowchart for "${topic}" showing key decision points and their outcomes.`,
  };

  try {
    const result = await callGroq(
      `You are an expert at creating educational flowcharts. Always respond with valid JSON only, no markdown.`,
      `${typePrompts[type] || typePrompts.concept}

Create a flowchart with 6-10 nodes. Return ONLY this JSON structure:
{
  "title": "Flowchart title",
  "description": "Brief explanation of what this flowchart shows",
  "nodes": [
    { "id": "1", "label": "Start: Introduction to ${topic}", "type": "start" },
    { "id": "2", "label": "Step or concept description",     "type": "process" },
    { "id": "3", "label": "Decision or question?",           "type": "decision" },
    { "id": "4", "label": "Input or Output description",     "type": "io" },
    { "id": "5", "label": "End: Conclusion",                 "type": "end" }
  ],
  "edges": [
    { "from": "1", "to": "2", "label": "" },
    { "from": "2", "to": "3", "label": "" },
    { "from": "3", "to": "4", "label": "Yes" },
    { "from": "4", "to": "5", "label": "" }
  ]
}
Node types: "start" (oval, purple), "end" (oval, green), "process" (rectangle), "decision" (diamond), "io" (parallelogram).
Make labels concise (max 8 words).`,
      true
    );

    if (result) return res.json(result);
    throw new Error('Invalid response');
  } catch (err) {
    console.error('Flowchart error:', err.message);
    res.status(500).json({ error: 'Failed to generate flowchart' });
  }
});

// ── Evaluate Answer ───────────────────────────────────────
router.post('/evaluate-answer', async (req, res) => {
  const { question, answer, topic, difficulty = 'intermediate', language = 'en' } = req.body;
  if (!question || !answer) return res.status(400).json({ error: 'Question and answer required' });
  const langName = LANGUAGE_NAMES[language] || 'English';

  const systemPrompt = `You are a strict but fair academic evaluator and teacher. 
Evaluate student answers like a professor would — critically, constructively, and honestly.
Always respond ONLY with valid JSON. Write all content in ${langName}.`;

  const userPrompt = `Evaluate this student answer using a detailed rubric.

Topic: ${topic || 'General'}
Difficulty: ${difficulty}
Question: ${question}
Student Answer: ${answer}

Score this answer on FIVE rubric dimensions (each out of 2 marks = 10 total):
1. Accuracy (Is the information correct?)
2. Completeness (Are all key points covered?)
3. Clarity (Is it well explained and structured?)
4. Depth (Is there enough detail and examples?)
5. Relevance (Does it directly answer the question?)

Return ONLY this JSON:
{
  "totalScore": <number 0-10>,
  "grade": "<A+/A/B+/B/C/D/F>",
  "rubric": [
    { "dimension": "Accuracy",     "score": <0-2>, "comment": "brief comment" },
    { "dimension": "Completeness", "score": <0-2>, "comment": "brief comment" },
    { "dimension": "Clarity",      "score": <0-2>, "comment": "brief comment" },
    { "dimension": "Depth",        "score": <0-2>, "comment": "brief comment" },
    { "dimension": "Relevance",    "score": <0-2>, "comment": "brief comment" }
  ],
  "overallFeedback": "2-3 sentence overall assessment",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["specific improvement 1", "specific improvement 2", "specific improvement 3"],
  "modelAnswer": "A concise ideal answer in 3-5 sentences",
  "encouragement": "One motivating sentence for the student"
}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        temperature: 0.3,
        max_tokens: 1500,
      })
    });
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const result = JSON.parse(text.replace(/```json|```/g, '').trim());
    res.json(result);
  } catch (err) {
    console.error('Evaluate error:', err.message);
    res.status(500).json({ error: 'Evaluation failed. Please try again.' });
  }
});

// ── Generate Questions ────────────────────────────────────
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
- Questions must require written explanation (not yes/no or multiple choice)
- Each question should test a different concept or aspect
- Questions must be clear and unambiguous
- Suitable for ${difficulty} level learners
${document ? '- Base questions ONLY on the provided document content' : '- Cover a broad range of sub-topics within the subject'}

Return ONLY this JSON (no extra text, no markdown):
{
  "topic": "${topic || 'Document'}",
  "questions": [
    { "id": 1, "question": "First question text here?" },
    { "id": 2, "question": "Second question text here?" },
    { "id": 3, "question": "Third question text here?" }
  ]
}

Generate exactly ${numQuestions} questions inside the "questions" array. Each must end with a question mark.`;

  try {
    const result = await callGroq(systemPrompt, userPrompt, true);

    if (result?.questions && Array.isArray(result.questions) && result.questions.length > 0) {
      return res.json({
        topic: result.topic || topic,
        questions: result.questions.slice(0, numQuestions),
      });
    }
    throw new Error('Invalid response structure');
  } catch (err) {
    console.error('Generate questions error:', err.message);

    // Fallback questions
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

// ─────────────────────────────────────────────────────────
// module.exports MUST be at the very end — after ALL routes
// ─────────────────────────────────────────────────────────
module.exports = router;