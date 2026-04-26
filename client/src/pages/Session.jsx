import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import Navbar from '../components/Navbar'
import { fetchQuestions, evaluateSession, completeSession } from '../lib/api'
import toast from 'react-hot-toast'
import {
  ChevronRight, Loader2,
  Code, FileText, ToggleLeft, List, PenLine, Lightbulb
} from 'lucide-react'

const TYPE_META = {
  multiple_choice: { label: 'Multiple Choice', Icon: List,       color: 'text-blue-400'   },
  true_false:      { label: 'True / False',    Icon: ToggleLeft, color: 'text-purple-400' },
  fill_blank:      { label: 'Fill in the Blank', Icon: PenLine,  color: 'text-amber-400'  },
  open_ended:      { label: 'Open Ended',      Icon: FileText,   color: 'text-emerald-400' },
  coding:          { label: 'Coding Exercise', Icon: Code,       color: 'text-rose-400'   },
}

export default function Session() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const { session, topic, difficulty, count } = state || {}

  const [questions, setQuestions]         = useState([])
  const [currentIdx, setCurrentIdx]       = useState(0)
  const [answersById, setAnswersById]     = useState({})       // { [questionId]: userAnswer }
  const [tipsOpenById, setTipsOpenById]   = useState({})       // { [questionId]: boolean }
  const [loadingQuestions, setLoadingQuestions] = useState(true)
  const [finishing, setFinishing]         = useState(false)
  const didLoadRef = useRef(false)

  useEffect(() => {
    if (didLoadRef.current) return
    didLoadRef.current = true
    if (!session) {
      navigate('/topics')
      return
    }
    loadQuestions()
  }, [])

  const loadQuestions = async () => {
    try {
      const { data } = await fetchQuestions(topic, difficulty, count, session.id)
      setQuestions(data.questions)
    } catch (err) {
      const message = err?.response?.data?.error || 'Failed to load questions. Please try again.'
      toast.error(message)
      navigate('/topics')
    } finally {
      setLoadingQuestions(false)
    }
  }

  const currentQ  = questions[currentIdx]
  const isLast    = currentIdx === questions.length - 1
  const answeredCount = questions.filter((q) => String(answersById[q.id] || '').trim()).length
  const progressPct = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0
  const currentAnswer = currentQ ? (answersById[currentQ.id] || '') : ''
  const isTipOpen = currentQ ? Boolean(tipsOpenById[currentQ.id]) : false

  const setCurrentAnswer = (value) => {
    if (!currentQ) return
    setAnswersById((prev) => ({ ...prev, [currentQ.id]: value }))
  }

  const toggleCurrentTip = () => {
    if (!currentQ) return
    setTipsOpenById((prev) => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }))
  }

  const handleNext = async () => {
    if (!currentQ) return
    if (!String(currentAnswer).trim()) {
      toast.error('Please provide an answer before continuing.')
      return
    }

    if (!isLast) {
      setCurrentIdx((i) => i + 1)
      return
    }

    // Last question — finish session
    setFinishing(true)
    try {
      const payloadAnswers = questions.map((q) => ({
        questionId: q.id,
        questionText: q.question,
        questionType: q.type,
        userAnswer: answersById[q.id] || '',
        correctAnswer: q.correct_answer,
        language: q.code_language,
      }))

      // 1. Evaluate submitted answers in one batch call
      const { data } = await evaluateSession(payloadAnswers)
      const evaluationResults = data.results // [{ questionId, is_correct, score, feedback, hint }]

      // Merge final server evaluation into collected answers
      const mergedResults = payloadAnswers.map((a) => {
        const result = evaluationResults.find((r) => r.questionId === a.questionId)
        if (result) {
          return {
            ...a,
            is_correct: result.is_correct,
            score:      result.score,
            feedback:   result.feedback,
            hint:       result.hint,
          }
        }
        return { ...a, is_correct: false, score: 0, feedback: null, hint: null }
      })

      // 2. Save session stats
      const correct = mergedResults.filter((r) => r.is_correct).length
      await completeSession(session.id, {
        totalQuestions: questions.length,
        correctAnswers: correct,
      })

      // 3. Navigate to results
      navigate('/results', {
        state: { topic, difficulty, results: mergedResults, questions, sessionId: session.id }
      })
    } catch (err) {
      toast.error('Failed to submit session. Please try again.')
      setFinishing(false)
    }
  }

  // ---- Loading state ----
  if (loadingQuestions) {
    return (
      <div className="min-h-screen bg-dark-950">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
          <Loader2 size={36} className="text-primary-500 animate-spin" />
          <p className="text-slate-300 text-lg">Loading your questions...</p>
          <p className="text-slate-500 text-sm">
            Preparing {count} questions on <strong className="text-white">{topic}</strong>
          </p>
        </div>
      </div>
    )
  }

  // ---- Finishing / evaluating ----
  if (finishing) {
    return (
      <div className="min-h-screen bg-dark-950">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
          <Loader2 size={36} className="text-primary-500 animate-spin" />
          <p className="text-slate-300 text-lg">Checking your answers...</p>
          <p className="text-slate-500 text-sm">Final score is being calculated</p>
        </div>
      </div>
    )
  }

  if (!currentQ) return null

  const meta   = TYPE_META[currentQ.type] || TYPE_META.open_ended
  const TypeIcon = meta.Icon

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />

      {/* Progress bar */}
      <div className="h-1 bg-dark-800">
        <div
          className="h-full bg-primary-600 transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TypeIcon size={18} className={meta.color} />
            <span className={`text-sm font-medium ${meta.color}`}>{meta.label}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <span className="font-mono font-semibold text-primary-300">{answeredCount}</span>
            <span>answered</span>
            <span>•</span>
            <span className="font-mono font-semibold text-white">{currentIdx + 1}</span>
            <span>/</span>
            <span>{questions.length}</span>
          </div>
        </div>

        {/* Question card */}
        <div className="bg-dark-800 rounded-2xl border border-slate-700 p-6 mb-4 fade-in" key={currentIdx}>
          <p className="text-white text-lg font-medium leading-relaxed mb-6 whitespace-pre-wrap">
            {currentQ.question}
          </p>

          {currentQ.tip && (
            <div className="mb-6">
              <button
                onClick={toggleCurrentTip}
                className="w-full rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left hover:bg-amber-500/15 transition"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Lightbulb size={16} className="text-amber-300 shrink-0" />
                    <p className="text-xs uppercase tracking-wide text-amber-300 font-semibold">Tip</p>
                  </div>
                  <span className="text-xs text-amber-200/90 font-medium">
                    {isTipOpen ? 'Hide tip' : 'Show tip'}
                  </span>
                </div>
                {isTipOpen && (
                  <p className="mt-2 text-sm text-amber-100/90 whitespace-pre-wrap">{currentQ.tip}</p>
                )}
              </button>
            </div>
          )}

          {/* Answer inputs */}
          {currentQ.type === 'multiple_choice' && (
            <div className="space-y-2.5 mb-5">
              {currentQ.options?.map((opt) => {
                const letter = opt[0]
                const isSelected = currentAnswer === letter
                return (
                  <button
                    key={opt}
                    onClick={() => setCurrentAnswer(letter)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition text-sm font-medium
                      ${isSelected
                        ? 'bg-primary-600/30 border-primary-500 text-white'
                        : 'bg-dark-900 border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          )}

          {currentQ.type === 'true_false' && (
            <div className="flex gap-3 mb-5">
              {['true', 'false'].map((opt) => {
                const isSelected = currentAnswer === opt
                return (
                  <button
                    key={opt}
                    onClick={() => setCurrentAnswer(opt)}
                    className={`flex-1 py-3 rounded-xl border text-sm font-semibold capitalize transition
                      ${isSelected
                        ? 'bg-primary-600/30 border-primary-500 text-white'
                        : 'bg-dark-900 border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                  >
                    {opt === 'true' ? '✅ True' : '❌ False'}
                  </button>
                )
              })}
            </div>
          )}

          {currentQ.type === 'fill_blank' && (
            <div className="mb-5">
              <input
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                placeholder="Type your answer here..."
                className="w-full bg-dark-900 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none transition font-mono focus:border-primary-500"
              />
            </div>
          )}

          {currentQ.type === 'open_ended' && (
            <div className="mb-5">
              <textarea
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Write your explanation here..."
                rows={5}
                className="w-full bg-dark-900 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 transition resize-none"
              />
            </div>
          )}

          {currentQ.type === 'coding' && (
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <Code size={14} className="text-slate-400" />
                <span className="text-xs text-slate-400 uppercase font-semibold">
                  {currentQ.code_language || 'code'}
                </span>
              </div>
              <div className="monaco-container">
                <Editor
                  height="260px"
                  language={currentQ.code_language || 'python'}
                  value={currentAnswer}
                  onChange={(val) => setCurrentAnswer(val || '')}
                  theme="vs-dark"
                  options={{
                    fontSize: 14,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    lineNumbers: 'on',
                    padding: { top: 12 },
                    fontFamily: 'JetBrains Mono, Fira Code, monospace',
                    readOnly: false,
                  }}
                />
              </div>
            </div>
          )}

          {/* Next / Finish */}
          <button
            onClick={handleNext}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
          >
            {isLast
              ? '🏁 Finish & Get Feedback'
              : <>Next Question <ChevronRight size={18} /></>
            }
          </button>
        </div>

        {/* Mini progress dots */}
        {questions.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mt-2">
            {questions.map((q, i) => (
              <div
                key={i}
                title={`Q${i + 1}`}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${String(answersById[q.id] || '').trim()
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-600 text-slate-200'
                  }`}
              >
                {i + 1}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
