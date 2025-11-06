# models.py
from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime, timezone
from database import Base
from pydantic import BaseModel,Field
from typing import List

# table Quiz model
class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String(512), nullable=False)
    title = Column(String(512), nullable=False)
    date_generated = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )
    scraped_content = Column(Text, nullable=True)
    full_quiz_data = Column(Text, nullable=False)  


# make quiz
class QuizOption(BaseModel):
    label:str=Field(...,description="Option label, e.g., 'A','B','C','D'")
    text:str

class QuizQuestion(BaseModel):
    id:str
    question:str
    options:List[QuizOption]
    correct_label:str=Field(...,description="One of A/B/C/D")
    explination:str

class QuizMetadata(BaseModel):
    title:str
    source_url:str
    key_entites:list[str]=[]
    related_topics:List[str]=[]

class QuizJSON(BaseModel):
    metadata:QuizMetadata
    questions:List[QuizQuestion]

