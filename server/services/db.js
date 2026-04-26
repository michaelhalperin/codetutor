import { createClient } from '@supabase/supabase-js'

// Use service role key on the server (bypasses RLS for server-side ops)
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
