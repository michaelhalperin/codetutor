/**
 * One-off: create Supabase Auth users with a shared initial password and
 * user_metadata.must_change_password so the client forces a change on first login.
 *
 * Usage:
 *   cd server && node scripts/provision-users.mjs
 * Existing addresses are skipped unless you explicitly reset one:
 *   cd server && node scripts/provision-users.mjs --sync-existing user@example.com
 */
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const EMAILS = [
  'aviv322deri@gmail.com',
  'tprhoahau156348@gmail.com',
  'kenblock.ar@gmail.com',
  'z7685727@gmail.com',
  'hallelkedar000@gmail.com',
  'c0507634153@gmail.com',
  'netanelbenza@gmail.com',
  'Yosefchen103@gmail.com',
  'elchanan003@gmail.com',
  'elyasafw1997@gmail.com',
  'avroumi97@gmail.com',
  'dspiller321@gmail.com',
  'mosheyz770@gmail.com',
  'michaelwork1010@gmail.com',
]

const INITIAL_PASSWORD = '123456789'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server/.env')
  process.exit(1)
}

const supabase = createClient(url, key)

async function findUserIdByEmail(targetEmail) {
  const needle = targetEmail.trim().toLowerCase()
  let page = 1
  const perPage = 1000
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const users = data?.users || []
    const hit = users.find((u) => (u.email || '').toLowerCase() === needle)
    if (hit?.id) return hit.id
    if (users.length < perPage) return null
    page += 1
  }
}

/** Reset password + force change-password modal on next login (existing accounts only). */
async function syncExistingProvisionedUser(emailRaw) {
  const normalized = emailRaw.trim()
  const id = await findUserIdByEmail(normalized)
  if (!id) return { ok: false, reason: 'not_found', normalized }

  const { data: existing, error: getErr } = await supabase.auth.admin.getUserById(id)
  if (getErr) return { ok: false, reason: 'get_user_failed', error: getErr }

  const mergedMeta = {
    ...(existing?.user?.user_metadata || {}),
    must_change_password: true,
  }

  const { error: upErr } = await supabase.auth.admin.updateUserById(id, {
    password: INITIAL_PASSWORD,
    email_confirm: true,
    user_metadata: mergedMeta,
  })
  if (upErr) return { ok: false, reason: 'update_failed', error: upErr }
  return { ok: true, id, normalized }
}

async function main() {
  const syncEmails = new Set()
  const argv = process.argv.slice(2)
  const syncFlagIdx = argv.indexOf('--sync-existing')
  if (syncFlagIdx !== -1) {
    const arg = argv[syncFlagIdx + 1]
    if (!arg || arg.startsWith('-')) {
      console.error('Missing email: node scripts/provision-users.mjs --sync-existing user@example.com')
      process.exit(1)
    }
    syncEmails.add(arg.trim().toLowerCase())
  }

  for (const email of EMAILS) {
    const normalized = email.trim()
    const { data, error } = await supabase.auth.admin.createUser({
      email: normalized,
      password: INITIAL_PASSWORD,
      email_confirm: true,
      user_metadata: { must_change_password: true },
    })
    if (!error) {
      console.log(`created: ${normalized}`, data?.user?.id || '')
      continue
    }

    const msg = String(error.message || '').toLowerCase()
    const duplicate =
      msg.includes('already been registered') ||
      msg.includes('already registered') ||
      msg.includes('duplicate')

    if (!duplicate) {
      console.error(`fail: ${normalized}`, error.message || error)
      continue
    }

    if (syncEmails.has(normalized.toLowerCase())) {
      const r = await syncExistingProvisionedUser(normalized)
      if (r.ok) console.log(`updated (existing): ${r.normalized}`, r.id)
      else console.error(`skip sync failed ${normalized}`, r.reason, r.error?.message || '')
      continue
    }

    console.log(`skip (exists): ${normalized}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
