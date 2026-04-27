import { Router } from 'express'
import { supabase } from '../services/db.js'
import { withCache } from '../services/cache.js'
import { recordRequest } from '../services/metrics.js'

const router = Router()

// GET /api/dashboard — full dashboard data for the logged-in user
router.get('/', async (req, res) => {
  const startedAt = Date.now()
  const userId = req.user.id
  const cacheKey = `dashboard:${userId}`
  try {
    const payload = await withCache({
      key: cacheKey,
      ttlMs: 30 * 1000,
      loader: async () => {
        // Completed sessions (used for recent list + topic aggregation)
        const { data: completedSessions, error: sessErr } = await supabase
          .from('sessions')
          .select('*')
          .eq('user_id', userId)
          .eq('completed', true)
          .order('completed_at', { ascending: false })

        if (sessErr) throw sessErr

        const recentSessions = (completedSessions || []).slice(0, 10)
        const topicStats = aggregateTopicStats(completedSessions || [])

        // Overall stats
        const totalSessions = (completedSessions || []).length
        const totalQuestions = (completedSessions || []).reduce(
          (sum, s) => sum + Number(s.total_questions || 0),
          0
        )
        const totalCorrectAnswers = (completedSessions || []).reduce(
          (sum, s) => sum + Number(s.correct_answers || 0),
          0
        )
        const avgScore = totalSessions > 0
          ? Math.round((totalCorrectAnswers / Math.max(1, totalQuestions)) * 100)
          : 0

        // Streak: count consecutive days with at least one session
        const streak = calculateStreak(completedSessions || [])

        return {
          recentSessions,
          topicStats,
          overview: {
            totalSessions,
            totalQuestions,
            avgScore,
            streak,
          },
        }
      },
    })

    recordRequest({ route: '/api/dashboard', latencyMs: Date.now() - startedAt, failed: false })
    res.json(payload)
  } catch (error) {
    recordRequest({ route: '/api/dashboard', latencyMs: Date.now() - startedAt, failed: true })
    res.status(500).json({ error: error.message })
  }
})

function calculateStreak(sessions) {
  if (!sessions.length) return 0
  const dates = [...new Set(
    sessions.map((s) => new Date(s.completed_at).toDateString())
  )]
  let streak = 0
  const today = new Date()
  for (let i = 0; i < dates.length; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    if (dates.includes(d.toDateString())) streak++
    else break
  }
  return streak
}

function aggregateTopicStats(sessions) {
  const topicMap = new Map()

  for (const s of sessions) {
    const key = String(s.topic || '').trim()
    if (!key) continue

    if (!topicMap.has(key)) {
      topicMap.set(key, {
        id: key,
        topic: key,
        sessions_count: 0,
        total_questions: 0,
        correct_answers: 0,
        avg_score: 0,
        last_practiced: null,
      })
    }

    const row = topicMap.get(key)
    const totalQuestions = Number(s.total_questions || 0)
    const correctAnswers = Number(s.correct_answers || 0)

    row.sessions_count += 1
    row.total_questions += totalQuestions
    row.correct_answers += correctAnswers

    const completedAt = s.completed_at || null
    if (!row.last_practiced || (completedAt && new Date(completedAt) > new Date(row.last_practiced))) {
      row.last_practiced = completedAt
    }
  }

  return [...topicMap.values()]
    .map((row) => ({
      ...row,
      avg_score: row.total_questions > 0
        ? Math.round((row.correct_answers / row.total_questions) * 100)
        : 0,
    }))
    .sort((a, b) => {
      const aTime = a.last_practiced ? new Date(a.last_practiced).getTime() : 0
      const bTime = b.last_practiced ? new Date(b.last_practiced).getTime() : 0
      return bTime - aTime
    })
}

export default router
