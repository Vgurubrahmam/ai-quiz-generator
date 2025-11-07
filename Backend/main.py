import json
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI,HTTPException,Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import select
from database import engine,SessionLocal
from models import Quiz,Base
from scraper import scrape_wikipedia
from llm_quiz_generator import generate_quiz_json
from pydantic import BaseModel,HttpUrl
from main import app
def init_db():
    print("✅ Creating tables if they don't exist...")
    Base.metadata.create_all(bind=engine)
    print("✅ Database setup completed!")

def get_db():
    db=SessionLocal()
    try:
        yield db
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app:FastAPI):
    Base.metadata.create_all(bind=engine)
    yield
    engine.dispose()
app=FastAPI(title="AI wiki quiz generator API",lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/")
def health():
    return {"status":"ok"}

# endpoint 1
class GenerateQuizBody(BaseModel):
    url:HttpUrl
@app.post("/generate_quiz")
def generate_quiz(body:GenerateQuizBody,db:Session=Depends(get_db)):
    try:
        title,clean_text=scrape_wikipedia(str(body.url))

    except Exception as e:
        raise HTTPException(status_code=400,detail=f"Scrape failed :{e}")
    
    if not clean_text or len(clean_text)<300:
        raise HTTPException(status_code=400,detail=f"Article content too short to generate a quiz.")
    
    try:
        quiz_json=generate_quiz_json(title=title,article_text=clean_text,source_url=str(body.url))
    except Exception as e:
        raise HTTPException(status_code=500,detail=f"LLM generation failed:{e}")
    q=Quiz(
        url=str(body.url),
        title=title,
        scraped_content=None,
        full_quiz_data=json.dumps(quiz_json,ensure_ascii=False)
    )
    db.add(q)
    db.commit()
    db.refresh(q)

    response={
        "id":q.id,
        "url":q.url,
        "title":q.title,
        "date_generated":q.date_generated,
        "quiz":quiz_json
    }
    return response


# endpint 2
@app.get("/history")
def list_history(db:Session=Depends(get_db)):
    rows=db.execute(select(Quiz).order_by(Quiz.id.desc())).scalars().all()
    return [
        {
            "id":r.id,
            "url":r.url,
            "title":r.title,
            "date_generated":r.date_generated
        }
        for r in rows   
    ]

# endpint 3
@app.get("/quiz/{quiz_id}")
def get_quiz(quiz_id:int,db:Session=Depends(get_db)):
    q=db.get(Quiz,quiz_id)
    if not q:
        raise HTTPException(status_code=404,detail="Quiz not found")
    try:
        data=json.loads(q.full_quiz_data)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500,detail="Stored quiz JSON is invalid")
    return {
        "id":q.id,
        "url":q.url,
        "title":q.title,
        "date_generated":q.date_generated,
        "quiz":data
    }
if __name__ == "__main__":
    # ensure DB created then run the ASGI server so the API is reachable
    init_db()
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
