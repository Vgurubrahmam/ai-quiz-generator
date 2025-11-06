
import GenerateQuizTab from "./tabs/GenerateQuizTab"
import { Button } from "@/components/ui/button"
function App() {
  return (
    <>
    {/* header */}
      <div className="flex items-center gap-3 p-3 shadow-lg">
        <img
          src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRr9T9Zt_tXyudYeIiVMQ4oq1RDbse9J8rIPA&s"
          alt="logo"
          className="w-12 rounded"
          />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Quiz Generator</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Create quizzes from web content</p>
        </div>
      {/* <Button className="bg-purple-500 text-white self-end">Generate Quiz</Button> */}
      </div>

      <GenerateQuizTab />
    </>
  )
}

export default App
