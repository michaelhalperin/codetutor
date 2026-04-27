const store = new Map()

export function getCache(key) {
  const entry = store.get(key)
  if (!entry) return null
  if (entry.expiresAt <= Date.now()) {
    store.delete(key)
    return null
  }
  return entry.value
}

export function setCache(key, value, ttlMs) {
  store.set(key, {
    value,
    expiresAt: Date.now() + Math.max(0, Number(ttlMs || 0)),
  })
}

export function deleteCacheByPrefix(prefix) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key)
  }
}

export function withCache({ key, ttlMs, loader }) {
  const cached = getCache(key)
  if (cached) return Promise.resolve(cached)
  return Promise.resolve(loader()).then((value) => {
    setCache(key, value, ttlMs)
    return value
  })
}
