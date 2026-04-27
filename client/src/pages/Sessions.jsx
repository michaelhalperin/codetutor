import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, PlayCircle, Trash2, XCircle } from 'lucide-react'
import Navbar from '../components/Navbar'
import toast from 'react-hot-toast'
import { deleteSession, getSessions } from '../lib/api'

function ScoreBadge({ score }) {
  if (score == null) return <span className="text-slate-400 text-sm">-</span>
  if (score >= 80) return <span className="text-emerald-400 font-semibold">{score}%</span>
  if (score >= 50) return <span className="text-amber-400 font-semibold">{score}%</span>
  return <span className="text-rose-400 font-semibold">{score}%</span>
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

  useEffect(() => {
    getSessions()
      .then(({ data }) => {
        setSessions(data.sessions || [])
        setIsAdmin(Boolean(data.isAdmin))
      })
      .catch(() => setSessions([]))
      .finally(() => setLoading(false))
  }, [])

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
    () => sessions.filter((s) => s.completed).length,
    [sessions]
  )

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">All Sessions</h1>
            <p className="text-slate-400 mt-1">
              {sessions.length} total · {completedCount} completed
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 bg-dark-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-medium px-4 py-2 rounded-xl transition"
          >
            <ArrowLeft size={16} />
            Dashboard
          </button>
        </div>

        {loading ? (
          <div className="space-y-3 animate-pulse">
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
        ) : sessions.length === 0 ? (
          <div className="bg-dark-800 rounded-xl border border-slate-700 p-8 text-center">
            <p className="text-slate-300 font-medium">No sessions yet.</p>
            <p className="text-slate-500 text-sm mt-1">Start practicing to build your history.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
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
                      Completed At
                    </p>
                    <p className="text-slate-200">{formatDate(s.completed_at)}</p>
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
