# AI Quiz Generator Backend

This is the FastAPI backend for the AI Quiz Generator project. It provides endpoints for generating quizzes from URLs, storing quiz data, and retrieving quiz history.

## Features
- Generate quizzes from web articles using LLM
- Store all scraped and generated data in PostgreSQL (Supabase in production, SQLite for local dev)
- Track quiz history with difficulty, number of questions, and source URL
- CORS enabled for frontend integration

## Requirements
- Python 3.10+
- See `requirements.txt` for dependencies

## Setup
1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Set environment variables:
   - For local dev: use SQLite (default)
   - For production: set `DATABASE_URL` to your Supabase/PostgreSQL connection string
   - Optionally use a `.env` file (not committed to git)
3. Run the server:
   ```bash
   uvicorn app:app --reload
   ```

## Endpoints
- `POST /generate_quiz` — Generate a quiz from a URL (accepts `url`, `difficulty`, `num_questions`)
- `GET /history` — Get all past quizzes
- `GET /quiz/{id}` — Get a specific quiz by ID

## Deployment
- Designed for Vercel/Serverless, works locally and in production environments
- Use environment variables for DB connection

## Notes
- All scraped content and quiz metadata are stored in the database
- .env files are ignored by git for security

---
See the frontend README for UI usage.
