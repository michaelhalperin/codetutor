import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getDashboard } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import {
  BookOpen, Zap, Target, Flame, TrendingUp, Clock,
  ChevronRight, BarChart2
} from 'lucide-react'

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-dark-800 rounded-xl border border-slate-700 p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center shrink-0`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-slate-400 text-sm">{label}</p>
      </div>
    </div>
  )
}

function ScoreBadge({ score }) {
  const color = score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-rose-400'
  return <span className={`font-bold ${color}`}>{Math.round(score)}%</span>
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [topicsPage, setTopicsPage] = useState(1)

  useEffect(() => {
    getDashboard()
      .then(({ data }) => setData(data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setTopicsPage(1)
  }, [data?.topicStats?.length])

  const name = user?.user_metadata?.full_name?.split(' ')[0] || 'there'

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 py-8 animate-pulse">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="h-7 w-56 bg-slate-700/60 rounded" />
              <div className="h-4 w-40 bg-slate-700/50 rounded" />
            </div>
            <div className="h-11 w-44 bg-slate-700/60 rounded-xl" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="bg-dark-800 rounded-xl border border-slate-700 p-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-slate-700/60 shrink-0" />
                <div className="space-y-2">
                  <div className="h-6 w-16 bg-slate-700/60 rounded" />
                  <div className="h-3 w-20 bg-slate-700/50 rounded" />
                </div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div>
              <div className="h-6 w-40 bg-slate-700/60 rounded mb-3" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="bg-dark-800 rounded-xl border border-slate-700 px-4 py-3 flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-4 w-44 bg-slate-700/60 rounded" />
                      <div className="h-3 w-28 bg-slate-700/50 rounded" />
                    </div>
                    <div className="h-5 w-10 bg-slate-700/60 rounded" />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="h-6 w-36 bg-slate-700/60 rounded mb-3" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="bg-dark-800 rounded-xl border border-slate-700 px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-4 w-36 bg-slate-700/60 rounded" />
                      <div className="h-4 w-10 bg-slate-700/60 rounded" />
                    </div>
                    <div className="h-1.5 bg-slate-700/50 rounded-full" />
                    <div className="h-3 w-40 bg-slate-700/50 rounded mt-2" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const { overview = {}, recentSessions = [], topicStats = [] } = data || {}
  const topicsPerPage = 4
  const totalTopicsPages = Math.max(1, Math.ceil(topicStats.length / topicsPerPage))
  const paginatedTopics = topicStats.slice(
    (topicsPage - 1) * topicsPerPage,
    topicsPage * topicsPerPage
  )

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Greeting */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Hey, {name} 👋</h1>
            <p className="text-slate-400 mt-1">Ready to practice today?</p>
          </div>
          <button
            onClick={() => navigate('/topics')}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-5 py-2.5 rounded-xl transition w-fit"
          >
            <BookOpen size={18} />
            Start Practicing
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <StatCard icon={Zap}      label="Sessions"       value={overview.totalSessions || 0} color="bg-primary-600" />
          <StatCard icon={Target}   label="Questions Done" value={overview.totalQuestions || 0} color="bg-purple-600" />
          <StatCard icon={TrendingUp} label="Avg Score"    value={`${overview.avgScore || 0}%`} color="bg-emerald-600" />
          <StatCard icon={Flame}    label="Day Streak"     value={overview.streak || 0}          color="bg-amber-500" />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Sessions */}
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Clock size={17} className="text-slate-400" /> Recent Sessions
              </h2>
              {recentSessions.length > 0 && (
                <button
                  onClick={() => navigate('/sessions')}
                  className="text-primary-400 hover:text-primary-300 text-sm font-medium"
                >
                  View all
                </button>
              )}
            </div>
            {recentSessions.length === 0 ? (
              <div className="bg-dark-800 rounded-xl border border-slate-700 p-8 text-center">
                <p className="text-slate-400 mb-3">No sessions yet.</p>
                <button onClick={() => navigate('/topics')} className="text-primary-400 hover:text-primary-300 text-sm font-medium">
                  Start your first session →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentSessions.slice(0, 6).map((s) => (
                  <div key={s.id} className="bg-dark-800 rounded-xl border border-slate-700 px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-medium">{s.topic}</p>
                      <p className="text-slate-500 text-xs capitalize">{s.difficulty} · {s.total_questions} questions</p>
                    </div>
                    <ScoreBadge score={s.score_percent} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Topic Performance */}
          <div className="flex flex-col h-full">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <BarChart2 size={17} className="text-slate-400" /> Topics Practiced
            </h2>
            {topicStats.length === 0 ? (
              <div className="bg-dark-800 rounded-xl border border-slate-700 p-8 text-center">
                <p className="text-slate-400">No topic data yet.</p>
              </div>
            ) : (
              <div className="flex flex-col flex-1">
                <div className="space-y-2">
                  {paginatedTopics.map((t) => (
                    <div key={t.id} className="bg-dark-800 rounded-xl border border-slate-700 px-4 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-white text-sm font-medium">{t.topic}</p>
                        <ScoreBadge score={t.avg_score} />
                      </div>
                      {/* Progress bar */}
                      <div className="h-1.5 bg-dark-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-600 rounded-full transition-all"
                          style={{ width: `${Math.round(t.avg_score)}%` }}
                        />
                      </div>
                      <p className="text-slate-500 text-xs mt-1">{t.sessions_count} session{t.sessions_count !== 1 ? 's' : ''} · {t.total_questions} questions</p>
                    </div>
                  ))}
                </div>
                {totalTopicsPages > 1 && (
                  <div className="mt-auto pt-3 flex items-center justify-between">
                    <button
                      onClick={() => setTopicsPage((p) => Math.max(1, p - 1))}
                      disabled={topicsPage === 1}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 text-slate-300 hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <p className="text-xs text-slate-400">
                      Page {topicsPage} of {totalTopicsPages}
                    </p>
                    <button
                      onClick={() => setTopicsPage((p) => Math.min(totalTopicsPages, p + 1))}
                      disabled={topicsPage === totalTopicsPages}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 text-slate-300 hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
