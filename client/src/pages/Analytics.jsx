import { useEffect, useMemo, useState } from 'react'
import { Users, Activity, Trophy, ClipboardList, Clock3 } from 'lucide-react'
import Navbar from '../components/Navbar'
import { getAdminAnalytics } from '../lib/api'

function StatCard({ icon: Icon, label, value, hint, color }) {
  return (
    <div className="bg-dark-800 rounded-xl border border-slate-700 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-slate-400 text-sm">{label}</p>
          <p className="text-white text-2xl font-bold mt-1">{value}</p>
          {hint ? <p className="text-slate-500 text-xs mt-1">{hint}</p> : null}
        </div>
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
    </div>
  )
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

export default function Analytics() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [analytics, setAnalytics] = useState(null)

  useEffect(() => {
    getAdminAnalytics()
      .then(({ data }) => {
        setAnalytics(data)
        setError('')
      })
      .catch((err) => {
        setError(err?.response?.data?.error || 'Could not load analytics.')
        setAnalytics(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const completionText = useMemo(() => {
    const pct = analytics?.overview?.completionRate ?? 0
    return `${pct}% sessions completed`
  }, [analytics?.overview?.completionRate])

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-white">Admin Analytics</h1>
          <p className="text-slate-400 mt-1">Monitor usage, performance, and user activity across the platform.</p>
        </div>

        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="bg-dark-800 rounded-xl border border-slate-700 p-5 h-28" />
              ))}
            </div>
            <div className="grid lg:grid-cols-3 gap-4">
              <div className="bg-dark-800 rounded-xl border border-slate-700 h-72" />
              <div className="bg-dark-800 rounded-xl border border-slate-700 h-72" />
              <div className="bg-dark-800 rounded-xl border border-slate-700 h-72" />
            </div>
          </div>
        ) : error ? (
          <div className="bg-rose-950/20 border border-rose-800/60 rounded-xl p-4 text-rose-200 text-sm">
            {error}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
              <StatCard
                icon={Users}
                label="Total Users"
                value={analytics?.overview?.totalUsers ?? 0}
                hint={`${analytics?.overview?.activeUsersLast30Days ?? 0} active in last 30 days`}
                color="bg-primary-600"
              />
              <StatCard
                icon={Activity}
                label="Total Sessions"
                value={analytics?.overview?.totalSessions ?? 0}
                hint={completionText}
                color="bg-emerald-600"
              />
              <StatCard
                icon={Trophy}
                label="Average Score"
                value={`${analytics?.overview?.avgScore ?? 0}%`}
                hint={`${analytics?.overview?.totalCorrectAnswers ?? 0} correct answers`}
                color="bg-purple-600"
              />
              <StatCard
                icon={ClipboardList}
                label="Questions Answered"
                value={analytics?.overview?.totalQuestions ?? 0}
                hint={`${analytics?.overview?.activeUsersLast7Days ?? 0} active in last 7 days`}
                color="bg-amber-500"
              />
            </div>

            <div className="grid lg:grid-cols-2 gap-4 mb-4">
              <section className="bg-dark-800 rounded-xl border border-slate-700 p-4">
                <h2 className="text-white font-semibold mb-3">Top Users</h2>
                <div className="space-y-2 max-h-80 overflow-auto pr-1">
                  {(analytics?.topUsers || []).map((user) => (
                    <div key={user.userId} className="bg-dark-900 rounded-lg border border-slate-700 px-3 py-2">
                      <p className="text-slate-100 text-sm font-medium">{user.fullName || user.userId}</p>
                      <p className="text-slate-400 text-xs mt-1">
                        {user.sessions} sessions · {user.totalQuestions} questions · {user.avgScore}% avg
                      </p>
                    </div>
                  ))}
                  {(analytics?.topUsers || []).length === 0 && (
                    <p className="text-slate-500 text-sm">No user session data yet.</p>
                  )}
                </div>
              </section>

              <section className="bg-dark-800 rounded-xl border border-slate-700 p-4">
                <h2 className="text-white font-semibold mb-3">All Users</h2>
                <div className="space-y-2 max-h-80 overflow-auto pr-1">
                  {(analytics?.allUsers || []).map((user) => (
                    <div key={user.userId} className="bg-dark-900 rounded-lg border border-slate-700 px-3 py-2">
                      <p className="text-slate-100 text-sm font-medium">{user.fullName || user.userId}</p>
                      <p className="text-slate-400 text-xs mt-1">
                        {user.sessions} sessions · {user.totalQuestions} questions · {user.avgScore}% avg
                      </p>
                    </div>
                  ))}
                  {(analytics?.allUsers || []).length === 0 && (
                    <p className="text-slate-500 text-sm">No user session data yet.</p>
                  )}
                </div>
              </section>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <section className="bg-dark-800 rounded-xl border border-slate-700 p-4">
                <h2 className="text-white font-semibold mb-3">Top Topics</h2>
                <div className="space-y-2 max-h-96 overflow-auto pr-1">
                  {(analytics?.topTopics || []).map((topic) => (
                    <div key={topic.topic} className="bg-dark-900 rounded-lg border border-slate-700 px-3 py-2">
                      <p className="text-slate-100 text-sm font-medium">{topic.topic}</p>
                      <p className="text-slate-400 text-xs mt-1">
                        {topic.sessions} sessions · {topic.totalQuestions} questions · {topic.avgScore}% avg
                      </p>
                    </div>
                  ))}
                  {(analytics?.topTopics || []).length === 0 && (
                    <p className="text-slate-500 text-sm">No topic data yet.</p>
                  )}
                </div>
              </section>

              <section className="bg-dark-800 rounded-xl border border-slate-700 p-4">
                <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Clock3 size={16} className="text-slate-400" />
                  Recent Sessions
                </h2>
                <div className="space-y-2 max-h-96 overflow-auto pr-1">
                  {(analytics?.recentSessions || []).map((session) => (
                    <div key={session.id} className="bg-dark-900 rounded-lg border border-slate-700 px-3 py-2">
                      <p className="text-slate-100 text-sm font-medium">{session.topic || 'Untitled Topic'}</p>
                      <p className="text-slate-400 text-xs mt-1">
                        {session.userName || session.userId || 'Unknown user'} · {session.difficulty || 'n/a'}
                      </p>
                      <p className="text-slate-500 text-xs mt-1">
                        {session.completed ? `${session.scorePercent ?? 0}%` : 'In progress'} · {formatDate(session.completedAt)}
                      </p>
                    </div>
                  ))}
                  {(analytics?.recentSessions || []).length === 0 && (
                    <p className="text-slate-500 text-sm">No sessions to show yet.</p>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
