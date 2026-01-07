
# AI Quiz Generator Frontend

This is the React + Vite frontend for the AI Quiz Generator project. It allows users to generate quizzes from web articles, view quiz history, and take quizzes.

## Features
- Generate quizzes from any article URL
- Select difficulty and number of questions
- View and retake past quizzes (history)
- Click URLs in history or quiz display to auto-fill and generate new quizzes
- Responsive, modern UI

## Setup
1. Install dependencies:
	```bash
	npm install
	```
2. Set environment variables:
	- Create a `.env` file in the Frontend folder
	- Set `VITE_API_URL` to your backend URL (e.g. `http://localhost:8000` for local dev)
3. Run the app:
	```bash
	npm run dev
	```

## Build for Production
```bash
npm run build
```

## Usage
- Use the Generate Quiz tab to enter a URL, select difficulty, and number of questions
- Use the Quiz History tab to view all past quizzes
- Click any URL in history or quiz display to generate a new quiz for that article

## Notes
- .env files are ignored by git for security
- Requires the backend (FastAPI) server running for full functionality

---
See the backend README for API and deployment details.
