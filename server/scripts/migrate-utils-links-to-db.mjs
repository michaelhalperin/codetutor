import 'dotenv/config'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { supabase } from '../services/db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const linksFilePath = path.join(__dirname, '..', 'uploads', 'utils', 'links.json')

async function main() {
  let raw
  try {
    raw = await fs.readFile(linksFilePath, 'utf8')
  } catch {
    console.error('No links.json found at', linksFilePath)
    process.exit(1)
  }
  const parsed = JSON.parse(raw)
  const links = Array.isArray(parsed) ? parsed : []
  if (!links.length) {
    console.log('links.json is empty; nothing to migrate.')
    return
  }
  const rows = links.map((row) => ({
    id: row.id,
    title: row.title,
    url: row.url,
    uploaded_at: row.uploadedAt || new Date().toISOString(),
  }))
  const { error } = await supabase.from('utils_links').upsert(rows, { onConflict: 'id' })
  if (error) throw error
  console.log(`Migrated ${rows.length} link(s) into utils_links.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
