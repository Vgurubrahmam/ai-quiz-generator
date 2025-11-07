import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
export default function QuizDisplay({ quizId, onBack }) {
    const [quiz, setQuiz] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (quizId) {
            handleQuizDisplay(quizId)
        }
    }, [quizId])

    const handleQuizDisplay = async (id) => {
        setLoading(true)
        setError(null)
        try {
            const response = await fetch(`https://quizmakerai-backend.vercel.app/quiz/${id}`)
            const data = await response.json()

            if (!response.ok) {
                setError(data.detail || response.statusText)
            } else {
                setQuiz(data)
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
                    <strong>Error:</strong> {error}
                </div>
                <Button onClick={onBack} className="mt-4">
                    Back to History
                </Button>
            </div>
        )
    }

    if (!quiz) {
        return null
    }

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">{quiz.title}</h1>
                <Button onClick={onBack} variant="outline">
                    Back to History
                </Button>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-gray-600">
                    <strong>URL:</strong> <a href={quiz.url} className="text-blue-600 hover:underline">{quiz.url}</a>
                </p>
                <p className="text-sm text-gray-600 mt-2">
                    <strong>Generated:</strong> {new Date(quiz.date_generated).toLocaleString()}
                </p>
            </div>

            <div className="bg-white border rounded-lg p-6">
                <h2 className="font-semibold mb-4 text-2xl">{quiz.title}</h2>
                <p className="font-semibold">Quiz Questions</p>
                <Accordion type="single" collapsible>
                    {
                        quiz.quiz?.questions?.map((eachQuestion, index) => (
                            <AccordionItem value={String(index)} key={index}>
                                <AccordionTrigger className="underline-none">{index + 1}. {eachQuestion.question}</AccordionTrigger>
                                <AccordionContent>
                                    <div className="space-y-2">
                                        {eachQuestion.options?.map((option) => (
                                            <div 
                                                key={option.label} 
                                                className={`p-2 rounded ${
                                                    option.label === eachQuestion.correct_label 
                                                        ? 'bg-green-100 border border-green-300' 
                                                        : 'bg-gray-50'
                                                }`}
                                            >
                                                <strong>{option.label}.</strong> {option.text}
                                                {option.label === eachQuestion.correct_label && (
                                                    <span className="ml-2 text-green-600 font-semibold">✓ Correct</span>
                                                )}
                                            </div>
                                        ))}
                                        <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                                            <strong className="text-blue-800">Explanation:</strong>
                                            <p className="mt-1 text-gray-700">{eachQuestion.explination || eachQuestion.explanation}</p>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))
                    }
                </Accordion>
            </div>
 <div className="mx-5 my-5">
        <h1 className="font-bold text-3xl mx-2">Similar Topics</h1>
        <ul className="flex-wrap list-none gap-3 flex my-5 mx-3">
          {quiz?.quiz?.metadata?.related_topics?.map((topic, index) => (
            <li key={index}>
              <Button
                className="border border-gray-300 hover:bg-gray-100 cursor-pointer"
                disabled={loading}
                // onClick={() => {
                //   const newUrl = `https://en.wikipedia.org/wiki/${topic.replace(/ /g, '_')}`
                //   generateQuizFromUrl(newUrl)
                // }}
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