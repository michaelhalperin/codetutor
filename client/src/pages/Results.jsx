import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { CheckCircle, XCircle, RotateCcw, LayoutDashboard, Trophy, Lightbulb, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getSessionResults } from '../lib/api'

function ScoreBadge({ score }) {
  if (score >= 80) return <span className="text-emerald-400 font-bold text-5xl">{score}%</span>
  if (score >= 50) return <span className="text-amber-400 font-bold text-5xl">{score}%</span>
  return <span className="text-rose-400 font-bold text-5xl">{score}%</span>
}

function getMessage(score) {
  if (score === 100) return "Perfect score! Outstanding work!"
  if (score >= 80)   return "Excellent! You've got a strong grasp of this topic."
  if (score >= 60)   return "Good job! A bit more practice and you'll master it."
  if (score >= 40)   return "Keep going! Review the feedback below and try again."
  return               "This topic needs more practice — you'll get there!"
}

function isGenericExpectedOnlyFeedback(feedback) {
  return /^not correct\.\s*expected:/i.test(String(feedback || '').trim())
}

export default function Results() {
  const { state } = useLocation()
  const navigate = useNavigate()

  const [topic, setTopic] = useState(state?.topic || '')
  const [difficulty, setDifficulty] = useState(state?.difficulty || '')
  const [questions, setQuestions] = useState(state?.questions || [])
  const [results, setResults] = useState(state?.results || [])
  const [loading, setLoading] = useState(false)
  const sessionId = state?.sessionId

  const needsHistoryFetch = useMemo(
    () => Boolean(sessionId && (questions.length === 0 || results.length === 0)),
    [sessionId, questions.length, results.length]
  )

  useEffect(() => {
    if (!needsHistoryFetch) return

    let mounted = true
    setLoading(true)

    getSessionResults(sessionId)
      .then(({ data }) => {
        if (!mounted) return
        const fetchedSession = data?.session || {}
        const fetchedQuestions = (data?.questions || []).map((q) => ({
          id: q.id,
          question: q.question_text,
          type: q.question_type,
          options: q.options,
          correct_answer: q.correct_answer,
          code_language: q.code_language,
        }))
        const fetchedResults = (data?.questions || []).map((q) => ({
          questionId: q.id,
          userAnswer: q.user_answer || '',
          is_correct: Boolean(q.is_correct),
          feedback: q.ai_feedback || '',
          hint: null,
        }))

        setTopic((prev) => prev || fetchedSession.topic || '')
        setDifficulty((prev) => prev || fetchedSession.difficulty || '')
        setQuestions(fetchedQuestions)
        setResults(fetchedResults)
      })
      .catch((error) => {
        if (!mounted) return
        toast.error(error?.response?.data?.error || 'Failed to load session results.')
        navigate('/sessions')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [needsHistoryFetch, navigate, sessionId])

  const correct = results.filter((r) => r.is_correct).length
  const total   = questions.length
  const score   = total > 0 ? Math.round((correct / total) * 100) : 0
  const message = getMessage(score)

  // Only show feedback section if there's at least one wrong answer with feedback
  const wrongWithFeedback = results.filter((r) => !r.is_correct && r.feedback)
  const incorrect = Math.max(0, total - correct)

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
          <Loader2 size={36} className="text-primary-500 animate-spin" />
          <p className="text-slate-300 text-lg">Loading session results...</p>
          <p className="text-slate-500 text-sm">Fetching your completed answers and feedback</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-10 fade-in">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Session Results</h1>
          <p className="text-slate-400 text-sm mt-1">Review your performance and improve from detailed feedback.</p>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <button
              onClick={() => navigate('/topics')}
              className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm px-3 py-1 rounded-full transition"
            >
              <RotateCcw size={15} />
              Practice Again
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 bg-dark-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold text-sm px-3 py-1 rounded-full transition"
            >
              <LayoutDashboard size={15} />
              Dashboard
            </button>
          </div>
        </div>

        {/* Score card */}
        <div className="bg-dark-800 rounded-2xl border border-slate-700 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <ScoreBadge score={score} />
              <p className="text-slate-400 text-sm mt-1">{correct} / {total} correct</p>
              <p className="text-slate-300 mt-3 font-medium">{message}</p>
            </div>
            <div className="md:min-w-[280px]">
              <div className="grid grid-cols-3 gap-2">
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
              <div className="flex flex-wrap items-center justify-end gap-2 mt-3">
                <span className="bg-dark-900 px-3 py-1 rounded-full border border-slate-700 text-sm text-slate-300">
                  {topic || 'General'}
                </span>
                <span className="bg-dark-900 px-3 py-1 rounded-full border border-slate-700 text-sm text-slate-300 capitalize">
                  {difficulty || 'mixed'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Trophy size={18} className="text-amber-400" />
              Question Summary
            </h2>
            <div className="space-y-3">
              {questions.map((q, i) => {
                const r = results[i]
                const userAnswer = String(r?.userAnswer || '').trim()
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
                        <div className="min-w-0">
                          <p className="text-slate-200 text-sm leading-relaxed break-words">{q.question}</p>
                          <p className="text-slate-500 text-xs mt-2">Your answer</p>
                          <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap break-words">
                            {userAnswer || 'No answer submitted.'}
                          </p>
                        </div>
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
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Lightbulb size={18} className="text-primary-400" /> Corrections and Feedback
            </h2>
            {wrongWithFeedback.length > 0 ? (
              <div className="space-y-3">
                {wrongWithFeedback.map((r, i) => {
                  const qIdx = results.findIndex((res) => res.questionId === r.questionId)
                  const q = questions[qIdx]
                  const userAnswer = String(r?.userAnswer || '').trim()
                  const correctAnswer = String(q?.correct_answer || '').trim()
                  const feedbackText = String(r?.feedback || '').trim()
                  const showFeedbackBody = feedbackText && !isGenericExpectedOnlyFeedback(feedbackText)
                  return (
                    <div key={i} className="bg-dark-800 rounded-xl border border-slate-700 p-4">
                      <p className="text-rose-300 text-sm font-medium mb-2 line-clamp-2">
                        {q?.question}
                      </p>
                      <div className="mb-3 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-lg border border-slate-700 bg-dark-900 px-3 py-2">
                          <p className="text-xs text-slate-500 mb-1">Your answer</p>
                          <p className="text-sm text-slate-300 whitespace-pre-wrap break-words">
                            {userAnswer || 'No answer submitted.'}
                          </p>
                        </div>
                        <div className="rounded-lg border border-emerald-700/40 bg-emerald-900/10 px-3 py-2">
                          <p className="text-xs text-emerald-300/80 mb-1">Correct answer</p>
                          <p className="text-sm text-emerald-200 whitespace-pre-wrap break-words">
                            {correctAnswer || 'Not available.'}
                          </p>
                        </div>
                      </div>
                      {showFeedbackBody && (
                        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {feedbackText}
                        </p>
                      )}
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
            ) : (
              <div className="bg-emerald-900/20 rounded-xl border border-emerald-700/40 p-5 text-center">
                <p className="text-emerald-300 font-medium">No mistakes — nothing to review! 🎯</p>
              </div>
            )}
          </section>
        </div>

      </div>
    </div>
  )
}
