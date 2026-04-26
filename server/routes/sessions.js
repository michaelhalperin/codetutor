import { Router } from 'express'
import { supabase } from '../services/db.js'

const router = Router()

// GET /api/sessions — full session history for the logged-in user
router.get('/', async (req, res) => {
  const query = supabase
    .from('sessions')
    .select('*')
    .order('completed_at', { ascending: false })

  if (!req.auth?.isAdmin) {
    query.eq('user_id', req.user.id)
  }

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json({ sessions: data || [], isAdmin: Boolean(req.auth?.isAdmin) })
})

// POST /api/sessions — create a new session
router.post('/', async (req, res) => {
  const { topic, difficulty } = req.body
  if (!topic || !difficulty) {
    return res.status(400).json({ error: 'topic and difficulty are required.' })
  }

  const { data, error } = await supabase
    .from('sessions')
    .insert({ user_id: req.user.id, topic, difficulty })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json({ session: data })
})

// PATCH /api/sessions/:id/complete — mark session done and save score
router.patch('/:id/complete', async (req, res) => {
  const { id } = req.params
  const { totalQuestions, correctAnswers } = req.body

  const scorePercent = totalQuestions > 0
    ? Math.round((correctAnswers / totalQuestions) * 100)
    : 0

  const { data: session, error } = await supabase
    .from('sessions')
    .update({
      completed:       true,
      total_questions: totalQuestions,
      correct_answers: correctAnswers,
      score_percent:   scorePercent,
      completed_at:    new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', req.user.id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })

  // Upsert topic_stats
  const { data: existing } = await supabase
    .from('topic_stats')
    .select()
    .eq('user_id', req.user.id)
    .eq('topic', session.topic)
    .single()

  if (existing) {
    const newTotal = existing.total_questions + totalQuestions
    const newCorrect = existing.correct_answers + correctAnswers
    await supabase
      .from('topic_stats')
      .update({
        sessions_count:  existing.sessions_count + 1,
        total_questions: newTotal,
        correct_answers: newCorrect,
        avg_score:       Math.round((newCorrect / newTotal) * 100),
        last_practiced:  new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    await supabase.from('topic_stats').insert({
      user_id:         req.user.id,
      topic:           session.topic,
      sessions_count:  1,
      total_questions: totalQuestions,
      correct_answers: correctAnswers,
      avg_score:       scorePercent,
    })
  }

  res.json({ session, scorePercent })
})

// DELETE /api/sessions/:id — delete a session (admin only)
router.delete('/:id', async (req, res) => {
  if (!req.auth?.isAdmin) {
    return res.status(403).json({ error: 'Admin role required.' })
  }

  const { id } = req.params
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

export default router
