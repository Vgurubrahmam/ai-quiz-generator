import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/services/api";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {Button} from "@/components/ui/button"

export default function HistoryTab({ onViewQuiz, onUrlClick }) {
    const [quizHistory, setQuizHistory] = useState([])
    
    const handleHistory = async () => {
        const response = await fetch(`${API_BASE_URL}/history`)
        const data = await response.json()
        setQuizHistory(data)
    }
    
    useEffect(() => {
        handleHistory()
    }, [])
    
    return (
        <>
        <Table className="w-[95%] my-5  mx-auto border border-gray-200 shadow-sm rounded-lg">
  <TableHeader>
    <TableRow className="bg-gray-100">
      <TableHead className="w-[30%] font-semibold text-gray-700">Title</TableHead>
      <TableHead className="w-[20%] font-semibold text-gray-700">Date</TableHead>
      <TableHead className="w-[35%] font-semibold text-gray-700">URL</TableHead>
      <TableHead className="w-[15%] font-semibold text-gray-700">Details</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
     {quizHistory.length > 0 ? (
         quizHistory.map((quiz, index) => (
             <TableRow key={index}
             className="hover:bg-gray-50 transition-colors border-b"
             >
      <TableCell className="font-medium">{quiz.title}</TableCell>
      <TableCell>{new Date(quiz.date_generated).toLocaleString()}</TableCell>
      <TableCell>
        {quiz.url ? (
          <a
            href="#"
            className="text-blue-600 hover:underline"
            onClick={e => {
              e.preventDefault();
              if (onUrlClick) onUrlClick(quiz.url);
            }}
          >
            {quiz.url}
          </a>
        ) : (
          ''
        )}
      </TableCell>
      <TableCell>
        <Button 
          onClick={() => onViewQuiz(quiz.id)} 
          className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
        >
          VIEW
        </Button>
      </TableCell>
    </TableRow>
         ))
        ) : (
            <TableRow>
        <TableCell colSpan={4} className="text-center text-gray-500 py-4">
          No quiz history found.
        </TableCell>
      </TableRow>
        
    )}
  </TableBody>
</Table>
        </>
    )
}