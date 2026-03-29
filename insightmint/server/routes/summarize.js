const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL   = 'llama-3.1-8b-instant';
const HF_API_KEY   = process.env.HF_API_KEY;

const LANGUAGE_NAMES = {
  en: 'English', hi: 'Hindi', te: 'Telugu',
  ta: 'Tamil', zh: 'Chinese (Simplified)', fr: 'French'
};

// ── 1. BART NLP Model (HuggingFace) ─────────────────────────
// Model: facebook/bart-large-cnn
// Type: Abstractive Summarization (Seq2Seq Transformer)
// Used for: plain text & file content summarization
async function callBART(text) {
  if (!HF_API_KEY || HF_API_KEY === 'YOUR_HUGGINGFACE_API_KEY_HERE') {
    return null; // fall through to Groq
  }
  try {
    const res = await fetch('https://api-inference.huggingface.co/models/facebook/bart-large-cnn', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: text.slice(0, 1024), // BART max input
        parameters: { max_length: 200, min_length: 60, do_sample: false },
        options: { wait_for_model: true }
      })
    });
    const data = await res.json();
    if (data?.error) return null;
    return data?.[0]?.summary_text || null;
  } catch { return null; }
}

// ── 2. Groq LLaMA (fallback + structured output) ────────────
// Model: llama-3.1-8b-instant (LLM)
// Used for: structured sections, multilingual, YouTube, URL
async function callGroq(system, user) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      temperature: 0.5, max_tokens: 2000
    })
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

function getYouTubeId(url) {
  const m = url.match(/(?:v=|youtu\.be\/|shorts\/)([^&\n?#]+)/);
  return m?.[1] || null;
}

// ── Build structured summary from BART output + Groq enrichment ──
async function buildStructuredSummary(content, title, language, bartSummary) {
  const langName = LANGUAGE_NAMES[language] || 'English';

  // If we have BART summary, use it as the base and ask Groq to just extract key points
  if (bartSummary) {
    const enriched = await callGroq(
      `You are an expert content analyzer. Respond in ${langName}. Be concise.`,
      `Here is an AI-generated summary of "${title}" by BART (facebook/bart-large-cnn NLP model):

"${bartSummary}"

Original content excerpt:
${content.slice(0, 1500)}

Now provide in ${langName}:

## Summary
${bartSummary}

## Key Points
- [Extract 4-5 specific key points from the content]

## Main Topics
[2-3 main topics as comma-separated list]

## Takeaway
[One sentence most important insight]`
    );
    return { summary: enriched, model: 'facebook/bart-large-cnn', modelType: 'BART Abstractive Summarization (NLP)', usedNLP: true };
  }

  // Groq-only fallback
  const result = await callGroq(
    `You are an expert content summarizer. Respond in ${langName}.`,
    `Analyze and summarize "${title}":

Content:
${content.slice(0, 4000)}

Respond in ${langName}:

## Summary
[2-3 paragraph summary]

## Key Points
- [point 1]
- [point 2]
- [point 3]
- [point 4]
- [point 5]

## Main Topics
[comma-separated topics]

## Takeaway
[One sentence key insight]`
  );
  return { summary: result, model: 'llama-3.1-8b-instant', modelType: 'Groq LLaMA 3.1 8B (LLM)', usedNLP: false };
}

// ── Vision model for handwritten/image notes ─────────────────
async function analyzeImageWithVision(base64DataUrl, title, language) {
  const langName = LANGUAGE_NAMES[language] || 'English';
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: base64DataUrl }
            },
            {
              type: 'text',
              text: `This is a photo of handwritten student notes. Please:
1. Carefully read and transcribe ALL the handwritten text you can see
2. Organize it into a clean structured summary in ${langName}

Respond in this exact format:

## Summary
[2-3 paragraph summary of the handwritten content]

## Key Points
- [key point 1]
- [key point 2]
- [key point 3]
- [key point 4]
- [key point 5]

## Main Topics
[comma-separated list of main topics covered]

## Takeaway
[One sentence most important insight from these notes]`
            }
          ]
        }],
        max_tokens: 1500,
        temperature: 0.3
      })
    });
    const data = await response.json();
    if (data.error) {
      console.error('Vision model error:', data.error);
      return null;
    }
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.error('Vision API error:', err.message);
    return null;
  }
}

