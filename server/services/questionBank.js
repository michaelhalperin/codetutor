import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { supabase } from './db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SEED_PATH = join(__dirname, '../data/questionBank.json')

// Load the seed bank once at startup
const SEED_BANK = JSON.parse(readFileSync(SEED_PATH, 'utf8'))
const MIN_SEED_QUESTIONS_PER_TOPIC = 30
const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced']
const TOPIC_SEED_ALIASES = {
  'מבוא למחשבים': 'Data Structures',
  'מבנה המחשב': 'Data Structures',
  OS: 'Algorithms',
  'תקשורת': 'REST APIs',
  'Python basic': 'Python Basics',
  'Python - Exceptions': 'Python Basics',
  'Python - Data Structures': 'Data Structures',
  'Python - Scopes and Modules': 'Python Basics',
  'Python - Functions': 'Python Basics',
  'Python - files': 'Python Basics',
  'Python - Iterators and Generators': 'Python Basics',
  'Python - Classes and Inheritance': 'Object-Oriented Programming',
  'DB - SQL': 'SQL & Databases',
  'Git': 'Git & Version Control',
  'clean code': 'Object-Oriented Programming',
  debugging: 'Algorithms',
  logs: 'Python Basics',
  'HTTP and Servers': 'JavaScript',
}
const TOPIC_WARM_TTL_MS = 10 * 60 * 1000
const topicWarmState = new Map()

// ============================================================
// Main entry: serve questions for a session.
//
// Flow:
//  1. Load all bank questions for this topic+difficulty from DB
//     (these include both seeded questions and AI-generated ones)
//  2. Find which ones this user has NOT seen yet
//  3. If enough unseen questions exist → serve them
//  4. If not enough unseen questions exist, reuse previously seen questions
//  5. Record which questions are being served in this session
// ============================================================
export async function getQuestionsForSession({ userId, topic, difficulty, count, sessionId, experimentConfig }) {
  // Step 1: Fast path first — avoid expensive preparation unless topic has no data.
  let bankQuestions = await fetchBankQuestions(topic)
  if (!bankQuestions || bankQuestions.length === 0) {
    await ensureSeedQuestions(topic)
    bankQuestions = await fetchBankQuestions(topic)
  }
  // Never block user requests on difficulty backfill.
  queueTopicBackfill(topic)
  const normalizedDifficulty = normalizeDifficulty(difficulty)

  // Step 2: Use prepared bank questions for this topic.
  if (!bankQuestions || bankQuestions.length === 0) {
    throw new Error(`No questions are configured for topic "${topic}" yet.`)
  }

  // Guard against duplicates and synthetic variants that only differ by suffix.
  const dedupedBankQuestions = Array.from(
    new Map(bankQuestions.map((q) => [canonicalizeQuestionText(q.question_text), q])).values()
  )
  const preferredPool = pickDifficultyPool(dedupedBankQuestions, normalizedDifficulty)

  // Step 3: Find which ones this user has NOT answered yet
  const { data: seen, error: seenErr } = await supabase
    .from('user_question_seen')
    .select('question_bank_id')
    .eq('user_id', userId)
    .eq('topic', topic)

  if (seenErr) throw seenErr

  const seenIds = new Set(seen.map((s) => s.question_bank_id))
  const seenCanonical = new Set(
    preferredPool
      .filter((q) => seenIds.has(q.id))
      .map((q) => canonicalizeQuestionText(q.question_text))
  )
  let unseen = preferredPool.filter(
    (q) => !seenCanonical.has(canonicalizeQuestionText(q.question_text))
  )

  let selected = []

  // Auto-start a fresh randomized cycle when the user has exhausted this topic.
  // This prevents "no new questions left" hard failures.
  if (unseen.length < count) {
    await supabase
      .from('user_question_seen')
      .delete()
      .eq('user_id', userId)
      .eq('topic', topic)
    unseen = shuffle(preferredPool)
  }

  // If the canonical pool is smaller than requested, return as many distinct
  // questions as exist (never duplicates within a single session).
  if (unseen.length < count) {
    selected = unseen
  } else {
    selected = shuffle(unseen).slice(0, count)
  }

  if (experimentConfig?.questionOrder === 'grouped_by_type') {
    selected = selected.sort((a, b) => String(a.question_type).localeCompare(String(b.question_type)))
  }

  // Step 4: Record these questions as "seen" for this user
  const seenRows = selected.map((q) => ({
    user_id:          userId,
    topic,
    question_bank_id: q.id,
  }))

  // upsert to avoid duplicates if something fails and retries
  await supabase
    .from('user_question_seen')
    .upsert(seenRows, { onConflict: 'user_id,question_bank_id' })

  // Step 5: Save question references to the session's questions table
  const sessionRows = selected.map((q) => ({
    session_id:     sessionId,
    user_id:        userId,
    question_type:  q.question_type,
    question_text:  q.question_text,
    options:        q.options,
    correct_answer: q.correct_answer,
    ai_feedback:    q.explanation,
    code_language:  q.code_language,
  }))

  const { data: savedSessionQs, error: sqErr } = await supabase
    .from('questions')
    .insert(sessionRows)
    .select()

  if (sqErr) throw sqErr

  // Return in the shape the client expects
  return savedSessionQs.map((sq) => {
    const { explanation, tip } = splitExplanationAndTip(sq.ai_feedback)
    const finalTip = experimentConfig?.hintStyle === 'short'
      ? toShortTip(tip)
      : tip
    return {
      id:             sq.id,
      type:           sq.question_type,
      question:       sq.question_text,
      options:        sq.options,
      correct_answer: sq.correct_answer,
      explanation,
      tip: finalTip,
      code_language:  sq.code_language,
    }
  })
}

