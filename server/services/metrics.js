const state = {
  requests: 0,
  failures: 0,
  totalLatencyMs: 0,
  evaluations: 0,
  evalLatencyMs: 0,
  byRoute: new Map(),
}

export function recordRequest({ route, latencyMs, failed = false }) {
  state.requests += 1
  if (failed) state.failures += 1
  state.totalLatencyMs += Number(latencyMs || 0)
  const key = String(route || 'unknown')
  const current = state.byRoute.get(key) || { requests: 0, failures: 0, totalLatencyMs: 0 }
  current.requests += 1
  if (failed) current.failures += 1
  current.totalLatencyMs += Number(latencyMs || 0)
  state.byRoute.set(key, current)
}

export function recordEvaluation({ latencyMs }) {
  state.evaluations += 1
  state.evalLatencyMs += Number(latencyMs || 0)
}

export function getMetricsSnapshot() {
  const avgLatencyMs = state.requests ? Math.round(state.totalLatencyMs / state.requests) : 0
  const failureRate = state.requests ? Math.round((state.failures / state.requests) * 100) : 0
  const avgEvalLatencyMs = state.evaluations ? Math.round(state.evalLatencyMs / state.evaluations) : 0
  const byRoute = [...state.byRoute.entries()].map(([route, value]) => ({
    route,
    requests: value.requests,
    failures: value.failures,
    avgLatencyMs: value.requests ? Math.round(value.totalLatencyMs / value.requests) : 0,
  }))
  return {
    requests: state.requests,
    failures: state.failures,
    failureRate,
    avgLatencyMs,
    evaluations: state.evaluations,
    avgEvalLatencyMs,
    byRoute: byRoute.sort((a, b) => b.requests - a.requests).slice(0, 10),
  }
}
