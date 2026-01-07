import json
import logging
import os
from typing import Dict

from dotenv import load_dotenv
import google.generativeai as gen

from models import QuizJSON

load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise RuntimeError("GOOGLE_API_KEY is not in .env")

gen.configure(api_key=GOOGLE_API_KEY)
_MODEL_NAME = "gemini-2.5-flash"
_model = gen.GenerativeModel(model_name=_MODEL_NAME)

_PROMPT_TEMPLATE = """
You are a quiz generation expert. You MUST respond with ONLY valid JSON that adheres to the provided schema.

Article Title: {title}

Article Text:
{article_text}

REQUIREMENTS:
1. Generate exactly {num_questions} multiple-choice questions covering key concepts from the article.
2. Difficulty Level: {difficulty}
   - EASY: Basic recall and simple comprehension questions
   - MEDIUM: Application and analysis questions requiring deeper understanding
   - HARD: Complex inference, synthesis, and evaluation questions
3. Each question MUST include:
   - question: the prompt text
   - options: array of exactly 4 objects with labels A-D and non-empty text
   - correct_label: one of A/B/C/D
   - difficulty: "{difficulty}"
   - explanation: at least 200 characters explaining the answer
4. metadata must include:
   - title: article title
   - source_url: the source URL supplied
   - difficulty: "{difficulty}"
   - key_entities: list of 3-5 main entities/concepts
   - related_topics: list of 3-5 related topics for further study

CRITICAL RULES:
- Respond with ONLY a JSON object. No markdown, no prose, no code fences.
- Generate exactly {num_questions} questions at {difficulty} difficulty level.
- The JSON must conform to this schema:
{schema}
"""


def _extract_json(text: str) -> Dict:
    text = text.strip()
    if not text:
        raise RuntimeError("LLM returned empty output")

    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise RuntimeError("LLM output does not contain a JSON object")

    snippet = text[start : end + 1]
    try:
        return json.loads(snippet)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Failed to parse LLM JSON response: {exc}") from exc


def _call_model(prompt: str) -> str:
    try:
        response = _model.generate_content(prompt)
    except Exception as exc:  # pragma: no cover - passthrough for runtime errors
        raise RuntimeError(f"Gemini generation failed: {exc}") from exc

    if not response:
        raise RuntimeError("Gemini returned no response")

    text = getattr(response, "text", None)
    if text:
        return text

    # Fallback: concatenate text parts from the first candidate
    candidates = getattr(response, "candidates", None) or []
    if not candidates:
        raise RuntimeError("Gemini response missing candidates")

    parts = getattr(candidates[0], "content", None)
    if not parts or not getattr(parts, "parts", None):
        raise RuntimeError("Gemini response missing textual content")

    return "".join(getattr(part, "text", "") for part in parts.parts)


def _normalise_llm_payload(payload: Dict) -> None:
    """Coerce common key variants emitted by the model into the expected schema."""
    if not isinstance(payload, dict):
        return

    questions = payload.get("questions")
    if not isinstance(questions, list):
        return

    for question in questions:
        if not isinstance(question, dict):
            continue
        options = question.get("options")
        if not isinstance(options, list):
            continue
        for option in options:
            if not isinstance(option, dict):
                continue
            if "text" not in option:
                for alt_key in ("text_content", "textContent", "content", "option_text", "text_text"):
                    if alt_key in option and option[alt_key]:
                        option["text"] = option.pop(alt_key)
                        break
            if "label" in option and isinstance(option["label"], str):
                option["label"] = option["label"].strip().upper()[:1]


def generate_quiz_json(title: str, article_text: str, source_url: str, difficulty: str = "medium", num_questions: int = 10) -> Dict:
    if len(article_text) > 8000:
        logging.warning("Article text truncated from %d to 8000 chars", len(article_text))
        article_text = article_text[:8000]

    schema = QuizJSON.model_json_schema()  # Use Pydantic to describe the expected JSON
    prompt = _PROMPT_TEMPLATE.format(
        title=title, 
        article_text=article_text, 
        schema=json.dumps(schema, ensure_ascii=False, indent=2),
        difficulty=difficulty.upper(),
        num_questions=num_questions
    )

    raw_text = _call_model(prompt)
    data = _extract_json(raw_text)
    _normalise_llm_payload(data)

    try:
        quiz = QuizJSON.model_validate(data)
    except Exception as exc:
        raise RuntimeError(f"Generated quiz failed schema validation: {exc}") from exc

    quiz.metadata.source_url = source_url
    quiz.metadata.difficulty = difficulty
    if not quiz.metadata.title:
        quiz.metadata.title = title

    return quiz.model_dump()
