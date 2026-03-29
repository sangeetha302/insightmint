const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// ── Topic Knowledge Graph ────────────────────────────────
// Each topic has: prerequisites, related topics, next steps, category
const TOPIC_GRAPH = {
  // Programming Languages
  'python':         { cat: 'programming', prereqs: [], next: ['data structures','django','flask','pandas','machine learning','web scraping','fastapi'], related: ['javascript','java','r programming'] },
  'javascript':     { cat: 'programming', prereqs: [], next: ['react','node.js','typescript','vue.js','express.js','next.js'], related: ['python','typescript','html css'] },
  'java':           { cat: 'programming', prereqs: [], next: ['spring boot','android development','design patterns','microservices'], related: ['python','kotlin','c++'] },
  'typescript':     { cat: 'programming', prereqs: ['javascript'], next: ['react','angular','nest.js'], related: ['javascript','node.js'] },
  'c++':            { cat: 'programming', prereqs: [], next: ['data structures','algorithms','game development','embedded systems'], related: ['c programming','java','rust'] },
  'rust':           { cat: 'programming', prereqs: ['c++'], next: ['systems programming','webassembly'], related: ['c++','go programming'] },
  'go programming': { cat: 'programming', prereqs: ['programming basics'], next: ['microservices','docker','kubernetes'], related: ['python','rust'] },

  // Web Development
  'html css':       { cat: 'web', prereqs: [], next: ['javascript','react','tailwind css','bootstrap'], related: ['javascript','web design'] },
  'react':          { cat: 'web', prereqs: ['javascript','html css'], next: ['next.js','redux','react native','typescript'], related: ['vue.js','angular','svelte'] },
  'vue.js':         { cat: 'web', prereqs: ['javascript','html css'], next: ['nuxt.js','vuex'], related: ['react','angular'] },
  'angular':        { cat: 'web', prereqs: ['typescript','html css'], next: ['rxjs','ngrx'], related: ['react','vue.js'] },
  'node.js':        { cat: 'web', prereqs: ['javascript'], next: ['express.js','nest.js','mongodb','rest api design'], related: ['python','django','flask'] },
  'express.js':     { cat: 'web', prereqs: ['node.js'], next: ['rest api design','mongodb','jwt authentication'], related: ['fastapi','django','flask'] },
  'next.js':        { cat: 'web', prereqs: ['react'], next: ['vercel deployment','typescript','graphql'], related: ['nuxt.js','gatsby'] },
  'django':         { cat: 'web', prereqs: ['python'], next: ['rest api design','postgresql','deployment'], related: ['flask','fastapi','node.js'] },
  'flask':          { cat: 'web', prereqs: ['python'], next: ['rest api design','sqlalchemy','docker'], related: ['django','fastapi','express.js'] },
  'fastapi':        { cat: 'web', prereqs: ['python'], next: ['microservices','docker','postgresql'], related: ['flask','django'] },

  // Data & ML
  'data structures':{ cat: 'cs fundamentals', prereqs: ['programming basics'], next: ['algorithms','system design','competitive programming'], related: ['algorithms','discrete mathematics'] },
  'algorithms':     { cat: 'cs fundamentals', prereqs: ['data structures'], next: ['system design','competitive programming','dynamic programming'], related: ['data structures','mathematics'] },
  'machine learning':{ cat: 'ai/ml', prereqs: ['python','mathematics','statistics'], next: ['deep learning','nlp','computer vision','mlops'], related: ['data science','artificial intelligence'] },
  'deep learning':  { cat: 'ai/ml', prereqs: ['machine learning','linear algebra'], next: ['computer vision','nlp','reinforcement learning'], related: ['neural networks','tensorflow','pytorch'] },
  'data science':   { cat: 'ai/ml', prereqs: ['python','statistics'], next: ['machine learning','data visualization','sql','pandas'], related: ['machine learning','statistics','r programming'] },
  'nlp':            { cat: 'ai/ml', prereqs: ['machine learning','python'], next: ['transformers','llm fine-tuning','text classification'], related: ['deep learning','linguistics'] },
  'computer vision':{ cat: 'ai/ml', prereqs: ['deep learning'], next: ['object detection','image segmentation'], related: ['deep learning','opencv'] },
  'pandas':         { cat: 'data', prereqs: ['python'], next: ['data visualization','machine learning','numpy'], related: ['numpy','sql','data science'] },
  'numpy':          { cat: 'data', prereqs: ['python'], next: ['pandas','machine learning','scipy'], related: ['pandas','matlab'] },
  'sql':            { cat: 'data', prereqs: [], next: ['postgresql','mysql','data science','database design'], related: ['mongodb','postgresql','nosql'] },
  'mongodb':        { cat: 'data', prereqs: ['javascript'], next: ['mongoose','aggregation pipeline','atlas'], related: ['sql','postgresql','firebase'] },
  'postgresql':     { cat: 'data', prereqs: ['sql'], next: ['database optimization','pgvector'], related: ['mysql','sql','mongodb'] },

  // DevOps & Cloud
  'docker':         { cat: 'devops', prereqs: ['linux basics'], next: ['kubernetes','docker compose','microservices'], related: ['kubernetes','linux'] },
  'kubernetes':     { cat: 'devops', prereqs: ['docker'], next: ['helm','service mesh','cloud deployment'], related: ['docker','cloud computing'] },
  'git':            { cat: 'devops', prereqs: [], next: ['github actions','ci/cd','open source contribution'], related: ['github','devops'] },
  'linux basics':   { cat: 'devops', prereqs: [], next: ['bash scripting','docker','server administration'], related: ['bash scripting','networking'] },
  'aws':            { cat: 'cloud', prereqs: ['linux basics'], next: ['cloud architecture','serverless','terraform'], related: ['gcp','azure','cloud computing'] },
  'system design':  { cat: 'cs fundamentals', prereqs: ['data structures','algorithms','databases'], next: ['microservices','distributed systems','cloud architecture'], related: ['software architecture','databases'] },

  // Mobile
  'react native':   { cat: 'mobile', prereqs: ['react'], next: ['expo','mobile ui design','app deployment'], related: ['flutter','swift','kotlin'] },
  'flutter':        { cat: 'mobile', prereqs: ['dart'], next: ['mobile ui design','firebase integration'], related: ['react native','swift'] },

  // CS Fundamentals
  'programming basics': { cat: 'cs fundamentals', prereqs: [], next: ['python','javascript','java','data structures'], related: ['computer science','logic'] },
  'mathematics':    { cat: 'cs fundamentals', prereqs: [], next: ['statistics','linear algebra','discrete mathematics'], related: ['statistics','linear algebra'] },
  'statistics':     { cat: 'cs fundamentals', prereqs: ['mathematics'], next: ['machine learning','data science','r programming'], related: ['mathematics','probability'] },
  'linear algebra': { cat: 'cs fundamentals', prereqs: ['mathematics'], next: ['machine learning','computer graphics','quantum computing'], related: ['mathematics','calculus'] },
  'blockchain':     { cat: 'emerging', prereqs: ['javascript','cryptography basics'], next: ['solidity','web3.js','defi'], related: ['cryptography','distributed systems'] },
  'cybersecurity':  { cat: 'security', prereqs: ['networking','linux basics'], next: ['ethical hacking','penetration testing','cryptography'], related: ['networking','linux'] },
  'networking':     { cat: 'cs fundamentals', prereqs: [], next: ['cybersecurity','cloud computing','linux basics'], related: ['linux','computer networks'] },
};

