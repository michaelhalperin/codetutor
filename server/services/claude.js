import { evaluateCodingAnswer } from './codeRunner.js'
import { recordEvaluation } from './metrics.js'
// ============================================================
// Batch-evaluate answers locally (AI disabled).
// Returns an array of { questionId, is_correct, score, feedback, hint }
// ============================================================
export async function batchEvaluateAnswers(answers, options = {}) {
  const startedAt = Date.now()
  const feedbackFormat = String(options.feedbackFormat || 'concise')
  const results = [];

  for (const a of answers) {
    const { questionId, questionType, userAnswer, correctAnswer } = a;
    const normalizedUser = normalize(userAnswer);
    const normalizedCorrect = normalize(correctAnswer);

    const isDeterministic =
      questionType === "multiple_choice" ||
      questionType === "true_false" ||
      questionType === "fill_blank";

    let isCorrect = false;
    let score = 0;
    let feedback = null;

    if (isDeterministic) {
      isCorrect =
        normalizedUser === normalizedCorrect ||
        normalizedUser ===
          normalize(String(correctAnswer || "").replace(/^[a-d]\.\s*/i, ""));
      score = isCorrect ? 100 : 0;
      feedback = isCorrect
        ? null
        : `Not correct. Expected: ${formatExpectedAnswer(correctAnswer)}`;
    } else if (questionType === "open_ended") {
      const semantic = evaluateOpenEnded(userAnswer, correctAnswer);
      isCorrect = semantic.isCorrect;
      score = semantic.score;
      feedback = semantic.feedback;
    } else if (questionType === "coding") {
      const coding = evaluateCodingAnswer({
        userAnswer,
        correctAnswer,
        language: a.language,
      });
      if (coding) {
        isCorrect = coding.isCorrect;
        score = coding.score;
        feedback = coding.feedback;
      } else {
        isCorrect = normalizedUser === normalizedCorrect;
        score = isCorrect ? 100 : 0;
        feedback = isCorrect
          ? null
          : `Not correct. Expected: ${formatExpectedAnswer(correctAnswer)}`;
      }
    } else {
      isCorrect = normalizedUser === normalizedCorrect;
      score = isCorrect ? 100 : 0;
      feedback = isCorrect
        ? null
        : `Not correct. Expected: ${formatExpectedAnswer(correctAnswer)}`;
    }

    if (feedback && feedbackFormat === 'coach') {
      feedback = `${feedback} Focus on the key concept, then retry with a smaller example.`;
    }

    results.push({
      questionId,
      is_correct: isCorrect,
      score,
      feedback,
      hint: null,
    });
  }

  recordEvaluation({ latencyMs: Date.now() - startedAt })
  return results;
}

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function formatExpectedAnswer(value) {
  const raw = String(value || "N/A").trim();
  return raw;
}

function evaluateOpenEnded(userAnswer, correctAnswer) {
  const normalizedUser = normalize(userAnswer);
  const normalizedCorrect = normalize(correctAnswer);

  if (!normalizedUser) {
    return {
      isCorrect: false,
      score: 0,
      feedback: `Not correct. Expected ideas: ${formatExpectedAnswer(correctAnswer)}`,
    };
  }

  if (normalizedUser === normalizedCorrect) {
    return { isCorrect: true, score: 100, feedback: null };
  }

  const expectedConcepts = extractConcepts(correctAnswer);
  const userTerms = new Set(tokenizeAndStem(userAnswer));

  if (expectedConcepts.length === 0) {
    const fallbackMatch =
      normalizedUser.includes(normalizedCorrect) ||
      normalizedCorrect.includes(normalizedUser);
    return {
      isCorrect: fallbackMatch,
      score: fallbackMatch ? 100 : 0,
      feedback: fallbackMatch
        ? null
        : `Not correct. Expected ideas: ${formatExpectedAnswer(correctAnswer)}`,
    };
  }

  const matchedConcepts = expectedConcepts.filter((concept) =>
    concept.terms.some((term) => userTerms.has(term)),
  );

  const coverage = matchedConcepts.length / expectedConcepts.length;
  const score = Math.round(coverage * 100);
  const isCorrect = coverage >= 0.6;

  if (isCorrect) {
    return {
      isCorrect: true,
      score: Math.max(score, 60),
      feedback: null,
    };
  }

  const missing = expectedConcepts
    .filter((concept) => !matchedConcepts.includes(concept))
    .slice(0, 4)
    .map((concept) => concept.label);

  const missingText =
    missing.length > 0 ? ` Missing concepts: ${missing.join(", ")}.` : "";

  return {
    isCorrect: false,
    score,
    feedback: `Partially correct.${missingText}`,
  };
}

function extractConcepts(answer) {
  const raw = normalize(answer);
  if (!raw) return [];

  const chunks = raw
    .replace(/examples?:/g, "")
    .split(/[.;]|, and | and |,|\/|\(|\)|->|:| - /)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const dedup = new Set();
  const concepts = [];
  for (const chunk of chunks) {
    const terms = tokenizeAndStem(chunk);
    if (terms.length === 0) continue;
    const key = terms.join(" ");
    if (dedup.has(key)) continue;
    dedup.add(key);
    concepts.push({
      label: chunk,
      terms,
    });
  }
  return concepts;
}

function tokenizeAndStem(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((w) => stem(w))
    .filter((w) => w && w.length >= 3 && !STOP_WORDS.has(w));
}

function stem(word) {
  let out = String(word || "")
    .trim()
    .toLowerCase();
  if (!out) return "";
  if (out.endsWith("ies") && out.length > 4) return `${out.slice(0, -3)}y`;
  if (out.endsWith("ing") && out.length > 5) out = out.slice(0, -3);
  else if (out.endsWith("ed") && out.length > 4) out = out.slice(0, -2);
  else if (out.endsWith("es") && out.length > 4) out = out.slice(0, -2);
  else if (out.endsWith("s") && out.length > 3) out = out.slice(0, -1);
  return out;
}

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "than",
  "then",
  "are",
  "is",
  "was",
  "were",
  "be",
  "been",
  "being",
  "can",
  "will",
  "would",
  "could",
  "should",
  "has",
  "have",
  "had",
  "not",
  "but",
  "you",
  "your",
  "they",
  "their",
  "them",
  "our",
  "about",
  "over",
  "under",
  "between",
  "each",
  "more",
  "most",
  "such",
  "very",
  "any",
  "all",
  "some",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "how",
  "one",
  "two",
  "three",
  "use",
  "using",
  "used",
  "also",
  "just",
  "like",
]);
