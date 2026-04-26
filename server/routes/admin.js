import { Router } from 'express'
import { supabase } from '../services/db.js'

const router = Router()

function getActivityDate(session) {
  return session.completed_at || null
}

router.get('/access', async (req, res) => {
  return res.json({ isAdmin: Boolean(req.auth?.isAdmin) })
})

router.get('/analytics', async (req, res) => {
  if (!req.auth?.isAdmin) {
    return res.status(403).json({ error: 'Admin role required.' })
  }

  const [{ data: sessions, error: sessionsError }, { data: profiles, error: profilesError }] = await Promise.all([
    supabase
      .from('sessions')
      .select('id,user_id,topic,difficulty,completed,completed_at,score_percent,total_questions,correct_answers')
      .order('completed_at', { ascending: false, nullsFirst: false })
      .limit(5000),
    supabase
      .from('profiles')
      .select('id,full_name'),
  ])

  if (sessionsError) return res.status(500).json({ error: sessionsError.message })
  if (profilesError) return res.status(500).json({ error: profilesError.message })

  const sessionsList = sessions || []
  const profilesList = profiles || []
  const now = Date.now()
  const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000)

  const usersById = new Map(profilesList.map((p) => [p.id, p.full_name || null]))
  const userIdsFromSessions = new Set(sessionsList.map((s) => s.user_id).filter(Boolean))
  const totalUsers = new Set([...profilesList.map((p) => p.id), ...userIdsFromSessions]).size

  const active7 = new Set()
  const active30 = new Set()
  let completedSessions = 0
  let totalScore = 0
  let scoredSessions = 0
  let totalQuestions = 0
  let totalCorrectAnswers = 0

  const topicAgg = new Map()
  const userAgg = new Map()

  for (const session of sessionsList) {
    const activityDate = getActivityDate(session)
    const activityTs = activityDate ? new Date(activityDate).getTime() : null
    const uid = session.user_id
    const questions = Number(session.total_questions || 0)
    const correct = Number(session.correct_answers || 0)
    const score = Number(session.score_percent)

    if (uid && activityTs) {
      if (activityTs >= sevenDaysAgo) active7.add(uid)
      if (activityTs >= thirtyDaysAgo) active30.add(uid)
    }

    if (session.completed) completedSessions += 1
    if (Number.isFinite(score)) {
      totalScore += score
      scoredSessions += 1
    }
    totalQuestions += questions
    totalCorrectAnswers += correct

    const topicKey = session.topic || 'Unknown'
    const topicCurrent = topicAgg.get(topicKey) || {
      topic: topicKey,
      sessions: 0,
      completed: 0,
      totalScore: 0,
      scoredSessions: 0,
      totalQuestions: 0,
    }
    topicCurrent.sessions += 1
    if (session.completed) topicCurrent.completed += 1
    if (Number.isFinite(score)) {
      topicCurrent.totalScore += score
      topicCurrent.scoredSessions += 1
    }
    topicCurrent.totalQuestions += questions
    topicAgg.set(topicKey, topicCurrent)

    if (uid) {
      const userCurrent = userAgg.get(uid) || {
        user_id: uid,
        full_name: usersById.get(uid) || null,
        sessions: 0,
        completed: 0,
        totalScore: 0,
        scoredSessions: 0,
        totalQuestions: 0,
      }
      userCurrent.sessions += 1
      if (session.completed) userCurrent.completed += 1
      if (Number.isFinite(score)) {
        userCurrent.totalScore += score
        userCurrent.scoredSessions += 1
      }
      userCurrent.totalQuestions += questions
      userAgg.set(uid, userCurrent)
    }
  }

  const topTopics = [...topicAgg.values()]
    .map((t) => ({
      topic: t.topic,
      sessions: t.sessions,
      completed: t.completed,
      totalQuestions: t.totalQuestions,
      avgScore: t.scoredSessions ? Math.round(t.totalScore / t.scoredSessions) : 0,
    }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 8)

  const topUsers = [...userAgg.values()]
    .map((u) => ({
      userId: u.user_id,
      fullName: u.full_name || null,
      sessions: u.sessions,
      completed: u.completed,
      totalQuestions: u.totalQuestions,
      avgScore: u.scoredSessions ? Math.round(u.totalScore / u.scoredSessions) : 0,
    }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 10)

  const recentSessions = sessionsList
    .slice(0, 12)
    .map((session) => ({
      id: session.id,
      userId: session.user_id,
      userName: usersById.get(session.user_id) || null,
      topic: session.topic,
      difficulty: session.difficulty,
      completed: session.completed,
      scorePercent: session.score_percent,
      completedAt: session.completed_at,
    }))

  return res.json({
    overview: {
      totalUsers,
      totalSessions: sessionsList.length,
      completedSessions,
      completionRate: sessionsList.length ? Math.round((completedSessions / sessionsList.length) * 100) : 0,
      activeUsersLast7Days: active7.size,
      activeUsersLast30Days: active30.size,
      avgScore: scoredSessions ? Math.round(totalScore / scoredSessions) : 0,
      totalQuestions,
      totalCorrectAnswers,
    },
    topTopics,
    topUsers,
    recentSessions,
    isAdmin: true,
  })
})

export default router
