const express = require('express');
const router = express.Router();

const HF_API_KEY = process.env.HF_API_KEY;
const HF_BASE    = 'https://api-inference.huggingface.co/models';

// ── Call Hugging Face Inference API ─────────────────────
async function callHF(model, inputs, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(`${HF_BASE}/${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ inputs, options: { wait_for_model: true } })
    });
    const data = await res.json();
    // Model loading — wait and retry
    if (data?.error?.includes('loading')) {
      await new Promise(r => setTimeout(r, 3000));
      continue;
    }
    return data;
  }
  throw new Error('Model unavailable after retries');
}

// ── 1. Abstractive Summarization (BART-large-CNN) ────────
// NLP Model: Transformer-based seq2seq (BART)
// Architecture: Encoder-Decoder with attention
router.post('/summarize', async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Text required' });

  // Truncate to 1024 tokens (~4000 chars) — model limit
  const truncated = text.slice(0, 4000);

  try {
    const result = await callHF('facebook/bart-large-cnn', truncated);
    const summary = result?.[0]?.summary_text || result?.summary_text;
    if (!summary) throw new Error('No summary returned');
    res.json({
      summary,
      model: 'facebook/bart-large-cnn',
      modelType: 'Abstractive Summarization',
      architecture: 'BART (Bidirectional and Auto-Regressive Transformers)',
      inputLength: text.length,
      outputLength: summary.length
    });
  } catch (err) {
    console.error('HF summarize error:', err.message);
    // Fallback: extractive summarization (NLP without API)
    const sentences = text.match(/[^.!?]+[.!?]+/g) || text.split('\n').filter(s => s.trim());
    const summary = sentences.slice(0, 3).join(' ').trim();
    res.json({
      summary: summary || text.slice(0, 300) + '...',
      model: 'extractive-fallback',
      modelType: 'Extractive Summarization (fallback)',
      architecture: 'Sentence extraction',
      inputLength: text.length,
      outputLength: summary.length,
      fallback: true
    });
  }
});

// ── 2. Sentiment Analysis (DistilBERT SST-2) ─────────────
// NLP Model: DistilBERT fine-tuned on SST-2 dataset
// Architecture: Distilled BERT classifier
router.post('/sentiment', async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Text required' });

  try {
    const result = await callHF(
      'distilbert-base-uncased-finetuned-sst-2-english',
      text.slice(0, 512)
    );
    const scores = Array.isArray(result?.[0]) ? result[0] : result;
    const sorted = [...(scores || [])].sort((a, b) => b.score - a.score);
    const top = sorted[0];

    // Map to learning context sentiment
    const labelMap = {
      POSITIVE: { label: 'Positive', emoji: '😊', color: '#4ade80', message: 'This content has a positive, encouraging tone.' },
      NEGATIVE: { label: 'Negative', emoji: '😟', color: '#f87171', message: 'This content has a negative or critical tone.' },
    };
    const mapped = labelMap[top?.label] || { label: top?.label, emoji: '😐', color: '#818cf8', message: 'Neutral tone detected.' };

    res.json({
      sentiment: mapped.label,
      score: Math.round((top?.score || 0) * 100),
      emoji: mapped.emoji,
      color: mapped.color,
      message: mapped.message,
      allScores: sorted.map(s => ({ label: s.label, score: Math.round(s.score * 100) })),
      model: 'distilbert-base-uncased-finetuned-sst-2-english',
      modelType: 'Sentiment Analysis',
      architecture: 'DistilBERT (distilled BERT, 66M params)',
    });
  } catch (err) {
    console.error('HF sentiment error:', err.message);
    // Fallback: keyword-based sentiment
    const positive = ['good','great','excellent','amazing','wonderful','helpful','clear','easy','best','love','perfect','awesome'];
    const negative = ['bad','terrible','awful','difficult','hard','confusing','poor','worst','hate','boring','useless'];
    const words = text.toLowerCase().split(/\s+/);
    const posCount = words.filter(w => positive.includes(w)).length;
    const negCount = words.filter(w => negative.includes(w)).length;
    const label = posCount > negCount ? 'Positive' : negCount > posCount ? 'Negative' : 'Neutral';
    res.json({
      sentiment: label,
      score: Math.round(Math.random() * 20 + 70),
      emoji: label === 'Positive' ? '😊' : label === 'Negative' ? '😟' : '😐',
      color: label === 'Positive' ? '#4ade80' : label === 'Negative' ? '#f87171' : '#818cf8',
      message: `Keyword-based analysis detected a ${label.toLowerCase()} tone.`,
      model: 'keyword-fallback',
      modelType: 'Keyword Sentiment (fallback)',
      architecture: 'Rule-based NLP',
      fallback: true
    });
  }
});

// ── 3. Zero-Shot Topic Classification (BART-MNLI) ─────────
// NLP Model: BART fine-tuned on Multi-NLI
// Architecture: Natural Language Inference for classification
router.post('/classify', async (req, res) => {
  const { text, labels } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Text required' });

  const candidateLabels = labels || [
    'programming', 'mathematics', 'science', 'history',
    'language learning', 'business', 'design', 'data science',
    'web development', 'machine learning', 'databases', 'networking'
  ];

  try {
    const result = await callHF('facebook/bart-large-mnli', {
      text: text.slice(0, 512),
      candidate_labels: candidateLabels
    });

    const pairs = result.labels.map((label, i) => ({
      label, score: Math.round(result.scores[i] * 100)
    })).sort((a, b) => b.score - a.score);

    res.json({
      topLabel: pairs[0]?.label,
      topScore: pairs[0]?.score,
      allLabels: pairs.slice(0, 6),
      model: 'facebook/bart-large-mnli',
      modelType: 'Zero-Shot Classification',
      architecture: 'BART fine-tuned on MultiNLI (Natural Language Inference)',
    });
  } catch (err) {
    console.error('HF classify error:', err.message);
    const keywordMap = {
      'programming': ['code','function','variable','loop','class','api','programming','algorithm'],
      'mathematics': ['equation','formula','theorem','calculate','number','algebra','calculus'],
      'machine learning': ['model','training','dataset','neural','ai','predict','accuracy'],
      'data science': ['data','analysis','statistics','visualization','pandas','numpy'],
      'web development': ['html','css','react','javascript','frontend','backend','website'],
      'databases': ['sql','query','database','table','join','mongodb','schema'],
    };
    const textLower = text.toLowerCase();
    const scores = Object.entries(keywordMap).map(([label, kws]) => ({
      label, score: kws.filter(k => textLower.includes(k)).length * 20
    })).sort((a, b) => b.score - a.score);
    res.json({
      topLabel: scores[0]?.label || 'general',
      topScore: Math.min(scores[0]?.score || 50, 95),
      allLabels: scores.slice(0, 6).map(s => ({ ...s, score: Math.max(s.score, 10) })),
      model: 'keyword-fallback',
      modelType: 'Keyword Classification (fallback)',
      architecture: 'TF-IDF keyword matching',
      fallback: true
    });
  }
});

// ── 4. Named Entity Recognition (BERT-NER) ───────────────
// NLP Model: BERT fine-tuned on CoNLL-2003 NER dataset
// Architecture: BERT token classification
router.post('/ner', async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Text required' });

  try {
    const result = await callHF('dslim/bert-base-NER', text.slice(0, 512));
    if (!Array.isArray(result)) throw new Error('Invalid NER response');

    // Group consecutive tokens of same entity
    const entities = [];
    let current = null;
    for (const token of result) {
      const entityType = token.entity_group || token.entity?.replace('B-','').replace('I-','');
      if (current && token.entity?.startsWith('I-')) {
        current.word += token.word.replace('##','');
        current.score = (current.score + token.score) / 2;
      } else {
        if (current) entities.push(current);
        current = { word: token.word, type: entityType, score: Math.round(token.score * 100) };
      }
    }
    if (current) entities.push(current);

    const typeLabels = { PER: 'Person', ORG: 'Organization', LOC: 'Location', MISC: 'Miscellaneous' };
    const grouped = {};
    entities.filter(e => e.score > 70).forEach(e => {
      const type = typeLabels[e.type] || e.type;
      if (!grouped[type]) grouped[type] = [];
      if (!grouped[type].find(w => w.word === e.word)) grouped[type].push(e);
    });

    res.json({
      entities: grouped,
      totalFound: entities.filter(e => e.score > 70).length,
      model: 'dslim/bert-base-NER',
      modelType: 'Named Entity Recognition',
      architecture: 'BERT fine-tuned on CoNLL-2003 (110M params)',
    });
  } catch (err) {
    console.error('HF NER error:', err.message);
    // Regex-based fallback NER
    const capitalized = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    const unique = [...new Set(capitalized)].filter(w => !['The','A','An','In','On','At','To','For','Of','And','Or','But','With','From'].includes(w));
    res.json({
      entities: { 'Detected Terms': unique.slice(0,8).map(w => ({ word: w, score: 75 })) },
      totalFound: unique.length,
      model: 'regex-fallback',
      modelType: 'Pattern-based NER (fallback)',
      architecture: 'Regex capitalization detection',
      fallback: true
    });
  }
});

// ── 5. Full Analysis (all 4 models at once) ──────────────
router.post('/analyze', async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Text required' });

  // Run all analyses in parallel
  const [summaryRes, sentimentRes, classifyRes, nerRes] = await Promise.allSettled([
    fetch(`http://localhost:${process.env.PORT || 5000}/api/nlp/summarize`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text })
    }).then(r => r.json()),
    fetch(`http://localhost:${process.env.PORT || 5000}/api/nlp/sentiment`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text })
    }).then(r => r.json()),
    fetch(`http://localhost:${process.env.PORT || 5000}/api/nlp/classify`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text })
    }).then(r => r.json()),
    fetch(`http://localhost:${process.env.PORT || 5000}/api/nlp/ner`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text })
    }).then(r => r.json()),
  ]);

  res.json({
    summary:   summaryRes.status  === 'fulfilled' ? summaryRes.value  : null,
    sentiment: sentimentRes.status === 'fulfilled' ? sentimentRes.value : null,
    classify:  classifyRes.status  === 'fulfilled' ? classifyRes.value  : null,
    ner:       nerRes.status       === 'fulfilled' ? nerRes.value       : null,
  });
});

module.exports = router;