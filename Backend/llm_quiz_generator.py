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
1. Generate 8-12 multiple-choice questions covering key concepts from the article.
2. Each question MUST include:
   - question: the prompt text
   - options: array of exactly 4 objects with labels A-D and non-empty text
   - correct_label: one of A/B/C/D
   - explanation: at least 200 characters explaining the answer
3. metadata must include:
   - title: article title
   - source_url: the source URL supplied
   - key_entities: list of 3-5 main entities/concepts
   - related_topics: list of 3-5 related topics for further study

CRITICAL RULES:
- Respond with ONLY a JSON object. No markdown, no prose, no code fences.
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


def generate_quiz_json(title: str, article_text: str, source_url: str) -> Dict:
    if len(article_text) > 8000:
        logging.warning("Article text truncated from %d to 8000 chars", len(article_text))
        article_text = article_text[:8000]

    schema = QuizJSON.model_json_schema()  # Use Pydantic to describe the expected JSON
    prompt = _PROMPT_TEMPLATE.format(title=title, article_text=article_text, schema=json.dumps(schema, ensure_ascii=False, indent=2))

    raw_text = _call_model(prompt)
    data = _extract_json(raw_text)

    try:
        quiz = QuizJSON.model_validate(data)
    except Exception as exc:
        raise RuntimeError(f"Generated quiz failed schema validation: {exc}") from exc

    quiz.metadata.source_url = source_url
    if not quiz.metadata.title:
        quiz.metadata.title = title

    return quiz.model_dump()
