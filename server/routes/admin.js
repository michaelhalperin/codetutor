import { Router } from 'express'
import { supabase } from '../services/db.js'
import { withCache, deleteCacheByPrefix } from '../services/cache.js'
import { getMetricsSnapshot, recordRequest } from '../services/metrics.js'

const router = Router()

function getActivityDate(session) {
  // Count a session as "activity" even if it wasn't completed.
  return session.completed_at || session.started_at || null
}

router.get('/access', async (req, res) => {
  return res.json({ isAdmin: Boolean(req.auth?.isAdmin) })
})

router.get('/analytics', async (req, res) => {
  const startedAt = Date.now()
  if (!req.auth?.isAdmin) {
    return res.status(403).json({ error: 'Admin role required.' })
  }
  try {
    const payload = await withCache({
      key: 'admin:analytics:v2',
      ttlMs: 30 * 1000,
      loader: async () => {
        const [{ data: sessions, error: sessionsError }, { data: profiles, error: profilesError }, { data: authUsers, error: authUsersError }, { data: questions, error: questionsError }] = await Promise.all([
          supabase
            .from('sessions')
            .select('id,user_id,topic,difficulty,completed,started_at,completed_at,score_percent,total_questions,correct_answers')
            .order('completed_at', { ascending: false, nullsFirst: false })
            .limit(5000),
          supabase
            .from('profiles')
            .select('id,full_name'),
          supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
          supabase
            .from('questions')
            .select('id,session_id,question_text,question_type,is_correct,answered_at,created_at')
            .limit(20000),
        ])

        if (sessionsError) throw sessionsError
        if (profilesError) throw profilesError
        if (authUsersError) throw authUsersError
        if (questionsError) throw questionsError

        const sessionsList = sessions || []
        const profilesList = profiles || []
        const questionsList = questions || []
        const authUsersList = authUsers?.users || []
        const now = Date.now()
        const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000)
        const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000)

        const usersById = new Map(profilesList.map((p) => [p.id, p.full_name || null]))
        const authUsersById = new Map(
          authUsersList.map((user) => [
            user.id,
            {
              email: user.email || null,
              createdAt: user.created_at || null,
              lastSignInAt: user.last_sign_in_at || null,
              role: user.role || user.app_metadata?.role || null,
            },
          ])
        )
        const userIdsFromSessions = new Set(sessionsList.map((s) => s.user_id).filter(Boolean))
        const allUserIds = new Set([
          ...authUsersList.map((u) => u.id).filter(Boolean),
          ...profilesList.map((p) => p.id).filter(Boolean),
          ...userIdsFromSessions,
        ])
        const totalUsers = allUserIds.size

        const active7 = new Set()
        const active30 = new Set()
        let completedSessions = 0
        let totalScore = 0
        let scoredSessions = 0
        let totalQuestions = 0
        let totalCorrectAnswers = 0

        const topicAgg = new Map()
        const userAgg = new Map()

        // Ensure "All Users" truly means all known users (even with 0 sessions).
        for (const uid of allUserIds) {
          const authMeta = authUsersById.get(uid)
          userAgg.set(uid, {
            user_id: uid,
            full_name: usersById.get(uid) || null,
            sessions: 0,
            completed: 0,
            totalScore: 0,
            scoredSessions: 0,
            totalQuestions: 0,
            totalCorrectAnswers: 0,
            firstActivityAt: null,
            lastActivityAt: null,
            // Keep auth-only fields available later via authUsersById in mapping
            _hasAuth: Boolean(authMeta),
          })
        }

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
              totalCorrectAnswers: 0,
              firstActivityAt: null,
              lastActivityAt: null,
            }
            userCurrent.sessions += 1
            if (session.completed) userCurrent.completed += 1
            if (Number.isFinite(score)) {
              userCurrent.totalScore += score
              userCurrent.scoredSessions += 1
            }
            userCurrent.totalQuestions += questions
            userCurrent.totalCorrectAnswers += correct
            if (activityDate) {
              if (!userCurrent.firstActivityAt || activityDate < userCurrent.firstActivityAt) {
                userCurrent.firstActivityAt = activityDate
              }
              if (!userCurrent.lastActivityAt || activityDate > userCurrent.lastActivityAt) {
                userCurrent.lastActivityAt = activityDate
              }
            }
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

        const allUsers = [...userAgg.values()]
          .map((u) => ({
            userId: u.user_id,
            fullName: u.full_name || null,
            email: authUsersById.get(u.user_id)?.email || null,
            role: authUsersById.get(u.user_id)?.role || null,
            accountCreatedAt: authUsersById.get(u.user_id)?.createdAt || null,
            lastSignInAt: authUsersById.get(u.user_id)?.lastSignInAt || null,
            sessions: u.sessions,
            completed: u.completed,
            completionRate: u.sessions ? Math.round((u.completed / u.sessions) * 100) : 0,
            totalQuestions: u.totalQuestions,
            totalCorrectAnswers: u.totalCorrectAnswers,
            accuracy: u.totalQuestions ? Math.round((u.totalCorrectAnswers / u.totalQuestions) * 100) : 0,
            avgQuestionsPerSession: u.sessions ? Number((u.totalQuestions / u.sessions).toFixed(1)) : 0,
            avgScore: u.scoredSessions ? Math.round(u.totalScore / u.scoredSessions) : 0,
            firstActivityAt: u.firstActivityAt,
            lastActivityAt: u.lastActivityAt,
          }))
          .sort((a, b) => b.sessions - a.sessions)

        const topUsers = allUsers.filter((u) => (u.sessions || 0) > 0).slice(0, 10)

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

        const cohort = computeCohortRetention({ authUsersList, sessionsList })
        const questionAnalytics = computeQuestionAnalytics({ questionsList })
        const completionFunnel = computeCompletionFunnel({ sessionsList, questionsList })
        const dropoffByQuestionIndex = computeDropoffByIndex({ sessionsList, questionsList })
        const performance = getMetricsSnapshot()

        return {
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
          allUsers,
          recentSessions,
          cohort,
          completionFunnel,
          dropoffByQuestionIndex,
          questionAnalytics,
          performance,
          isAdmin: true,
        }
      },
    })
    recordRequest({ route: '/api/admin/analytics', latencyMs: Date.now() - startedAt, failed: false })
    return res.json(payload)
  } catch (error) {
    recordRequest({ route: '/api/admin/analytics', latencyMs: Date.now() - startedAt, failed: true })
    return res.status(500).json({ error: error.message })
  }
})

