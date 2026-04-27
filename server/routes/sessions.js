import { Router } from 'express'
import { supabase } from '../services/db.js'
import { deleteCacheByPrefix, withCache } from '../services/cache.js'
import { recordRequest } from '../services/metrics.js'

const router = Router()

// GET /api/sessions — full session history for the logged-in user
router.get('/', async (req, res) => {
  const startedAt = Date.now()
  const cacheKey = `sessions:${req.user.id}:${req.auth?.isAdmin ? 'admin' : 'user'}`
  try {
    const payload = await withCache({
      key: cacheKey,
      ttlMs: 30 * 1000,
      loader: async () => {
        const query = supabase
          .from('sessions')
          .select('*')
          .order('completed_at', { ascending: false })

        if (!req.auth?.isAdmin) {
          query.eq('user_id', req.user.id)
        }

        const { data, error } = await query
        if (error) throw error

        const isAdmin = Boolean(req.auth?.isAdmin)
        let sessions = data || []

        if (isAdmin) {
          const userIds = [...new Set(sessions.map((session) => session.user_id).filter(Boolean))]
          let usersById = new Map()

          if (userIds.length > 0) {
            const { data: profiles, error: profilesError } = await supabase
              .from('profiles')
              .select('id,full_name')
              .in('id', userIds)

            if (profilesError) throw profilesError
            usersById = new Map((profiles || []).map((profile) => [profile.id, profile.full_name || null]))
          }

          sessions = sessions.map((session) => ({
            ...session,
            user_name: usersById.get(session.user_id) || null,
          }))
        }
        return { sessions, isAdmin }
      },
    })

    recordRequest({ route: '/api/sessions', latencyMs: Date.now() - startedAt, failed: false })
    res.json(payload)
  } catch (error) {
    recordRequest({ route: '/api/sessions', latencyMs: Date.now() - startedAt, failed: true })
    return res.status(500).json({ error: error.message })
  }
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
  deleteCacheByPrefix(`sessions:${req.user.id}:`)
  res.json({ session: data })
})

// GET /api/sessions/:id/resume — fetch existing questions for unfinished session
router.get('/:id/resume', async (req, res) => {
  const { id } = req.params
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .single()

  if (sessionError) return res.status(500).json({ error: sessionError.message })
  if (!session) return res.status(404).json({ error: 'Session not found.' })

  const { data: questions, error: questionsError } = await supabase
    .from('questions')
    .select('*')
    .eq('session_id', id)
    .eq('user_id', req.user.id)

  if (questionsError) return res.status(500).json({ error: questionsError.message })
  res.json({ session, questions: questions || [] })
})

// GET /api/sessions/:id/results — fetch completed session with detailed question results
router.get('/:id/results', async (req, res) => {
  const { id } = req.params

  let sessionQuery = supabase
    .from('sessions')
    .select('*')
    .eq('id', id)

  if (!req.auth?.isAdmin) {
    sessionQuery = sessionQuery.eq('user_id', req.user.id)
  }

  const { data: session, error: sessionError } = await sessionQuery.single()

  if (sessionError) return res.status(500).json({ error: sessionError.message })
  if (!session) return res.status(404).json({ error: 'Session not found.' })

  const { data: questions, error: questionsError } = await supabase
    .from('questions')
    .select('*')
    .eq('session_id', id)
    .order('created_at', { ascending: true })

  if (questionsError) return res.status(500).json({ error: questionsError.message })
  res.json({ session, questions: questions || [] })
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

  deleteCacheByPrefix(`sessions:${req.user.id}:`)
  deleteCacheByPrefix(`dashboard:${req.user.id}`)
  deleteCacheByPrefix('admin:analytics')
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
  deleteCacheByPrefix('sessions:')
  deleteCacheByPrefix('dashboard:')
  deleteCacheByPrefix('admin:analytics')
  res.json({ ok: true })
})

export default router
