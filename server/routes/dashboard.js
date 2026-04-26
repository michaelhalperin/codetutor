import { Router } from 'express'
import { supabase } from '../services/db.js'

const router = Router()

// GET /api/dashboard — full dashboard data for the logged-in user
router.get('/', async (req, res) => {
  const userId = req.user.id

  // Recent sessions (last 10)
  const { data: recentSessions, error: sessErr } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('completed', true)
    .order('completed_at', { ascending: false })
    .limit(10)

  if (sessErr) return res.status(500).json({ error: sessErr.message })

  // Topic stats
  const { data: topicStats, error: topicErr } = await supabase
    .from('topic_stats')
    .select('*')
    .eq('user_id', userId)
    .order('last_practiced', { ascending: false })

  if (topicErr) return res.status(500).json({ error: topicErr.message })

  // Overall stats
  const totalSessions = recentSessions.length
  const avgScore = totalSessions > 0
    ? Math.round(recentSessions.reduce((sum, s) => sum + s.score_percent, 0) / totalSessions)
    : 0

  // Streak: count consecutive days with at least one session
  const streak = calculateStreak(recentSessions)

  res.json({
    recentSessions,
    topicStats,
    overview: {
      totalSessions: topicStats.reduce((sum, t) => sum + t.sessions_count, 0),
      totalQuestions: topicStats.reduce((sum, t) => sum + t.total_questions, 0),
      avgScore,
      streak,
    },
  })
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

export default router