router.get('/question-bank', async (req, res) => {
  if (!req.auth?.isAdmin) return res.status(403).json({ error: 'Admin role required.' })
  const { data, error } = await supabase
    .from('question_bank')
    .select('id,topic,difficulty,question_type,question_text,correct_answer,source,code_language,created_at')
    .order('created_at', { ascending: false })
    .limit(300)
  if (error) return res.status(500).json({ error: error.message })
  return res.json({ items: data || [] })
})

router.patch('/question-bank/:id', async (req, res) => {
  if (!req.auth?.isAdmin) return res.status(403).json({ error: 'Admin role required.' })
  const { id } = req.params
  const { action, patch = {} } = req.body || {}
  const update = {}
  if (action === 'approve') update.source = 'approved'
  if (action === 'archive') update.source = 'archived'
  for (const key of ['topic', 'difficulty', 'question_type', 'question_text', 'correct_answer', 'code_language']) {
    if (patch[key] !== undefined) update[key] = patch[key]
  }
  const { data, error } = await supabase
    .from('question_bank')
    .update(update)
    .eq('id', id)
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })
  deleteCacheByPrefix('admin:analytics')
  return res.json({ item: data })
})

function computeCohortRetention({ authUsersList, sessionsList }) {
  let cohortSize = 0
  let d1Retained = 0
  let d7Retained = 0
  const sessionsByUser = new Map()
  for (const session of sessionsList) {
    if (!session.user_id || !session.completed_at) continue
    if (!sessionsByUser.has(session.user_id)) sessionsByUser.set(session.user_id, [])
    sessionsByUser.get(session.user_id).push(new Date(session.completed_at).getTime())
  }
  for (const user of authUsersList || []) {
    const createdAt = user?.created_at ? new Date(user.created_at).getTime() : null
    if (!createdAt) continue
    cohortSize += 1
    const activity = sessionsByUser.get(user.id) || []
    if (activity.some((ts) => ts >= createdAt + (24 * 60 * 60 * 1000) && ts <= createdAt + (2 * 24 * 60 * 60 * 1000))) d1Retained += 1
    if (activity.some((ts) => ts >= createdAt + (7 * 24 * 60 * 60 * 1000) && ts <= createdAt + (8 * 24 * 60 * 60 * 1000))) d7Retained += 1
  }
  return {
    cohortSize,
    d1: cohortSize ? Math.round((d1Retained / cohortSize) * 100) : 0,
    d7: cohortSize ? Math.round((d7Retained / cohortSize) * 100) : 0,
  }
}

