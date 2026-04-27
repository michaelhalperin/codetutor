import { useEffect, useMemo, useState } from 'react'
import { Users, Activity, Trophy, ClipboardList, Clock3 } from 'lucide-react'
import Navbar from '../components/Navbar'
import { getAdminAnalytics, getQuestionBank, updateQuestionBankItem } from '../lib/api'

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

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-'
  return `${value}%`
}

export default function Analytics() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [analytics, setAnalytics] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [questionBank, setQuestionBank] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [draftQuestionText, setDraftQuestionText] = useState('')

  useEffect(() => {
    Promise.all([getAdminAnalytics(), getQuestionBank()])
      .then(([analyticsResponse, questionBankResponse]) => {
        setAnalytics(analyticsResponse.data)
        setQuestionBank(questionBankResponse.data?.items || [])
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

  const closeUserModal = () => setSelectedUser(null)

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
                    <button
                      type="button"
                      key={user.userId}
                      onClick={() => setSelectedUser(user)}
                      className="w-full text-left bg-dark-900 rounded-lg border border-slate-700 px-3 py-2 transition hover:border-primary-500/60 hover:bg-dark-900/80 focus:outline-none focus:ring-2 focus:ring-primary-500/70"
                    >
                      <p className="text-slate-100 text-sm font-medium">{user.fullName || user.userId}</p>
                      <p className="text-slate-400 text-xs mt-1">
                        {user.sessions} sessions · {user.totalQuestions} questions · {user.avgScore}% avg
                      </p>
                    </button>
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
                    <button
                      type="button"
                      key={user.userId}
                      onClick={() => setSelectedUser(user)}
                      className="w-full text-left bg-dark-900 rounded-lg border border-slate-700 px-3 py-2 transition hover:border-primary-500/60 hover:bg-dark-900/80 focus:outline-none focus:ring-2 focus:ring-primary-500/70"
                    >
                      <p className="text-slate-100 text-sm font-medium">{user.fullName || user.userId}</p>
                      <p className="text-slate-400 text-xs mt-1">
                        {user.sessions} sessions · {user.totalQuestions} questions · {user.avgScore}% avg
                      </p>
                    </button>
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

            <div className="grid lg:grid-cols-3 gap-4 mt-4">
              <section className="bg-dark-800 rounded-xl border border-slate-700 p-4">
                <h2 className="text-white font-semibold mb-3">Cohort Retention</h2>
                <p className="text-slate-300 text-sm">Cohort size: {analytics?.cohort?.cohortSize ?? 0}</p>
                <p className="text-slate-400 text-sm mt-1">D1: {analytics?.cohort?.d1 ?? 0}%</p>
                <p className="text-slate-400 text-sm mt-1">D7: {analytics?.cohort?.d7 ?? 0}%</p>
              </section>
              <section className="bg-dark-800 rounded-xl border border-slate-700 p-4">
                <h2 className="text-white font-semibold mb-3">Completion Funnel</h2>
                <p className="text-slate-300 text-sm">Sessions created: {analytics?.completionFunnel?.sessionsCreated ?? 0}</p>
                <p className="text-slate-400 text-sm mt-1">Questions generated: {analytics?.completionFunnel?.withQuestions ?? 0}</p>
                <p className="text-slate-400 text-sm mt-1">Completed: {analytics?.completionFunnel?.completed ?? 0}</p>
              </section>
              <section className="bg-dark-800 rounded-xl border border-slate-700 p-4">
                <h2 className="text-white font-semibold mb-3">Performance</h2>
                <p className="text-slate-300 text-sm">Avg latency: {analytics?.performance?.avgLatencyMs ?? 0}ms</p>
                <p className="text-slate-400 text-sm mt-1">Failure rate: {analytics?.performance?.failureRate ?? 0}%</p>
                <p className="text-slate-400 text-sm mt-1">Eval latency: {analytics?.performance?.avgEvalLatencyMs ?? 0}ms</p>
              </section>
            </div>

            <div className="grid lg:grid-cols-2 gap-4 mt-4">
              <section className="bg-dark-800 rounded-xl border border-slate-700 p-4">
                <h2 className="text-white font-semibold mb-3">Drop-off by Question Index</h2>
                <div className="space-y-2 max-h-72 overflow-auto pr-1">
                  {(analytics?.dropoffByQuestionIndex || []).map((row) => (
                    <div key={row.index} className="bg-dark-900 rounded-lg border border-slate-700 px-3 py-2">
                      <p className="text-slate-200 text-sm">Q{row.index}</p>
                      <p className="text-slate-400 text-xs mt-1">{row.answered}/{row.shown} answered · {row.dropoffRate}% drop-off</p>
                    </div>
                  ))}
                </div>
              </section>
              <section className="bg-dark-800 rounded-xl border border-slate-700 p-4">
                <h2 className="text-white font-semibold mb-3">Ambiguous Questions</h2>
                <div className="space-y-2 max-h-72 overflow-auto pr-1">
                  {(analytics?.questionAnalytics?.ambiguous || []).map((row, idx) => (
                    <div key={`${row.question}-${idx}`} className="bg-dark-900 rounded-lg border border-slate-700 px-3 py-2">
                      <p className="text-slate-200 text-xs line-clamp-2">{row.question}</p>
                      <p className="text-slate-400 text-xs mt-1">{row.correctRate}% correct · {row.attempts} attempts</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <section className="bg-dark-800 rounded-xl border border-slate-700 p-4 mt-4">
              <h2 className="text-white font-semibold mb-3">Question Bank Operations</h2>
              <div className="space-y-2 max-h-[30rem] overflow-auto pr-1">
                {questionBank.map((item) => (
                  <div key={item.id} className="bg-dark-900 rounded-lg border border-slate-700 p-3">
                    <p className="text-xs text-slate-500 mb-1">{item.topic} · {item.difficulty} · {item.question_type} · {item.source}</p>
                    {editingId === item.id ? (
                      <textarea
                        value={draftQuestionText}
                        onChange={(e) => setDraftQuestionText(e.target.value)}
                        rows={3}
                        className="w-full bg-dark-950 border border-slate-700 rounded p-2 text-sm text-slate-200"
                      />
                    ) : (
                      <p className="text-sm text-slate-100 whitespace-pre-wrap">{item.question_text}</p>
                    )}
                    <div className="mt-2 flex gap-2">
                      {editingId === item.id ? (
                        <button
                          type="button"
                          onClick={async () => {
                            await updateQuestionBankItem(item.id, { patch: { question_text: draftQuestionText } })
                            setQuestionBank((prev) => prev.map((row) => (row.id === item.id ? { ...row, question_text: draftQuestionText } : row)))
                            setEditingId(null)
                            setDraftQuestionText('')
                          }}
                          className="px-2.5 py-1 text-xs rounded bg-primary-600 text-white"
                        >
                          Save
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(item.id)
                            setDraftQuestionText(item.question_text || '')
                          }}
                          className="px-2.5 py-1 text-xs rounded border border-slate-600 text-slate-200"
                        >
                          Edit
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={async () => {
                          await updateQuestionBankItem(item.id, { action: 'approve' })
                          setQuestionBank((prev) => prev.map((row) => (row.id === item.id ? { ...row, source: 'approved' } : row)))
                        }}
                        className="px-2.5 py-1 text-xs rounded border border-emerald-700 text-emerald-300"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await updateQuestionBankItem(item.id, { action: 'archive' })
                          setQuestionBank((prev) => prev.map((row) => (row.id === item.id ? { ...row, source: 'archived' } : row)))
                        }}
                        className="px-2.5 py-1 text-xs rounded border border-rose-700 text-rose-300"
                      >
                        Archive
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
      {selectedUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close user profile modal"
            className="absolute inset-0 bg-black/70"
            onClick={closeUserModal}
          />
          <section className="relative w-full max-w-md bg-dark-800 rounded-xl border border-slate-700 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-white text-lg font-semibold">User Profile</h3>
                <p className="text-slate-400 text-xs mt-1">Admin analytics user details</p>
              </div>
              <button
                type="button"
                onClick={closeUserModal}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <p className="text-slate-500 text-xs">Name</p>
                <p className="text-slate-100 text-sm font-medium">{selectedUser.fullName || '-'}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">User ID</p>
                <p className="text-slate-100 text-sm font-medium">{selectedUser.userId || '-'}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-dark-900 border border-slate-700 rounded-lg p-2">
                  <p className="text-slate-500 text-[11px]">Sessions</p>
                  <p className="text-slate-100 text-sm font-semibold">{selectedUser.sessions ?? 0}</p>
                </div>
                <div className="bg-dark-900 border border-slate-700 rounded-lg p-2">
                  <p className="text-slate-500 text-[11px]">Questions</p>
                  <p className="text-slate-100 text-sm font-semibold">{selectedUser.totalQuestions ?? 0}</p>
                </div>
                <div className="bg-dark-900 border border-slate-700 rounded-lg p-2">
                  <p className="text-slate-500 text-[11px]">Avg Score</p>
                  <p className="text-slate-100 text-sm font-semibold">{selectedUser.avgScore ?? 0}%</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-dark-900 border border-slate-700 rounded-lg p-2">
                  <p className="text-slate-500 text-[11px]">Completed</p>
                  <p className="text-slate-100 text-sm font-semibold">{selectedUser.completed ?? 0}</p>
                </div>
                <div className="bg-dark-900 border border-slate-700 rounded-lg p-2">
                  <p className="text-slate-500 text-[11px]">Completion</p>
                  <p className="text-slate-100 text-sm font-semibold">{formatPercent(selectedUser.completionRate)}</p>
                </div>
                <div className="bg-dark-900 border border-slate-700 rounded-lg p-2">
                  <p className="text-slate-500 text-[11px]">Accuracy</p>
                  <p className="text-slate-100 text-sm font-semibold">{formatPercent(selectedUser.accuracy)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-dark-900 border border-slate-700 rounded-lg p-2">
                  <p className="text-slate-500 text-[11px]">Correct Answers</p>
                  <p className="text-slate-100 text-sm font-semibold">{selectedUser.totalCorrectAnswers ?? 0}</p>
                </div>
                <div className="bg-dark-900 border border-slate-700 rounded-lg p-2">
                  <p className="text-slate-500 text-[11px]">Avg Questions / Session</p>
                  <p className="text-slate-100 text-sm font-semibold">{selectedUser.avgQuestionsPerSession ?? 0}</p>
                </div>
              </div>
              {'role' in selectedUser && (
                <div>
                  <p className="text-slate-500 text-xs">Role</p>
                  <p className="text-slate-100 text-sm font-medium">{selectedUser.role || '-'}</p>
                </div>
              )}
              {'email' in selectedUser && (
                <div>
                  <p className="text-slate-500 text-xs">Email</p>
                  <p className="text-slate-100 text-sm font-medium break-all">{selectedUser.email || '-'}</p>
                </div>
              )}
              <div>
                <p className="text-slate-500 text-xs">First Activity</p>
                <p className="text-slate-100 text-sm font-medium">{formatDate(selectedUser.firstActivityAt)}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Last Activity</p>
                <p className="text-slate-100 text-sm font-medium">{formatDate(selectedUser.lastActivityAt)}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Account Created</p>
                <p className="text-slate-100 text-sm font-medium">{formatDate(selectedUser.accountCreatedAt)}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Last Sign In</p>
                <p className="text-slate-100 text-sm font-medium">{formatDate(selectedUser.lastSignInAt)}</p>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
