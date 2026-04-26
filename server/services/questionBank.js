import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { supabase } from './db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SEED_PATH = join(__dirname, '../data/questionBank.json')

// Load the seed bank once at startup
const SEED_BANK = JSON.parse(readFileSync(SEED_PATH, 'utf8'))
const MIN_SEED_QUESTIONS_PER_TOPIC = 30
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
export async function getQuestionsForSession({ userId, topic, difficulty, count, sessionId }) {
  // Step 1: Ensure seed questions are in the DB for this topic
  await ensureSeedQuestions(topic)

  // Step 2: Fetch all bank questions for this topic (any difficulty is fine —
  //         difficulty is applied as a filter for AI-generated questions)
  const { data: bankQuestions, error: bankErr } = await supabase
    .from('question_bank')
    .select('*')
    .eq('topic', topic)

  if (bankErr) throw bankErr
  if (!bankQuestions || bankQuestions.length === 0) {
    throw new Error(`No questions are configured for topic "${topic}" yet.`)
  }

  // Guard against duplicates and synthetic variants that only differ by suffix.
  const dedupedBankQuestions = Array.from(
    new Map(bankQuestions.map((q) => [canonicalizeQuestionText(q.question_text), q])).values()
  )

  // Step 3: Find which ones this user has NOT answered yet
  const { data: seen, error: seenErr } = await supabase
    .from('user_question_seen')
    .select('question_bank_id')
    .eq('user_id', userId)
    .eq('topic', topic)

  if (seenErr) throw seenErr

  const seenIds = new Set(seen.map((s) => s.question_bank_id))
  const seenCanonical = new Set(
    bankQuestions
      .filter((q) => seenIds.has(q.id))
      .map((q) => canonicalizeQuestionText(q.question_text))
  )
  let unseen = dedupedBankQuestions.filter(
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
    unseen = shuffle(dedupedBankQuestions)
  }

  // If the canonical pool is smaller than requested, return as many distinct
  // questions as exist (never duplicates within a single session).
  if (unseen.length < count) {
    selected = unseen
  } else {
    selected = shuffle(unseen).slice(0, count)
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
    return {
      id:             sq.id,
      type:           sq.question_type,
      question:       sq.question_text,
      options:        sq.options,
      correct_answer: sq.correct_answer,
      explanation,
      tip,
      code_language:  sq.code_language,
    }
  })
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
    difficulty:     'mixed',      // seed questions cover all levels
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