// ── POST /api/summarize/text ─────────────────────────────────
// Uses BART first, falls back to Groq. For images uses vision model.
router.post('/text', auth, async (req, res) => {
  const { content, title, language = 'en' } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });

  try {
    // ── IMAGE: use vision model to read handwritten notes ──
    if (content.startsWith('[IMAGE_BASE64:')) {
      const base64DataUrl = content.slice('[IMAGE_BASE64:'.length);
      console.log('Processing image with vision model...');

      const visionResult = await analyzeImageWithVision(base64DataUrl, title || 'Handwritten Notes', language);

      if (visionResult) {
        return res.json({
          summary: visionResult,
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          modelType: 'Groq Vision Model (Image OCR + Analysis)',
          usedNLP: false,
          isImage: true,
          success: true
        });
      }
      // Fallback if vision fails
      return res.status(500).json({ error: 'Could not read image. Make sure GROQ_API_KEY is set and try again.' });
    }

    // ── TEXT/PDF/DOCX: use BART + Groq pipeline ──
    const bartSummary = await callBART(content);
    const result = await buildStructuredSummary(content, title || 'Document', language, bartSummary);
    res.json({ ...result, success: true });
  } catch (err) {
    console.error('Summarize error:', err.message);
    res.status(500).json({ error: 'Failed to summarize content' });
  }
});

// ── POST /api/summarize/youtube ──────────────────────────────
// YouTube uses Groq (no raw text to feed BART)
router.post('/youtube', auth, async (req, res) => {
  const { url, language = 'en' } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });
  const langName = LANGUAGE_NAMES[language] || 'English';

  const videoId = getYouTubeId(url);
  if (!videoId) return res.status(400).json({ error: 'Invalid YouTube URL' });

  let videoTitle = 'YouTube Video', channelName = '';
  try {
    const oe = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    const od = await oe.json();
    videoTitle = od.title || videoTitle;
    channelName = od.author_name || '';
  } catch {}

  try {
    const summary = await callGroq(
      `You are an expert educational content analyzer. Respond in ${langName}.`,
      `Analyze this YouTube video and provide a comprehensive educational summary in ${langName}.

Video Title: "${videoTitle}"
Channel: "${channelName}"
URL: ${url}

## Video Summary
[3-4 paragraph summary of what this video covers]

## Key Learning Points
- [point 1]
- [point 2]
- [point 3]
- [point 4]
- [point 5]
- [point 6]

## Topics Covered
[Main topics]

## Who Should Watch
[Target audience]

## Takeaway
[Most important insight]`
    );

    res.json({
      summary, videoId, videoTitle, channelName,
      thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      model: 'llama-3.1-8b-instant',
      modelType: 'Groq LLaMA 3.1 8B (LLM)',
      usedNLP: false,
      success: true
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to summarize video' });
  }
});

// ── POST /api/summarize/url ──────────────────────────────────
router.post('/url', auth, async (req, res) => {
  const { url, language = 'en' } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });
  const langName = LANGUAGE_NAMES[language] || 'English';

  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    req.body.url = url;
    return router.handle({ ...req, url: '/youtube', method: 'POST' }, res, () => {});
  }

  try {
    const summary = await callGroq(
      `You are an expert content summarizer. Respond in ${langName}.`,
      `Summarize the content from: ${url}

## Content Summary
[What this page likely contains]

## Key Points
- [point 1]
- [point 2]
- [point 3]
- [point 4]
- [point 5]

## Main Topics
[Topics covered]

## Takeaway
[Most important insight]`
    );
    res.json({ summary, url, model: 'llama-3.1-8b-instant', modelType: 'Groq LLaMA 3.1 8B (LLM)', usedNLP: false, success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to summarize URL' });
  }
});

module.exports = router;