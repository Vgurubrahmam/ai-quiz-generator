/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Loader2, Clock, CheckCircle, AlertCircle } from "lucide-react"

export default function GenerateQuizTab() {
  // Generation state
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Quiz state
  const [quiz, setQuiz] = useState(null)
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({})
  const [marked, setMarked] = useState(new Set())
  const [submitted, setSubmitted] = useState(false)
  const [practiceMode, setPracticeMode] = useState(true)
  const [timeLeft, setTimeLeft] = useState(15 * 60)
  const [showScorecard, setShowScorecard] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const timerRef = useRef(null)

  // Generate quiz from URL
  const handleGenerateQuiz = async (e) => {
    e.preventDefault()
    if (!url.trim()) {
      alert("Please enter a valid URL")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("https://aiquizmaker-backend.onrender.com/generate_quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.detail || response.statusText)
      } else {

        const parsed = parseQuizData(data.quiz)

        if (parsed) {
          setQuiz(parsed)
          setCurrent(0)
          setAnswers({})
          setMarked(new Set())
          setSubmitted(false)
          setShowScorecard(false)
          setTimeLeft(15 * 60)
        } else {
          // More specific error message
          const rawData = data.quiz
          const hasMetadata = rawData?.metadata
          const totalQuestions = Array.isArray(rawData?.questions) ? rawData.questions.length : 0

          let errorMsg = 'Failed to parse quiz data. '
          if (hasMetadata && totalQuestions > 0) {
            errorMsg += `The backend returned ${totalQuestions} questions, but they contain errors (missing options, correct answer, or explanation). The LLM generated incomplete data. Please try again.`
          } else if (hasMetadata && totalQuestions === 0) {
            errorMsg += 'The backend returned metadata but no questions. The LLM may have failed to generate questions. Try again or use a different URL.'
          } else if (!hasMetadata && totalQuestions > 0) {
            errorMsg += 'The backend returned questions but no metadata.'
          } else {
            errorMsg += `Unexpected format. Check console for details.`
          }

          setError(errorMsg)
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Helper function to generate quiz from a direct URL (for related topics)
  const generateQuizFromUrl = async (newUrl) => {
    if (!newUrl.trim()) {
      alert("Invalid URL")
      return
    }

    // Reset quiz state and set new URL
    setQuiz(null)
    setUrl(newUrl)
    setCurrent(0)
    setAnswers({})
    setMarked(new Set())
    setSubmitted(false)
    setShowScorecard(false)
    setTimeLeft(15 * 60)
    setError(null)
    setLoading(true)

    try {
      const response = await fetch("https://aiquizmaker-backend.onrender.com/generate_quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newUrl }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.detail || response.statusText)
      } else {

        const parsed = parseQuizData(data.quiz)

        if (parsed) {
          setQuiz(parsed)
          setCurrent(0)
          setAnswers({})
          setMarked(new Set())
          setSubmitted(false)
          setShowScorecard(false)
          setTimeLeft(15 * 60)
        } else {
          const rawData = data.quiz
          const hasMetadata = rawData?.metadata
          const totalQuestions = Array.isArray(rawData?.questions) ? rawData.questions.length : 0

          let errorMsg = 'Failed to parse quiz data. '
          if (hasMetadata && totalQuestions > 0) {
            errorMsg += `The backend returned ${totalQuestions} questions, but they contain errors (missing options, correct answer, or explanation). The LLM generated incomplete data. Please try again.`
          } else if (hasMetadata && totalQuestions === 0) {
            errorMsg += 'The backend returned metadata but no questions. The LLM may have failed to generate questions. Try again or use a different URL.'
          } else if (!hasMetadata && totalQuestions > 0) {
            errorMsg += 'The backend returned questions but no metadata.'
          } else {
            errorMsg += `Unexpected format. Check console for details.`
          }

          setError(errorMsg)
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Parse quiz data (handles wrapped JSON)
  const parseQuizData = (data) => {

    if (!data) {
      return null
    }

    const tryParse = (text) => {
      if (!text || typeof text !== 'string') return null
      // Strip code fences like ```json ... ```
      const codeFenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
      const candidate = codeFenceMatch ? codeFenceMatch[1] : text
      try {
        const parsed = JSON.parse(candidate)
        return parsed
      } catch (e) {
        const first = candidate.indexOf('{')
        const last = candidate.lastIndexOf('}')
        if (first !== -1 && last !== -1 && last > first) {
          try {
            const parsed = JSON.parse(candidate.slice(first, last + 1))
            return parsed
          } catch (e2) {
            return null
          }
        }
        return null
      }
    }

    // Helper to validate and clean questions
    const validateAndCleanQuestions = (questions) => {
      if (!Array.isArray(questions)) return []

      return questions.filter((q, idx) => {
        // Check if question has all required fields
        const hasQuestion = q.question && typeof q.question === 'string' && q.question.trim()
        const hasOptions = Array.isArray(q.options) && q.options.length === 4
        const hasCorrectLabel = q.correct_label && typeof q.correct_label === 'string'
        const hasExplanation = q.explination || q.explanation // handle typo

        // Validate all options have label and text
        const validOptions = hasOptions && q.options.every(opt =>
          opt.label && opt.text && opt.text.trim()
        )

        if (!hasQuestion || !validOptions || !hasCorrectLabel) {
          console.warn(`Skipping invalid question ${idx + 1}:`, {
            hasQuestion,
            hasOptions,
            validOptions,
            hasCorrectLabel,
            hasExplanation
          })
          return false
        }

        return true
      })
    }

    // If data has a 'content' property that's a string, try parsing it FIRST
    if (data.content && typeof data.content === 'string') {
      const parsed = tryParse(data.content)
      if (parsed) {
        // Validate and clean questions
        const validQuestions = validateAndCleanQuestions(parsed.questions || [])

        if (parsed.metadata && validQuestions.length > 0) {
          return {
            ...parsed,
            questions: validQuestions
          }
        } else {
          console.error(' Parsed content but invalid structure:', {
            hasMetadata: !!parsed.metadata,
            totalQuestions: parsed.questions?.length || 0,
            validQuestions: validQuestions.length
          })
        }
      }
    }

    // If data itself is a string, try parsing it
    if (typeof data === 'string') {
      const parsed = tryParse(data)
      if (parsed) {
        const validQuestions = validateAndCleanQuestions(parsed.questions || [])

        if (parsed.metadata && validQuestions.length > 0) {
          return {
            ...parsed,
            questions: validQuestions
          }
        } else {
          console.error('Parsed string but invalid structure')
        }
      }
    }

    // If data already has the expected structure, validate and clean it
    if (data.metadata && data.questions) {
      const validQuestions = validateAndCleanQuestions(data.questions)
      if (validQuestions.length > 0) {
        return {
          ...data,
          questions: validQuestions
        }
      }
    }

    // Check if it has questions but no metadata
    if (data.questions && Array.isArray(data.questions)) {
      const validQuestions = validateAndCleanQuestions(data.questions)
      if (validQuestions.length > 0) {
        return {
          metadata: data.metadata || {},
          questions: validQuestions
        }
      }
    }

    // If we get here, the structure is invalid
    console.error('Invalid quiz data structure')
    console.error('Keys present:', Object.keys(data))
    console.error('Validation:', {
      hasMetadata: !!data.metadata,
      hasQuestions: !!data.questions,
      isQuestionsArray: Array.isArray(data.questions),
      questionCount: Array.isArray(data.questions) ? data.questions.length : 0
    })
    console.error('Full data:', JSON.stringify(data, null, 2))
    return null
  }

  // Timer
  useEffect(() => {
    if (quiz && !submitted) {
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current)
            return 0
          }
          return t - 1
        })
      }, 1000)
      return () => clearInterval(timerRef.current)
    }
  }, [quiz, submitted])

  // Keyboard navigation
  useEffect(() => {
    if (!quiz) return
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT') return
      if (e.key === 'ArrowRight') nextQuestion()
      if (e.key === 'ArrowLeft') prevQuestion()
      if (['1', '2', '3', '4'].includes(e.key)) {
        const map = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' }
        handleSelect(map[e.key])
      }
      if (e.key.toLowerCase() === 'm') toggleMark()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const total = (quiz?.questions || []).length
  const answeredCount = Object.keys(answers).length
  const markedCount = marked.size

  const handleSelect = (label) => {
    setAnswers((s) => ({ ...s, [current]: label }))
  }

  const toggleMark = () => {
    setMarked((prev) => {
      const copy = new Set(prev)
      if (copy.has(current)) copy.delete(current)
      else copy.add(current)
      return copy
    })
  }

  const clearResponse = () => {
    setAnswers((s) => {
      const copy = { ...s }
      delete copy[current]
      return copy
    })
  }

  const nextQuestion = () => {
    setCurrent((c) => Math.min(total - 1, c + 1))
  }

  const prevQuestion = () => {
    setCurrent((c) => Math.max(0, c - 1))
  }

  const submitTest = () => {
    if (!confirm('Are you sure you want to submit the test?')) return
    setSubmitted(true)
    setShowScorecard(true)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0')
    const s = (sec % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  // Question Card Component
  const QuestionCard = ({ q, idx }) => {
    const selected = answers[idx]
    const showFeedback = submitted || (practiceMode && selected)
    const isCorrect = selected === q.correct_label

    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-lg font-bold">Q {idx + 1}</div>
            {q.difficulty && (
              <span className={`text-xs px-2 py-1 rounded ${q.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                q.difficulty === 'Med' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                {q.difficulty}
              </span>
            )}
            {q.tags?.map(t => (
              <span key={t} className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded">
                {t}
              </span>
            ))}
          </div>
          <div className="text-sm text-slate-500">
            {quiz?.metadata?.title || 'Quiz'}
          </div>
        </div>

        <div className="text-base mb-4 leading-relaxed">{q.question}</div>
        {q.image && (
          <img
            src={q.image}
            alt="Question figure"
            className="max-h-64 object-contain rounded mb-4 cursor-pointer hover:scale-105 transition"
            onClick={() => window.open(q.image)}
          />
        )}

        <div role="radiogroup" aria-labelledby={`question-${idx}`} className="space-y-2">
          {q.options.map((opt) => {
            const isSelected = selected === opt.label
            const isCorrectOption = opt.label === q.correct_label
            let classes = 'p-4 rounded-lg border-2 cursor-pointer flex items-start gap-3 transition'

            if (showFeedback && submitted) {
              if (isCorrectOption) {
                classes += ' border-green-500 bg-green-50'
              } else if (isSelected && !isCorrectOption) {
                classes += ' border-red-500 bg-red-50'
              } else {
                classes += ' border-gray-200'
              }
            } else {
              classes += isSelected
                ? ' border-violet-500 bg-violet-50'
                : ' border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }

            return (
              <div
                key={opt.label}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                onClick={() => !submitted && handleSelect(opt.label)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !submitted) handleSelect(opt.label)
                }}
                className={classes}
              >
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-semibold ${isSelected ? 'border-violet-500 bg-violet-500 text-white' : 'border-gray-300'
                  }`}>
                  {opt.label}
                </div>
                <div className="flex-1 text-sm">{opt.text}</div>
                {showFeedback && submitted && isCorrectOption && (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
                {showFeedback && submitted && isSelected && !isCorrectOption && (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-6">
          <Button onClick={prevQuestion} disabled={current === 0} variant="outline">
            Previous
          </Button>
          <Button onClick={nextQuestion} disabled={current === total - 1} variant="outline">
            Next
          </Button>
          <Button onClick={clearResponse} variant="ghost" disabled={submitted}>
            Clear Response
          </Button>
          <Button onClick={toggleMark} variant="outline" disabled={submitted}>
            {marked.has(current) ? 'Unmark' : 'Mark for Review'}
          </Button>
          <Button variant="link" onClick={() => alert('Report submitted')}>
            Report
          </Button>
          {practiceMode && !submitted && selected && (
            <Button onClick={() => setSubmitted(true)} className="ml-auto">
              Check Answer
            </Button>
          )}
        </div>

        {showFeedback && (
          <div className={`mt-6 p-4 rounded-lg ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
            <div className="font-semibold mb-2">
              {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
            </div>
            <div className="flex  justify-center text-center font-semibold mb-2 gap-1">
              <p>Correct Option :</p>
              {q.correct_label}
            </div>
            <div className="text-sm">
              <strong>Explanation:</strong>{q.explination}
            </div>
          </div>
        )}
      </Card>
    )
  }

  // Scorecard Component
  const Scorecard = () => {
    const correct = (quiz?.questions || []).reduce(
      (acc, q, idx) => acc + (answers[idx] === q.correct_label ? 1 : 0),
      0
    )
    const totalTime = 15 * 60 - timeLeft

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <Card className="w-full max-w-2xl p-6 bg-gray-300">
          <h2 className="text-2xl font-bold mb-4">Test Completed!</h2>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded">
              <div className="text-sm text-gray-600">Score</div>
              <div className="text-2xl font-bold">{correct} / {total}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <div className="text-sm text-gray-600">Accuracy</div>
              <div className="text-2xl font-bold">{Math.round((correct / total) * 100)}%</div>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <div className="text-sm text-gray-600">Time Spent</div>
              <div className="text-2xl font-bold">{formatTime(totalTime)}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <div className="text-sm text-gray-600">Unanswered</div>
              <div className="text-2xl font-bold">{total - answeredCount}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => { setShowScorecard(false); setCurrent(0) }}>
              Review All
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowScorecard(false)
                const firstIncorrect = quiz.questions.findIndex((q, i) => answers[i] !== q.correct_label)
                if (firstIncorrect !== -1) setCurrent(firstIncorrect)
              }}
            >
              Review Incorrect
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                if (confirm('Restart the quiz?')) {
                  setAnswers({})
                  setMarked(new Set())
                  setSubmitted(false)
                  setShowScorecard(false)
                  setCurrent(0)

                  setTimeLeft(15 * 60)
                }
              }}
            >
              Retake
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Generation Form
  if (!quiz) {
    return (
      <div className=" mx-auto p-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Generate Quiz</h1>
          <p className="text-slate-600 mb-6">Enter a URL to generate an interactive quiz</p>
        </div>

        <form onSubmit={handleGenerateQuiz} className=" mb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              type="url"
              placeholder="https://en.wikipedia.org/wiki/React_(software)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
              className="flex-1 border border-gray-200"
            />
            <Button type="submit" disabled={loading} className="bg-purple-600 text-white">
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2 " />}
              {loading ? "Generating..." : "Generate Quiz"}
            </Button>
          </div>

        </form>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>
    )
  }

  // Quiz Player UI
  return (
    <div className={darkMode ? 'dark' : ''}>
      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-white border-b px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-500">
              {quiz?.metadata?.title || 'Generated Quiz'}
            </div>
            <div className="flex items-center gap-4 mt-1">
              <div className="font-semibold">Q {current + 1} of {total}</div>
            </div>
          </div>
          {/* <div className="flex justify-content-between gap-4 flex-wrap">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={practiceMode}
                onChange={(e) => setPracticeMode(e.target.checked)}
                disabled={submitted}
              />
              Practice Mode
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
              />
              Dark
            </label>
          </div> */}
          <Button
            className="bg-purple-600 text-white cursor-pointer"
            onClick={() => {
              // Reset quiz state to go back to generation form
              setQuiz(null)
              setUrl("")
              setCurrent(0)
              setAnswers({})
              setMarked(new Set())
              setSubmitted(false)
              setShowScorecard(false)
              setTimeLeft(15 * 60)
              setError(null)
            }}
          >
            New Quiz
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 p-6">
        {/* Main Content */}
        <div className="flex-1">
          {quiz.questions[current] && (
            <QuestionCard q={quiz.questions[current]} idx={current} />
          )}
        </div>

        {/* Right Rail */}
        <aside className="w-full md:w-80 space-y-4">
          {/* Timer Card */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4" />
              <div className="text-sm font-semibold">Time Remaining</div>
            </div>
            <div
              className={`text-3xl font-mono text-center ${timeLeft <= 60 ? 'text-red-600' : timeLeft <= 300 ? 'text-orange-500' : ''
                }`}
            >
              {formatTime(timeLeft)}
            </div>
          </Card>

          {/* Progress Card */}
          <Card className="p-4">
            <div className="text-sm font-semibold mb-3">Progress</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Answered</span>
                <span className="font-semibold">{answeredCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Marked</span>
                <span className="font-semibold">{markedCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Unanswered</span>
                <span className="font-semibold">{total - answeredCount}</span>
              </div>
            </div>
            {!submitted && (
              <Button onClick={submitTest} className="w-full mt-4">
                Submit Test
              </Button>
            )}
          </Card>

          {/* Navigation Pager */}
          <Card className="p-4">
            <div className="text-sm font-semibold mb-3">Questions</div>
            <div className="grid grid-cols-5 gap-2">
              {quiz.questions.map((_, i) => {
                const isAnswered = answers[i] !== undefined
                const isMarked = marked.has(i)
                const isCurrent = i === current

                return (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`relative h-10 rounded text-sm font-medium transition ${isCurrent
                      ? 'ring-2 ring-violet-400 ring-offset-2'
                      : ''
                      } ${isAnswered
                        ? 'bg-violet-500 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    {i + 1}
                    {isMarked && (
                      <span className="absolute top-0 right-0 w-2 h-2 bg-purple-600 rounded-full" />
                    )}
                  </button>
                )
              })}
            </div>
          </Card>
        </aside>
      </div>

      {showScorecard && <Scorecard />}
      <div className="mx-5 my-5">
        <h1 className="font-bold text-3xl mx-2">Similar Topics</h1>
        <ul className="flex-wrap list-none gap-3 flex my-5 mx-3">
          {quiz?.metadata?.related_topics?.map((topic, index) => (
            <li key={index}>
              <Button
                className="border border-gray-300 hover:bg-gray-100 cursor-pointer"
                disabled={loading}
                onClick={() => {
                  const newUrl = `https://en.wikipedia.org/wiki/${topic.replace(/ /g, '_')}`
                  generateQuizFromUrl(newUrl)
                }}
              >
                {topic}
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
