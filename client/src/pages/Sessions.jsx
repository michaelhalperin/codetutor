import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, PlayCircle, Trash2, XCircle, Eye, SlidersHorizontal, ChevronDown, ChevronRight } from 'lucide-react'
import Navbar from '../components/Navbar'
import toast from 'react-hot-toast'
import { deleteSession, getSessions } from '../lib/api'

function ScoreBadge({ score }) {
  if (score == null) return <span className="text-slate-400 text-sm">-</span>
  if (score >= 80) return <span className="text-emerald-400 font-semibold">{score}%</span>
  if (score >= 50) return <span className="text-amber-400 font-semibold">{score}%</span>
  return <span className="text-rose-400 font-semibold">{score}%</span>
}

function safeLower(value) {
  return String(value || '').toLowerCase()
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

export default function Sessions() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState({
    userId: 'all',
    topic: 'all',
    difficulty: 'all',
    status: 'all', // all | completed | in_progress
    from: '',
    to: '',
  })

  useEffect(() => {
    getSessions()
      .then(({ data }) => {
        setSessions(data.sessions || [])
        setIsAdmin(Boolean(data.isAdmin))
      })
      .catch(() => setSessions([]))
      .finally(() => setLoading(false))
  }, [])

  const filterOptions = useMemo(() => {
    const users = new Map()
    const topics = new Set()
    const difficulties = new Set()

    for (const s of sessions) {
      if (s.user_id) users.set(s.user_id, s.user_name || s.user_id)
      if (s.topic) topics.add(s.topic)
      if (s.difficulty) difficulties.add(s.difficulty)
    }

    return {
      users: [...users.entries()]
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      topics: [...topics].sort((a, b) => a.localeCompare(b)),
      difficulties: [...difficulties].sort((a, b) => a.localeCompare(b)),
    }
  }, [sessions])

  const filteredSessions = useMemo(() => {
    // Non-admins shouldn't see filters (and they only receive their sessions anyway).
    if (!isAdmin) return sessions

    const fromTs = filters.from ? new Date(`${filters.from}T00:00:00`).getTime() : null
    const toTs = filters.to ? new Date(`${filters.to}T23:59:59`).getTime() : null

    return sessions.filter((s) => {
      if (filters.userId !== 'all' && s.user_id !== filters.userId) return false
      if (filters.topic !== 'all' && s.topic !== filters.topic) return false
      if (filters.difficulty !== 'all' && s.difficulty !== filters.difficulty) return false
      if (filters.status === 'completed' && !s.completed) return false
      if (filters.status === 'in_progress' && s.completed) return false

      if (fromTs || toTs) {
        const dt = s.completed_at || s.started_at || null
        const ts = dt ? new Date(dt).getTime() : null
        if (!ts) return false
        if (fromTs && ts < fromTs) return false
        if (toTs && ts > toTs) return false
      }

      return true
    })
  }, [filters, isAdmin, sessions])

  const handleDelete = async (sessionId) => {
    if (!window.confirm('Delete this session permanently?')) return
    setDeletingId(sessionId)
    try {
      await deleteSession(sessionId)
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      toast.success('Session deleted.')
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to delete session.')
    } finally {
      setDeletingId(null)
    }
  }

  const completedCount = useMemo(
    () => filteredSessions.filter((s) => s.completed).length,
    [filteredSessions]
  )

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8 h-[calc(100vh-64px)] flex flex-col">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">All Sessions</h1>
            {loading ? (
              <div className="mt-2 h-5 w-44 bg-slate-700/50 rounded animate-pulse" />
            ) : (
              <p className="text-slate-400 mt-1">
                {filteredSessions.length} total · {completedCount} completed
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && !loading && (
              <button
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
                className="inline-flex items-center gap-2 text-slate-300 hover:text-white bg-dark-800/70 hover:bg-dark-800 border border-slate-700/80 px-3 py-1.5 rounded-lg text-sm transition"
              >
                <SlidersHorizontal size={15} />
                Filters
                {filtersOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            )}
          </div>
        </div>

        {isAdmin && !loading && (
          <div className="mb-3">
            {filtersOpen && (
              <div className="mt-2 bg-dark-800/80 rounded-xl border border-slate-700 p-3">
                <div className="flex flex-col lg:flex-row gap-2">
                  <select
                    value={filters.userId}
                    onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value }))}
                    className="w-full lg:w-56 bg-dark-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/60"
                  >
                    <option value="all">All users</option>
                    {filterOptions.users.map((u) => (
                      <option key={u.id} value={u.id}>{u.label}</option>
                    ))}
                  </select>

                  <select
                    value={filters.topic}
                    onChange={(e) => setFilters((f) => ({ ...f, topic: e.target.value }))}
                    className="w-full lg:w-48 bg-dark-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/60"
                  >
                    <option value="all">All topics</option>
                    {filterOptions.topics.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>

                  <select
                    value={filters.difficulty}
                    onChange={(e) => setFilters((f) => ({ ...f, difficulty: e.target.value }))}
                    className="w-full lg:w-40 bg-dark-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 capitalize focus:outline-none focus:ring-2 focus:ring-primary-500/60"
                  >
                    <option value="all">All levels</option>
                    {filterOptions.difficulties.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>

                  <select
                    value={filters.status}
                    onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                    className="w-full lg:w-40 bg-dark-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/60"
                  >
                    <option value="all">All status</option>
                    <option value="completed">Completed</option>
                    <option value="in_progress">In progress</option>
                  </select>
                </div>

                <div className="mt-2 flex flex-col sm:flex-row gap-2 sm:items-end sm:justify-between">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full sm:w-auto">
                    <div>
                      <p className="text-slate-500 text-xs mb-1">From</p>
                      <input
                        type="date"
                        value={filters.from}
                        onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
                        className="w-full bg-dark-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/60"
                      />
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs mb-1">To</p>
                      <input
                        type="date"
                        value={filters.to}
                        onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
                        className="w-full bg-dark-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/60"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setFilters({ userId: 'all', topic: 'all', difficulty: 'all', status: 'all', from: '', to: '' })}
                    className="text-xs font-medium text-slate-200 bg-dark-900 hover:bg-slate-800 border border-slate-700 px-2.5 py-1.5 rounded-lg transition w-full sm:w-auto"
                  >
                    Clear filters
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="space-y-3 animate-pulse overflow-y-auto pr-1 flex-1 min-h-0">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="bg-dark-800 rounded-xl border border-slate-700 p-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="space-y-2">
                    <div className="h-4 w-40 bg-slate-700/60 rounded" />
                    <div className="h-3 w-24 bg-slate-700/50 rounded" />
                  </div>
                  <div className="h-6 w-24 bg-slate-700/50 rounded-full" />
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  <div className="bg-dark-900 rounded-lg border border-slate-700 px-3 py-2">
                    <div className="h-3 w-10 bg-slate-700/50 rounded mb-2" />
                    <div className="h-4 w-14 bg-slate-700/60 rounded" />
                  </div>
                  <div className="bg-dark-900 rounded-lg border border-slate-700 px-3 py-2">
                    <div className="h-3 w-16 bg-slate-700/50 rounded mb-2" />
                    <div className="h-4 w-10 bg-slate-700/60 rounded" />
                  </div>
                  <div className="bg-dark-900 rounded-lg border border-slate-700 px-3 py-2">
                    <div className="h-3 w-12 bg-slate-700/50 rounded mb-2" />
                    <div className="h-4 w-10 bg-slate-700/60 rounded" />
                  </div>
                  <div className="col-span-2 bg-dark-900 rounded-lg border border-slate-700 px-3 py-2">
                    <div className="h-3 w-24 bg-slate-700/50 rounded mb-2" />
                    <div className="h-4 w-44 bg-slate-700/60 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="bg-dark-800 rounded-xl border border-slate-700 p-8 text-center overflow-y-auto pr-1 flex-1 min-h-0">
            <p className="text-slate-300 font-medium">{sessions.length === 0 ? 'No sessions yet.' : 'No sessions match your filters.'}</p>
            <p className="text-slate-500 text-sm mt-1">
              {sessions.length === 0 ? 'Start practicing to build your history.' : 'Try clearing or adjusting the filters.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 overflow-y-auto pr-1 flex-1 min-h-0">
            {filteredSessions.map((s) => (
              <div key={s.id} className="bg-dark-800 rounded-xl border border-slate-700 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <div>
                    <p className="text-white font-semibold">{s.topic}</p>
                    {isAdmin && (
                      <p className="text-slate-500 text-xs">
                        User: {s.user_name || s.user_id || 'Unknown user'}
                      </p>
                    )}
                    <p className="text-slate-400 text-sm capitalize">{s.difficulty}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.completed ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-900/20 border border-emerald-700/40 px-2.5 py-1 rounded-full">
                        <CheckCircle2 size={14} />
                        Completed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-amber-300 bg-amber-900/20 border border-amber-700/40 px-2.5 py-1 rounded-full">
                        <Clock3 size={14} />
                        In progress
                      </span>
                    )}
                    {!s.completed && (
                      <button
                        onClick={() => navigate('/session', {
                          state: {
                            session: s,
                            topic: s.topic,
                            difficulty: s.difficulty,
                            count: s.total_questions || 5,
                            resumeSession: true,
                          },
                        })}
                        className="inline-flex items-center gap-1.5 text-xs text-primary-200 hover:text-white bg-primary-700/30 hover:bg-primary-700/50 border border-primary-600/40 px-2.5 py-1 rounded-full transition"
                      >
                        <PlayCircle size={14} />
                        Resume
                      </button>
                    )}
                    {s.completed && (
                      <button
                        onClick={() => navigate('/results', {
                          state: {
                            sessionId: s.id,
                            topic: s.topic,
                            difficulty: s.difficulty,
                          },
                        })}
                        className="inline-flex items-center gap-1.5 text-xs text-blue-200 hover:text-white bg-blue-700/20 hover:bg-blue-700/35 border border-blue-600/40 px-2.5 py-1 rounded-full transition"
                      >
                        <Eye size={14} />
                        View Results
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(s.id)}
                        disabled={deletingId === s.id}
                        className="inline-flex items-center gap-1.5 text-xs text-rose-300 hover:text-rose-200 bg-rose-900/20 hover:bg-rose-900/30 border border-rose-700/40 px-2.5 py-1 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={14} />
                        {deletingId === s.id ? 'Deleting...' : 'Delete'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
                  <div className="bg-dark-900 rounded-lg border border-slate-700 px-3 py-2">
                    <p className="text-slate-500 text-xs mb-1">Score</p>
                    <ScoreBadge score={s.score_percent} />
                  </div>
                  <div className="bg-dark-900 rounded-lg border border-slate-700 px-3 py-2">
                    <p className="text-slate-500 text-xs mb-1">Questions</p>
                    <p className="text-slate-200">{s.total_questions ?? '-'}</p>
                  </div>
                  <div className="bg-dark-900 rounded-lg border border-slate-700 px-3 py-2">
                    <p className="text-slate-500 text-xs mb-1">Correct</p>
                    <p className="text-slate-200">{s.correct_answers ?? '-'}</p>
                  </div>
                  <div className="col-span-2 bg-dark-900 rounded-lg border border-slate-700 px-3 py-2">
                    <p className="text-slate-500 text-xs mb-1 flex items-center gap-1.5">
                      <CalendarDays size={13} />
                      {s.completed ? 'Completed At' : 'Started At'}
                    </p>
                    <p className="text-slate-200">{formatDate(s.completed ? s.completed_at : s.started_at)}</p>
                  </div>
                </div>

                {!s.completed && (
                  <p className="mt-3 text-xs text-slate-500 flex items-center gap-1.5">
                    <XCircle size={13} className="text-slate-500" />
                    This session is not completed yet, so score details are not final.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
