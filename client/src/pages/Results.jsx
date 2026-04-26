import { useLocation, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { CheckCircle, XCircle, RotateCcw, LayoutDashboard, Trophy, Lightbulb } from 'lucide-react'

function ScoreBadge({ score }) {
  if (score >= 80) return <span className="text-emerald-400 font-bold text-5xl">{score}%</span>
  if (score >= 50) return <span className="text-amber-400 font-bold text-5xl">{score}%</span>
  return <span className="text-rose-400 font-bold text-5xl">{score}%</span>
}

function getMessage(score) {
  if (score === 100) return { emoji: '🏆', text: "Perfect score! Outstanding work!" }
  if (score >= 80)   return { emoji: '🎉', text: "Excellent! You've got a strong grasp of this topic." }
  if (score >= 60)   return { emoji: '👍', text: "Good job! A bit more practice and you'll master it." }
  if (score >= 40)   return { emoji: '💪', text: "Keep going! Review the feedback below and try again." }
  return               { emoji: '📚', text: "This topic needs more practice — you'll get there!" }
}

export default function Results() {
  const { state } = useLocation()
  const navigate = useNavigate()

  const { topic, difficulty, results = [], questions = [] } = state || {}

  const correct = results.filter((r) => r.is_correct).length
  const total   = questions.length
  const score   = total > 0 ? Math.round((correct / total) * 100) : 0
  const msg     = getMessage(score)

  // Only show feedback section if there's at least one wrong answer with feedback
  const wrongWithFeedback = results.filter((r) => !r.is_correct && r.feedback)

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-10 fade-in">

        {/* Score card */}
        <div className="bg-dark-800 rounded-2xl border border-slate-700 p-8 text-center mb-6">
          <div className="text-4xl mb-3">{msg.emoji}</div>
          <ScoreBadge score={score} />
          <p className="text-slate-400 text-sm mt-1">{correct} / {total} correct</p>
          <p className="text-slate-300 mt-3 font-medium">{msg.text}</p>
          <div className="flex items-center justify-center gap-4 mt-4 text-sm text-slate-400">
            <span className="bg-dark-900 px-3 py-1 rounded-full border border-slate-700">{topic}</span>
            <span className="bg-dark-900 px-3 py-1 rounded-full border border-slate-700 capitalize">{difficulty}</span>
          </div>
        </div>

        {/* All questions — simple correct/wrong list */}
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Trophy size={18} className="text-amber-400" /> Question Summary
        </h2>
        <div className="space-y-2 mb-6">
          {questions.map((q, i) => {
            const r = results[i]
            return (
              <div
                key={i}
                className={`bg-dark-800 rounded-xl border px-4 py-3 flex items-center gap-3 ${
                  r?.is_correct ? 'border-emerald-700/40' : 'border-rose-700/40'
                }`}
              >
                {r?.is_correct
                  ? <CheckCircle size={17} className="text-emerald-400 shrink-0" />
                  : <XCircle    size={17} className="text-rose-400 shrink-0" />
                }
                <p className="text-slate-300 text-sm line-clamp-1 flex-1">{q.question}</p>
                {r?.score !== undefined && r.score !== 100 && r.score !== 0 && (
                  <span className="text-xs text-slate-500 shrink-0">{r.score}/100</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Corrections — only for wrong answers */}
        {wrongWithFeedback.length > 0 && (
          <>
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Lightbulb size={18} className="text-primary-400" /> Corrections and Feedback
            </h2>
            <div className="space-y-3 mb-8">
              {wrongWithFeedback.map((r, i) => {
                const qIdx = results.findIndex((res) => res.questionId === r.questionId)
                const q = questions[qIdx]
                return (
                  <div key={i} className="bg-dark-800 rounded-xl border border-slate-700 p-4">
                    <p className="text-rose-300 text-sm font-medium mb-2 line-clamp-2">
                      {q?.question}
                    </p>
                    <p className="text-slate-300 text-sm leading-relaxed">{r.feedback}</p>
                    {r.hint && (
                      <div className="mt-3 bg-amber-900/20 rounded-lg px-3 py-2 border border-amber-700/30">
                        <p className="text-amber-300 text-xs">
                          <span className="font-semibold">Hint: </span>{r.hint}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* If all correct — no feedback section, just congratulate */}
        {wrongWithFeedback.length === 0 && score === 100 && (
          <div className="bg-emerald-900/20 rounded-xl border border-emerald-700/40 p-5 text-center mb-8">
            <p className="text-emerald-300 font-medium">No mistakes — nothing to review! 🎯</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate('/topics')}
            className="flex-1 flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl transition"
          >
            <RotateCcw size={18} />
            Practice Again
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex-1 flex items-center justify-center gap-2 bg-dark-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold py-3 rounded-xl transition"
          >
            <LayoutDashboard size={18} />
            Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
