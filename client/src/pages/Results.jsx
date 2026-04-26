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
  const incorrect = Math.max(0, total - correct)

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-10 fade-in">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Session Results</h1>
          <p className="text-slate-400 text-sm mt-1">Review your performance and improve from detailed feedback.</p>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="bg-dark-800 px-3 py-1 rounded-full border border-slate-700 text-sm text-slate-300">
              {topic || 'General'}
            </span>
            <span className="bg-dark-800 px-3 py-1 rounded-full border border-slate-700 text-sm text-slate-300 capitalize">
              {difficulty || 'mixed'}
            </span>
          </div>
        </div>

        {/* Score card */}
        <div className="bg-dark-800 rounded-2xl border border-slate-700 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="text-3xl mb-2">{msg.emoji}</div>
              <ScoreBadge score={score} />
              <p className="text-slate-400 text-sm mt-1">{correct} / {total} correct</p>
              <p className="text-slate-300 mt-3 font-medium">{msg.text}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 md:min-w-[280px]">
              <div className="bg-dark-900 rounded-xl border border-slate-700 p-3 text-center">
                <p className="text-emerald-400 text-xl font-bold">{correct}</p>
                <p className="text-xs text-slate-400">Correct</p>
              </div>
              <div className="bg-dark-900 rounded-xl border border-slate-700 p-3 text-center">
                <p className="text-rose-400 text-xl font-bold">{incorrect}</p>
                <p className="text-xs text-slate-400">Incorrect</p>
              </div>
              <div className="bg-dark-900 rounded-xl border border-slate-700 p-3 text-center">
                <p className="text-primary-300 text-xl font-bold">{score}%</p>
                <p className="text-xs text-slate-400">Accuracy</p>
              </div>
            </div>
          </div>
        </div>

        {/* Question summary */}
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Trophy size={18} className="text-amber-400" />
          Question Summary
        </h2>
        <div className="space-y-3 mb-8">
          {questions.map((q, i) => {
            const r = results[i]
            return (
              <div
                key={i}
                className={`bg-dark-800 rounded-xl border p-4 ${
                  r?.is_correct ? 'border-emerald-700/40' : 'border-rose-700/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {r?.is_correct
                      ? <CheckCircle size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                      : <XCircle size={18} className="text-rose-400 shrink-0 mt-0.5" />
                    }
                    <p className="text-slate-200 text-sm leading-relaxed break-words">{q.question}</p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full border shrink-0 ${
                      r?.is_correct
                        ? 'text-emerald-300 border-emerald-700/50 bg-emerald-900/20'
                        : 'text-rose-300 border-rose-700/50 bg-rose-900/20'
                    }`}
                  >
                    {r?.is_correct ? 'Correct' : 'Incorrect'}
                  </span>
                </div>
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
                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {r.feedback}
                    </p>
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
        <div className="flex flex-col sm:flex-row gap-3 pb-2">
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