function computeCompletionFunnel({ sessionsList, questionsList }) {
  const sessionsCreated = sessionsList.length
  const withQuestions = new Set((questionsList || []).map((q) => q.session_id).filter(Boolean)).size
  const completed = sessionsList.filter((s) => s.completed).length
  return { sessionsCreated, withQuestions, completed }
}

function computeDropoffByIndex({ sessionsList, questionsList }) {
  const questionsBySession = new Map()
  for (const question of questionsList || []) {
    if (!question.session_id) continue
    if (!questionsBySession.has(question.session_id)) questionsBySession.set(question.session_id, [])
    questionsBySession.get(question.session_id).push(question)
  }
  const indexMap = new Map()
  for (const session of sessionsList || []) {
    const rows = (questionsBySession.get(session.id) || []).sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
    rows.forEach((row, idx) => {
      const key = idx + 1
      const current = indexMap.get(key) || { index: key, shown: 0, answered: 0 }
      current.shown += 1
      if (row.answered_at) current.answered += 1
      indexMap.set(key, current)
    })
  }
  return [...indexMap.values()]
    .map((row) => ({ ...row, dropoffRate: row.shown ? Math.round(((row.shown - row.answered) / row.shown) * 100) : 0 }))
    .sort((a, b) => a.index - b.index)
    .slice(0, 20)
}

function canonicalQuestionText(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim()
}

function computeQuestionAnalytics({ questionsList }) {
  const agg = new Map()
  for (const q of questionsList || []) {
    const key = canonicalQuestionText(q.question_text)
    if (!key) continue
    const current = agg.get(key) || {
      question: q.question_text,
      type: q.question_type,
      attempts: 0,
      correct: 0,
    }
    current.attempts += 1
    if (q.is_correct) current.correct += 1
    agg.set(key, current)
  }
  const rows = [...agg.values()].map((row) => {
    const correctRate = row.attempts ? Math.round((row.correct / row.attempts) * 100) : 0
    let classification = 'balanced'
    if (correctRate >= 90) classification = 'too_easy'
    else if (correctRate <= 30) classification = 'too_hard'
    else if (correctRate >= 40 && correctRate <= 60) classification = 'ambiguous'
    return { ...row, correctRate, classification }
  })
  return {
    tooEasy: rows.filter((r) => r.classification === 'too_easy').slice(0, 20),
    tooHard: rows.filter((r) => r.classification === 'too_hard').slice(0, 20),
    ambiguous: rows.filter((r) => r.classification === 'ambiguous').slice(0, 20),
  }
}

export default router