async function fetchBankQuestions(topic) {
  const { data, error } = await supabase
    .from('question_bank')
    .select('*')
    .eq('topic', topic)
  if (error) throw error
  return data || []
}

function queueTopicBackfill(topic) {
  const now = Date.now()
  const state = topicWarmState.get(topic)
  if (state?.running) return
  if (state?.warmedAt && now - state.warmedAt < TOPIC_WARM_TTL_MS) return

  const running = (async () => {
    try {
      await backfillSeedDifficulties(topic)
      topicWarmState.set(topic, { warmedAt: Date.now(), running: null })
    } catch {
      topicWarmState.delete(topic)
    }
  })()
  topicWarmState.set(topic, { warmedAt: state?.warmedAt || 0, running })
}

// ============================================================
// Seed the DB with questions from the JSON file, if not already there
// ============================================================
async function ensureSeedQuestions(topic) {
  const seedTopic = SEED_BANK[topic] ? topic : (TOPIC_SEED_ALIASES[topic] || topic)
  const seedQuestions = SEED_BANK[seedTopic]
  if (!seedQuestions || seedQuestions.length === 0) return
  const expandedSeedQuestions = expandSeedQuestions(seedQuestions, MIN_SEED_QUESTIONS_PER_TOPIC)

  // Read existing seeded prompts to avoid duplicate inserts on concurrent requests.
  const { data: existingSeedRows, error: existingErr } = await supabase
    .from('question_bank')
    .select('question_text')
    .eq('topic', topic)
    .eq('source', 'seed')

  if (existingErr) throw existingErr
  const existingCanonicalTexts = new Set(
    (existingSeedRows || []).map((r) => canonicalizeQuestionText(r.question_text))
  )

  // Insert seed questions
  const rows = expandedSeedQuestions
    .filter((q) => !existingCanonicalTexts.has(canonicalizeQuestionText(q.question)))
    .map((q) => ({
    topic,
    difficulty:     normalizeDifficulty(q.difficulty) || inferQuestionDifficulty(q),
    question_type:  q.type,
    question_text:  q.question,
    options:        q.options || null,
    correct_answer: q.correct_answer,
    explanation:    combineExplanationAndTip(q.explanation, q.tip),
    code_language:  q.code_language || null,
    source:         'seed',
  }))

  if (rows.length > 0) {
    await supabase.from('question_bank').insert(rows)
  }
}

async function backfillSeedDifficulties(topic) {
  const { data: seedRows, error } = await supabase
    .from('question_bank')
    .select('id,difficulty,question_type,question_text,options,correct_answer,code_language')
    .eq('topic', topic)
    .eq('source', 'seed')

  if (error) throw error
  if (!seedRows || seedRows.length === 0) return

  const updates = seedRows
    .filter((row) => !normalizeDifficulty(row.difficulty))
    .map((row) => ({
      id: row.id,
      difficulty: inferQuestionDifficulty({
        type: row.question_type,
        question: row.question_text,
        options: row.options,
        correct_answer: row.correct_answer,
        code_language: row.code_language,
      }),
    }))

  if (updates.length === 0) return
  await Promise.all(
    updates.map((u) =>
      supabase
        .from('question_bank')
        .update({ difficulty: u.difficulty })
        .eq('id', u.id)
    )
  )
}

function normalizeDifficulty(value) {
  const normalized = String(value || '').trim().toLowerCase()
  return DIFFICULTY_LEVELS.includes(normalized) ? normalized : null
}

function pickDifficultyPool(questions, requestedDifficulty) {
  const normalized = normalizeDifficulty(requestedDifficulty) || 'intermediate'
  const byDifficulty = questions.reduce((acc, q) => {
    const key = normalizeDifficulty(q.difficulty) || inferQuestionDifficulty({
      type: q.question_type,
      question: q.question_text,
      options: q.options,
      correct_answer: q.correct_answer,
      code_language: q.code_language,
    })
    if (!acc[key]) acc[key] = []
    acc[key].push(q)
    return acc
  }, {})

  const order = getDifficultyFallbackOrder(normalized)
  const merged = []
  for (const level of order) {
    merged.push(...(byDifficulty[level] || []))
  }
  return merged.length > 0 ? merged : questions
}

