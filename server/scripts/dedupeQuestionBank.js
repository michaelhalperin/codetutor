import 'dotenv/config'
import { supabase } from '../services/db.js'

function keyFor(row) {
  return `${row.topic}:::${row.question_text}`
}

async function main() {
  const { data: bankRows, error: bankErr } = await supabase
    .from('question_bank')
    .select('id,topic,question_text,created_at')
    .order('created_at', { ascending: true })

  if (bankErr) throw bankErr

  const groups = new Map()
  for (const row of bankRows || []) {
    const key = keyFor(row)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  }

  const duplicateGroups = [...groups.values()].filter((rows) => rows.length > 1)
  const duplicateIds = []
  const oldToKeep = new Map()

  for (const rows of duplicateGroups) {
    const [keep, ...dups] = rows
    for (const dup of dups) {
      duplicateIds.push(dup.id)
      oldToKeep.set(dup.id, { keepId: keep.id, topic: keep.topic })
    }
  }

  console.log(
    JSON.stringify({
      totalRows: bankRows.length,
      duplicateGroups: duplicateGroups.length,
      duplicateRows: duplicateIds.length,
    })
  )

  if (duplicateIds.length === 0) {
    console.log('No duplicates found in question_bank.')
    return
  }

  const { data: seenRows, error: seenErr } = await supabase
    .from('user_question_seen')
    .select('id,user_id,topic,question_bank_id')
    .in('question_bank_id', duplicateIds)

  if (seenErr) throw seenErr

  const migratedSeenRows = []
  for (const seen of seenRows || []) {
    const mapping = oldToKeep.get(seen.question_bank_id)
    if (!mapping) continue
    migratedSeenRows.push({
      user_id: seen.user_id,
      topic: mapping.topic,
      question_bank_id: mapping.keepId,
    })
  }

  if (migratedSeenRows.length > 0) {
    const { error: upsertErr } = await supabase
      .from('user_question_seen')
      .upsert(migratedSeenRows, { onConflict: 'user_id,question_bank_id' })
    if (upsertErr) throw upsertErr
  }

  const { error: deleteSeenErr } = await supabase
    .from('user_question_seen')
    .delete()
    .in('question_bank_id', duplicateIds)
  if (deleteSeenErr) throw deleteSeenErr

  const { error: deleteBankErr } = await supabase
    .from('question_bank')
    .delete()
    .in('id', duplicateIds)
  if (deleteBankErr) throw deleteBankErr

  const { data: afterRows, error: afterErr } = await supabase
    .from('question_bank')
    .select('id,topic,question_text')
  if (afterErr) throw afterErr

  const postSet = new Set()
  let postDupes = 0
  for (const row of afterRows || []) {
    const key = keyFor(row)
    if (postSet.has(key)) postDupes += 1
    postSet.add(key)
  }

  console.log(
    JSON.stringify({
      migratedSeenRows: migratedSeenRows.length,
      deletedDuplicateRows: duplicateIds.length,
      remainingRows: afterRows.length,
      remainingDuplicateRows: postDupes,
    })
  )
}

main().catch((err) => {
  console.error('dedupeQuestionBank failed:', err)
  process.exit(1)
})
