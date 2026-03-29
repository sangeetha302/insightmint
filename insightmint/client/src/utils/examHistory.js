// src/utils/examHistory.js
// Handles saving/loading exam history to localStorage + syncing to DB

const STORAGE_KEY = 'insightmint_exam_history';
const MAX_LOCAL   = 50; // keep last 50 exams in localStorage

// ── Read all history from localStorage ───────────────────
export function getLocalHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ── Save one exam session to localStorage ─────────────────
export function saveLocalHistory(entry) {
  try {
    const existing = getLocalHistory();
    const updated  = [entry, ...existing].slice(0, MAX_LOCAL);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

// ── Delete one entry from localStorage ───────────────────
export function deleteLocalHistory(id) {
  try {
    const existing = getLocalHistory();
    const updated  = existing.filter(e => e.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

// ── Clear ALL history from localStorage ──────────────────
export function clearLocalHistory() {
  localStorage.removeItem(STORAGE_KEY);
}

// ── Build a history entry from a completed exam session ───
export function buildHistoryEntry({ topic, difficulty, evalMode, questions, answers, results }) {
  const avgScore = results.length
    ? parseFloat((results.reduce((s, r) => s + (r.totalScore || 0), 0) / results.length).toFixed(1))
    : 0;

  const grade = avgScore >= 9 ? 'A+' : avgScore >= 8 ? 'A' : avgScore >= 7 ? 'B+' :
                avgScore >= 6 ? 'B'  : avgScore >= 5 ? 'C' : avgScore >= 4 ? 'D'  : 'F';

  return {
    id:         `exam_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    topic:      topic || 'General',
    difficulty,
    evalMode,
    avgScore,
    grade,
    totalQuestions: questions.length,
    date:       new Date().toISOString(),
    synced:     false,
    // Full data for re-read / retry
    questions:  questions.map(q => ({ id: q.id, question: q.question })),
    answers,   // { [questionId]: answerString }
    results:   results.map(r => ({
      question:       r.question,
      answer:         r.answer,
      totalScore:     r.totalScore,
      grade:          r.grade,
      overallFeedback:r.overallFeedback,
      rubric:         r.rubric,
      strengths:      r.strengths,
      improvements:   r.improvements,
      modelAnswer:    r.modelAnswer,
      encouragement:  r.encouragement,
    })),
  };
}

// ── Sync one entry to the backend DB ─────────────────────
export async function syncEntryToDB(entry, token) {
  try {
    const res = await fetch('/api/exam-history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(entry),
    });
    if (!res.ok) throw new Error('Sync failed');
    return true;
  } catch {
    return false;
  }
}

// ── Fetch all history from DB ─────────────────────────────
export async function fetchDBHistory(token) {
  try {
    const res = await fetch('/api/exam-history', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Fetch failed');
    return await res.json(); // array of entries
  } catch {
    return null;
  }
}

// ── Delete entry from DB ──────────────────────────────────
export async function deleteDBEntry(id, token) {
  try {
    const res = await fetch(`/api/exam-history/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}