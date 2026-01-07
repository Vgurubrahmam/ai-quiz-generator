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
2. Configure environment:
    - For local development, SQLite is used by default.
    - For production, set `DATABASE_URL` in a `.env` file to your PostgreSQL/Supabase connection string.
    - Example `.env`:
       ```
       DATABASE_URL=your_postgres_connection_string
       ```
3. Run the server:
    ```bash
    uvicorn app:app --reload
    ```

## Endpoints

- `POST /generate_quiz`  
   Generate a quiz from a URL.  
   **Body:**  
   ```json
   {
      "url": "https://example.com/article",
      "difficulty": "easy",
      "num_questions": 10
   }
   ```

- `GET /history`  
   Get all past quizzes.

- `GET /quiz/{id}`  
   Get a specific quiz by ID.

## Testing Steps

1. **Start the backend server** (see setup above).
2. **Test endpoints** using [Postman](https://www.postman.com/) or [curl](https://curl.se/):
    - Generate a quiz:
       ```bash
       curl -X POST "http://localhost:8000/generate_quiz" -H "Content-Type: application/json" -d "{\"url\": \"https://example.com/article\", \"difficulty\": \"medium\", \"num_questions\": 5}"
       ```
    - View history:
       ```bash
       curl "http://localhost:8000/history"
       ```
    - View a quiz by ID:
       ```bash
       curl "http://localhost:8000/quiz/1"
       ```
3. **Check database** for stored quizzes (SQLite or PostgreSQL).

## Deployment
- Designed for Vercel/Serverless, works locally and in production environments
- Use environment variables for DB connection

## Notes
- All scraped content and quiz metadata are stored in the database
- .env files are ignored by git for security

---
See the frontend README for UI usage.
