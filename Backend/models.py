# models.py
from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime, timezone
from database import Base
from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum

# Difficulty enum
class DifficultyLevel(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"

# table Quiz model
class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String(512), nullable=False)
    title = Column(String(512), nullable=False)
    difficulty = Column(String(50), nullable=True, default="medium")
    num_questions = Column(Integer, nullable=True, default=10)
    date_generated = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )
    scraped_content = Column(Text, nullable=True)  # Stores the scraped article text
    full_quiz_data = Column(Text, nullable=False)


# make quiz
class QuizOption(BaseModel):
    label: str = Field(..., description="Option label, e.g., 'A','B','C','D'")
    text: str

class QuizQuestion(BaseModel):
    id: str
    question: str
    options: List[QuizOption]
    correct_label: str = Field(..., description="One of A/B/C/D")
    difficulty: Optional[str] = Field(default="medium", description="easy, medium, or hard")
    explination: str  # keeping original spelling for backward compatibility

class QuizMetadata(BaseModel):
    title: str
    source_url: str
    difficulty: Optional[str] = "medium"
    key_entites: list[str] = []  # keeping original spelling
    related_topics: List[str] = []

class QuizJSON(BaseModel):
    metadata: QuizMetadata
    questions: List[QuizQuestion]

