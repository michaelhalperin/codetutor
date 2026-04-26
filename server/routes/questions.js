import { Router } from 'express'
import { batchEvaluateAnswers } from '../services/claude.js'
import { supabase } from '../services/db.js'
import { getQuestionsForSession } from '../services/questionBank.js'

const router = Router()

// POST /api/questions/next
// Returns the next batch of questions for a session, drawn from the bank.
// If unseen questions are exhausted, previously seen bank questions can be reused.
router.post('/next', async (req, res) => {
  const { topic, difficulty, count = 5, sessionId } = req.body

  if (!topic || !difficulty || !sessionId) {
    return res.status(400).json({ error: 'topic, difficulty, and sessionId are required.' })
  }

  try {
    const questions = await getQuestionsForSession({
      userId: req.user.id,
      topic,
      difficulty,
      count,
      sessionId,
    })
    res.json({ questions })
  } catch (err) {
    console.error('Get questions error:', err)
    res.status(err.status || 500).json({ error: err.message || 'Failed to load questions.' })
  }
})

// POST /api/questions/evaluate-session
// Called ONCE at the end of a session with all student answers.
// Evaluation is done locally (AI disabled).
router.post('/evaluate-session', async (req, res) => {
  const { answers } = req.body
  // answers: [{ questionId, questionText, questionType, userAnswer, correctAnswer, language }]

  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: 'answers array is required.' })
  }

  try {
    const results = await batchEvaluateAnswers(answers)

    // Persist results back to the questions table
    await Promise.all(
      results.map(({ questionId, is_correct, score, feedback }) =>
        supabase
          .from('questions')
          .update({
            is_correct,
            ai_feedback: feedback,
            answered_at: new Date().toISOString(),
          })
          .eq('id', questionId)
          .eq('user_id', req.user.id)
      )
    )

    res.json({ results })
  } catch (err) {
    console.error('Batch evaluate error:', err)
    res.status(500).json({ error: err.message || 'Failed to evaluate answers.' })
  }
})

export default router