function getDifficultyFallbackOrder(difficulty) {
  if (difficulty === 'beginner') return ['beginner', 'intermediate', 'advanced']
  if (difficulty === 'advanced') return ['advanced', 'intermediate', 'beginner']
  return ['intermediate', 'beginner', 'advanced']
}

function inferQuestionDifficulty(question) {
  const type = String(question?.type || question?.question_type || '').toLowerCase()
  const text = String(question?.question || question?.question_text || '').toLowerCase()
  const optionsCount = Array.isArray(question?.options) ? question.options.length : 0
  const words = text.split(/\s+/).filter(Boolean).length
  let score = 0

  if (type === 'coding' || type === 'open_ended') score += 2
  if (type === 'fill_blank') score += 1
  if (optionsCount >= 5) score += 1
  if (words >= 20) score += 2
  else if (words >= 12) score += 1
  if (question?.code_language) score += 1
  if (/(explain|compare|diagnose|analyze|design|architecture|trade[- ]?off|why)/.test(text)) {
    score += 2
  }
  if (/(what is|complete|true|false|which|name|define)/.test(text)) {
    score -= 1
  }

  if (score >= 4) return 'advanced'
  if (score <= 1) return 'beginner'
  return 'intermediate'
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function combineExplanationAndTip(explanation, tip) {
  if (!tip) return explanation || null
  if (!explanation) return `Tip: ${tip}`
  return `${explanation}\nTip: ${tip}`
}

function splitExplanationAndTip(value) {
  const raw = String(value || '').trim()
  if (!raw) return { explanation: null, tip: null }
  const marker = '\nTip:'
  const idx = raw.lastIndexOf(marker)
  if (idx === -1) return { explanation: raw, tip: null }
  return {
    explanation: raw.slice(0, idx).trim() || null,
    tip: raw.slice(idx + marker.length).trim() || null,
  }
}

function toShortTip(value) {
  const raw = String(value || '').trim()
  if (!raw) return null
  return raw.split(/[.!?]/).map((part) => part.trim()).filter(Boolean)[0] || raw
}

function expandSeedQuestions(seedQuestions, targetCount) {
  const uniqueBase = Array.from(
    new Map(seedQuestions.map((q) => [canonicalizeQuestionText(q.question), q])).values()
  )
  if (uniqueBase.length >= targetCount) return uniqueBase

  const expanded = [...uniqueBase]
  let variantIndex = 1
  let safety = 0

  while (expanded.length < targetCount && safety < targetCount * 20) {
    for (const base of uniqueBase) {
      if (expanded.length >= targetCount) break
      const variant = createQuestionVariant(base, variantIndex++)
      expanded.push(variant)
    }
    safety += 1
  }

  return Array.from(
    new Map(expanded.map((q) => [canonicalizeQuestionText(q.question), q])).values()
  ).slice(0, targetCount)
}

function canonicalizeQuestionText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/^question variation\s+\d+:\s*/i, '')
    .replace(/\((practice variant|quick check|review drill|concept reinforcement|exam-style|warmup|checkpoint|mastery check)\s+\d+\)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function createQuestionVariant(baseQuestion, variantNumber) {
  const stem = String(baseQuestion.question || '').trim()
  const variantStem = `Question variation ${variantNumber}: ${stem}`

  if (baseQuestion.type === 'multiple_choice' && Array.isArray(baseQuestion.options)) {
    const remapped = remapMultipleChoiceOptions(baseQuestion.options, baseQuestion.correct_answer)
    return {
      ...baseQuestion,
      question: variantStem,
      options: remapped.options,
      correct_answer: remapped.correctAnswer,
    }
  }

  return {
    ...baseQuestion,
    question: variantStem,
  }
}

function remapMultipleChoiceOptions(options, originalCorrectAnswer) {
  const parsed = options.map((raw, idx) => {
    const match = String(raw).match(/^\s*([A-Z])\.\s*(.*)$/i)
    if (match) return { originalLetter: match[1].toUpperCase(), text: match[2], idx }
    return { originalLetter: String.fromCharCode(65 + idx), text: String(raw), idx }
  })

  const correctLetter = String(originalCorrectAnswer || '').trim().toUpperCase()
  const originalCorrect = parsed.find((p) => p.originalLetter === correctLetter)
  const shuffled = shuffle(parsed)
  const relabeled = shuffled.map((p, idx) => ({
    ...p,
    newLetter: String.fromCharCode(65 + idx),
  }))

  const optionsOut = relabeled.map((p) => `${p.newLetter}. ${p.text}`)
  const newCorrect = originalCorrect
    ? (relabeled.find((p) => p.text === originalCorrect.text)?.newLetter || 'A')
    : correctLetter

  return {
    options: optionsOut,
    correctAnswer: newCorrect,
  }
}
