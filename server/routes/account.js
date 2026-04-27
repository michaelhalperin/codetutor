import { Router } from 'express'
import { supabase } from '../services/db.js'

const router = Router()

// DELETE /api/account — permanently delete the logged-in user's account
router.delete('/', async (req, res) => {
  const userId = req.user?.id
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized.' })
  }

  // Remove user-owned data first to avoid foreign key violations.
  const cleanupSteps = [
    supabase.from('questions').delete().eq('user_id', userId),
    supabase.from('user_question_seen').delete().eq('user_id', userId),
    supabase.from('topic_stats').delete().eq('user_id', userId),
    supabase.from('sessions').delete().eq('user_id', userId),
    supabase.from('profiles').delete().eq('id', userId),
  ]

  for (const step of cleanupSteps) {
    const { error } = await step
    if (error) return res.status(500).json({ error: error.message })
  }

  const { error: deleteAuthUserError } = await supabase.auth.admin.deleteUser(userId)
  if (deleteAuthUserError) {
    return res.status(500).json({ error: deleteAuthUserError.message })
  }

  res.json({ ok: true })
})

export default router
