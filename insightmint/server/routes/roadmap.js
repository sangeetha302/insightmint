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
      temperature: 0.6,
      max_tokens: 3000
    })
  });
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch { return null; }
}

router.post('/generate', async (req, res) => {
  const { topic, language = 'en' } = req.body;
  if (!topic) return res.status(400).json({ error: 'Topic required' });
  const langName = LANGUAGE_NAMES[language] || 'English';

  try {
    const result = await callGroq(
      `You are an expert curriculum designer. Respond ONLY with valid JSON, no markdown, no extra text. Write all content in ${langName}.`,
      `Create a detailed learning roadmap for "${topic}" in ${langName}.

Return ONLY this JSON structure:
{
  "topic": "${topic}",
  "description": "2-sentence description of this learning path",
  "totalDuration": "X months",
  "stages": [
    {
      "id": "stage-1",
      "title": "Stage title in ${langName}",
      "description": "What this stage covers",
      "duration": "X week(s)",
      "color": "#6366f1",
      "subtopics": [
        {
          "id": "s1-t1",
          "title": "Specific topic to learn",
          "description": "Brief description of what to learn"
        }
      ]
    }
  ]
}

Requirements:
- Create exactly 5-6 stages from beginner to advanced
- Each stage must have 4-6 specific subtopics
- Subtopic titles should be specific (e.g. "Variables and Data Types" not just "Basics")
- Duration should be realistic (1-4 weeks per stage)
- Use these colors in order: "#6366f1","#8b5cf6","#a855f7","#c084fc","#e879f9","#14b8a6"
- All text must be in ${langName}`
    );

    if (!result?.stages) throw new Error('Invalid roadmap structure');
    res.json(result);
  } catch (err) {
    console.error('Roadmap generate error:', err.message);
    // Fallback
    res.json({
      topic,
      description: `A structured roadmap to learn ${topic}, guiding you from the basics to advanced concepts progressively.`,
      totalDuration: '3 months',
      stages: [
        { id: 'stage-1', title: 'Foundations', description: `Get familiar with ${topic} basics, history, and setup.`, duration: '1 week', color: '#6366f1',
          subtopics: [
            { id: 's1-t1', title: `What is ${topic}?`, description: 'Overview and history' },
            { id: 's1-t2', title: 'Setting up your environment', description: 'Install tools and IDE' },
            { id: 's1-t3', title: 'Basic syntax', description: 'Core syntax rules' },
            { id: 's1-t4', title: 'Variables and data types', description: 'Primitive types and variables' },
            { id: 's1-t5', title: 'Your first program', description: 'Write and run Hello World' },
          ]},
        { id: 'stage-2', title: 'Core Concepts', description: 'Learn the fundamental building blocks.', duration: '2 weeks', color: '#8b5cf6',
          subtopics: [
            { id: 's2-t1', title: 'Control flow', description: 'If/else and loops' },
            { id: 's2-t2', title: 'Functions', description: 'Defining and calling functions' },
            { id: 's2-t3', title: 'Data structures', description: 'Arrays, lists, objects' },
            { id: 's2-t4', title: 'Error handling', description: 'Try/catch and debugging' },
            { id: 's2-t5', title: 'Modules and imports', description: 'Code organization' },
          ]},
        { id: 'stage-3', title: 'Intermediate Skills', description: 'Build more complex programs.', duration: '3 weeks', color: '#a855f7',
          subtopics: [
            { id: 's3-t1', title: 'Object-oriented programming', description: 'Classes and objects' },
            { id: 's3-t2', title: 'File I/O', description: 'Reading and writing files' },
            { id: 's3-t3', title: 'Working with APIs', description: 'HTTP requests and JSON' },
            { id: 's3-t4', title: 'Testing basics', description: 'Unit testing your code' },
            { id: 's3-t5', title: 'Libraries and packages', description: 'Using third-party packages' },
          ]},
        { id: 'stage-4', title: 'Advanced Topics', description: 'Master advanced patterns and techniques.', duration: '4 weeks', color: '#c084fc',
          subtopics: [
            { id: 's4-t1', title: 'Design patterns', description: 'Common software patterns' },
            { id: 's4-t2', title: 'Performance optimization', description: 'Writing efficient code' },
            { id: 's4-t3', title: 'Security best practices', description: 'Secure coding' },
            { id: 's4-t4', title: 'Asynchronous programming', description: 'Async/await and concurrency' },
            { id: 's4-t5', title: 'Deployment', description: 'Deploy to production' },
          ]},
        { id: 'stage-5', title: 'Real Projects', description: 'Build portfolio-worthy projects.', duration: '4 weeks', color: '#e879f9',
          subtopics: [
            { id: 's5-t1', title: 'Project planning', description: 'Design and architecture' },
            { id: 's5-t2', title: 'Build project 1', description: 'Beginner-level project' },
            { id: 's5-t3', title: 'Build project 2', description: 'Intermediate project' },
            { id: 's5-t4', title: 'Code review', description: 'Review and refactor' },
            { id: 's5-t5', title: 'Open source contribution', description: 'Contribute to a project' },
          ]},
      ]
    });
  }
});

module.exports = router;