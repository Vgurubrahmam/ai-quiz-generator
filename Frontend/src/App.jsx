import { useState } from "react"
import GenerateQuizTab from "./tabs/GenerateQuizTab"
import { Button } from "@/components/ui/button"
import HistoryTab from "./tabs/HistoryTab"
import QuizDisplay from "./components/QuizDisplay"

function App() {
  const [activeTab, setActiveTab] = useState("generate") // "generate" or "history"
  const [viewQuizId, setViewQuizId] = useState(null) // Quiz ID to view from history

  // Handler to view quiz from history
  const handleViewQuiz = (quizId) => {
    setViewQuizId(quizId)
    setActiveTab("view") // Switch to view mode
  }

  // Handler to go back from quiz view
  const handleBackToHistory = () => {
    setViewQuizId(null)
    setActiveTab("history")
  }

  return (
    <>
      {/* header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 shadow-lg">
       <div className="flex  items-center gap-3">
  <img
    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRr9T9Zt_tXyudYeIiVMQ4oq1RDbse9J8rIPA&s"
    alt="logo"
    className="w-12 rounded"
  />
  <div>
    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 w-full">AI Quiz Generator</h1>
    <p className="text-sm text-slate-600 dark:text-slate-400">Create quizzes from web content</p>
  </div>
</div>

        
        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2">
          <Button 
            className={activeTab === "generate" ? "bg-purple-700 text-white" : "border border-gray-300"}
            onClick={() => setActiveTab("generate")}
          >
            Generate Quiz
          </Button>
          <Button 
            className={activeTab === "history" ? "bg-purple-700 text-white" : "border border-gray-300"}
            onClick={() => setActiveTab("history")}
          >
            Quiz History
          </Button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "generate" && <GenerateQuizTab />}
      {activeTab === "history" && <HistoryTab onViewQuiz={handleViewQuiz} />}
      {activeTab === "view" && viewQuizId && (
        <QuizDisplay quizId={viewQuizId} onBack={handleBackToHistory} />
      )}
    </>
  )
}

export default App
