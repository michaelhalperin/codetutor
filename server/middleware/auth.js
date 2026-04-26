import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function getAdminIds() {
  return (process.env.ADMIN_USER_IDS || process.env.ADMIN_USER_ID || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
}

export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header.' })
  }

  const token = authHeader.split(' ')[1]
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token.' })
  }

  // Ensure profile exists so foreign keys to profiles(id) succeed.
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        full_name: user.user_metadata?.full_name ?? null,
      },
      { onConflict: 'id' }
    )

  if (profileError) {
    return res.status(500).json({ error: 'Could not ensure user profile exists.' })
  }

  const adminIds = getAdminIds()
  req.user = user
  req.auth = {
    isAdmin: adminIds.includes(user.id),
  }
  next()
}
