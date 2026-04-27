function hashString(input) {
  let hash = 0
  const value = String(input || '')
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function pickByHash(seed, variants) {
  const idx = hashString(seed) % variants.length
  return variants[idx]
}

export function getUserExperimentConfig(userId) {
  const id = String(userId || 'anon')
  return {
    hintStyle: pickByHash(`${id}:hint-style`, ['short', 'detailed']),
    questionOrder: pickByHash(`${id}:question-order`, ['mixed', 'grouped_by_type']),
    feedbackFormat: pickByHash(`${id}:feedback-format`, ['concise', 'coach']),
  }
}