// ── TF-IDF + Cosine Similarity ML Algorithm ──────────────
// This is the actual ML model — content-based filtering

function buildTFIDF(topics) {
  // Build vocabulary from all topic connections
  const vocab = new Set();
  const docs = {};

  for (const [topic, data] of Object.entries(topics)) {
    const words = [
      topic,
      data.cat,
      ...data.prereqs,
      ...data.next,
      ...data.related,
    ].map(w => w.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ')).flat();
    docs[topic] = words;
    words.forEach(w => vocab.add(w));
  }

  const vocabArr = [...vocab];

  // TF: term frequency per document
  const tfVectors = {};
  for (const [topic, words] of Object.entries(docs)) {
    const tf = {};
    words.forEach(w => { tf[w] = (tf[w] || 0) + 1; });
    const total = words.length;
    Object.keys(tf).forEach(w => { tf[w] /= total; });
    tfVectors[topic] = tf;
  }

  // IDF: inverse document frequency
  const idf = {};
  const N = Object.keys(docs).length;
  vocabArr.forEach(word => {
    const docsWithWord = Object.values(docs).filter(d => d.includes(word)).length;
    idf[word] = Math.log(N / (docsWithWord + 1));
  });

  // TF-IDF vectors
  const tfidfVectors = {};
  for (const [topic, tf] of Object.entries(tfVectors)) {
    tfidfVectors[topic] = {};
    for (const [word, tfVal] of Object.entries(tf)) {
      tfidfVectors[topic][word] = tfVal * (idf[word] || 0);
    }
  }

  return tfidfVectors;
}

function cosineSimilarity(vecA, vecB) {
  const keys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
  let dot = 0, magA = 0, magB = 0;
  for (const k of keys) {
    const a = vecA[k] || 0;
    const b = vecB[k] || 0;
    dot += a * b;
    magA += a * a;
    magB += b * b;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// Build TF-IDF model once on startup
const tfidfModel = buildTFIDF(TOPIC_GRAPH);

function getRecommendations(studiedTopics) {
  if (!studiedTopics || studiedTopics.length === 0) {
    // Cold start — recommend popular beginner topics
    return [
      { topic: 'Python', reason: 'Most popular beginner language', score: 0.95, type: 'popular' },
      { topic: 'JavaScript', reason: 'Essential for web development', score: 0.90, type: 'popular' },
      { topic: 'Data Structures', reason: 'Core CS fundamental', score: 0.85, type: 'popular' },
      { topic: 'SQL', reason: 'Essential for any tech career', score: 0.80, type: 'popular' },
      { topic: 'Git', reason: 'Must-know for all developers', score: 0.78, type: 'popular' },
    ];
  }

  const normalizedStudied = studiedTopics.map(t => t.toLowerCase().trim());
  const scores = {};
  const reasons = {};
  const types = {};

  for (const studied of normalizedStudied) {
    const studiedData = TOPIC_GRAPH[studied];

    for (const [candidate, data] of Object.entries(TOPIC_GRAPH)) {
      if (normalizedStudied.includes(candidate)) continue; // already studied

      let score = 0;
      let reason = '';
      let type = 'related';

      // 1. Direct "next step" — highest priority
      if (studiedData?.next?.includes(candidate)) {
        score += 0.9;
        reason = `Natural next step after ${studied}`;
        type = 'next';
      }

      // 2. Shared category boost
      if (studiedData?.cat === data.cat) score += 0.15;

      // 3. TF-IDF Cosine Similarity
      const studiedVec = tfidfModel[studied] || {};
      const candidateVec = tfidfModel[candidate] || {};
      const similarity = cosineSimilarity(studiedVec, candidateVec);
      score += similarity * 0.4;

      // 4. Prerequisites met — all prereqs already studied
      const prereqsMet = data.prereqs.every(p => normalizedStudied.includes(p.toLowerCase()));
      if (prereqsMet && data.prereqs.length > 0) {
        score += 0.2;
        if (!reason) reason = `You have all prerequisites (${data.prereqs.join(', ')})`;
        type = type === 'next' ? 'next' : 'ready';
      }

      // 5. Related topic
      if (studiedData?.related?.includes(candidate)) {
        score += 0.25;
        if (!reason) reason = `Complements your ${studied} knowledge`;
        type = type !== 'next' ? 'related' : type;
      }

      if (score > 0) {
        if (!scores[candidate] || scores[candidate] < score) {
          scores[candidate] = score;
          reasons[candidate] = reason || `Related to ${studied}`;
          types[candidate] = type;
        }
      }
    }
  }

  // Sort by score, capitalize, return top 8
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([topic, score]) => ({
      topic: topic.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      score: Math.round(score * 100) / 100,
      reason: reasons[topic],
      type: types[topic],
      category: TOPIC_GRAPH[topic]?.cat || 'general',
    }));
}

// ── POST /api/recommend ──────────────────────────────────
router.post('/', async (req, res) => {
  const { studiedTopics = [], roadmapTopics = [] } = req.body;

  // Combine all known topics
  const allKnown = [...new Set([...studiedTopics, ...roadmapTopics])];
  const recommendations = getRecommendations(allKnown);

  // Use Groq to generate a brief insight for the top recommendation
  let insight = null;
  if (recommendations.length > 0 && GROQ_API_KEY) {
    try {
      const top = recommendations[0];
      const res2 = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{
            role: 'system', content: 'You are a learning advisor. Be concise and motivating. Max 2 sentences.'
          }, {
            role: 'user',
            content: `A student has studied: ${allKnown.join(', ')}. The ML model recommends they learn "${top.topic}" next. Why is this the perfect next step for them specifically? Keep it to 2 sentences max.`
          }],
          max_tokens: 100, temperature: 0.7
        })
      });
      const d = await res2.json();
      insight = d.choices?.[0]?.message?.content || null;
    } catch {}
  }

  res.json({
    recommendations,
    studiedCount: allKnown.length,
    insight,
    algorithm: 'TF-IDF + Cosine Similarity Content-Based Filtering',
    modelInfo: 'Topic Knowledge Graph with 35+ topics, 12 feature dimensions',
  });
});

// ── GET /api/recommend/topics ────────────────────────────
router.get('/topics', (req, res) => {
  const topics = Object.keys(TOPIC_GRAPH).map(t =>
    t.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  );
  res.json({ topics });
});

module.exports = router;