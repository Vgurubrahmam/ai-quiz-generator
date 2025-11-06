from typing import Dict, Any
import json
import logging
import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from models import QuizJSON

load_dotenv()
GOOGLE_API_KEY=os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise RuntimeError("GOOGLE_API_KEY is not in .env")
_llm=ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0.2,
    max_output_tokens=4096  # Increased from 2048 to allow for longer responses
)
_parser=JsonOutputParser(pydantic_object=QuizJSON)
_prompt=ChatPromptTemplate.from_messages(
    [
        ("system",
         "You are a quiz generation expert. You MUST respond with ONLY valid JSON.\n"
         "Do NOT include any explanatory text, code fences, or markdown formatting.\n"
         "Your response must start with {{ and end with }}.\n"
         "Follow the exact schema provided in the format instructions."),
        ("human",
         "Create a multiple-choice quiz from this Wikipedia article.\n\n"
         "Article Title: {title}\n\n"
         "Article Text:\n{article_text}\n\n"
         "REQUIREMENTS:\n"
         "1. Generate 8-12 questions covering key concepts from the article\n"
         "2. Each question MUST have:\n"
         "   - A clear, specific question text\n"
         "   - Exactly 4 options labeled A, B, C, D\n"
         "   - Each option MUST have non-empty text\n"
         "   - A correct_label field (A, B, C, or D)\n"
         "   - A detailed explanation (200+ chars) for why the answer is correct\n"
         "3. Include metadata with:\n"
         "   - title: the article title\n"
         "   - key_entities: 3-5 main entities/concepts from the article\n"
         "   - related_topics: 3-5 related topics for further study\n\n"
         "CRITICAL: Respond with ONLY the JSON object. No other text.\n\n"
         "{format_instructions}"
         )
    ]
    
).partial(format_instructions=_parser.get_format_instructions())
_chain=_prompt|_llm|_parser
_raw_chain = _prompt|_llm

def generate_quiz_json(title:str,article_text:str,source_url:str)->Dict:
    # Truncate article text if too long (keep first 8000 chars to stay within token limits)
    if len(article_text) > 8000:
        logging.warning(f"Article text truncated from {len(article_text)} to 8000 chars")
        article_text = article_text[:8000]
    
    try:
        result = _chain.invoke({
            "title": title,
            'article_text': article_text
        })
    except Exception as e:
        # Parsing failed (invalid JSON from LLM). Try a raw call to the LLM
        # (prompt -> llm) to get the textual response, then attempt to
        # extract JSON from the returned text as a best-effort fallback.
        logging.exception("LLM chain parsing failed, attempting fallback")
        try:
            raw = _raw_chain.invoke({"title": title, "article_text": article_text})
        except Exception as raw_err:
            # If even the raw call fails, re-raise the original exception with context
            raise RuntimeError(f"LLM generation failed completely: {raw_err}") from e

        # Normalize raw to text
        if isinstance(raw, str):
            raw_text = raw
        elif isinstance(raw, dict):
            # maybe the llm returned a dict already
            raw_text = json.dumps(raw, ensure_ascii=False)
        elif hasattr(raw, "content"):
            # LangChain message object
            raw_text = raw.content
        elif hasattr(raw, "model_dump"):
            try:
                raw_text = json.dumps(raw.model_dump(), ensure_ascii=False)
            except Exception:
                raw_text = str(raw)
        else:
            raw_text = str(raw)

        # Log the raw output for debugging
        logging.info(f"Raw LLM output (first 500 chars): {raw_text[:500]}")
        
        # Check if output is empty or whitespace
        if not raw_text or not raw_text.strip():
            raise RuntimeError(f"LLM returned empty output. This may be due to content length, API quota, or model issues. Original error: {e}") from e

        # Strip code fences if present (```json ... ```)
        import re
        code_fence_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', raw_text, re.IGNORECASE)
        if code_fence_match:
            raw_text = code_fence_match.group(1)
            logging.info("Stripped code fences from LLM output")

        # Try to extract JSON substring from raw_text
        start = raw_text.find("{")
        end = raw_text.rfind("}")
        if start != -1 and end != -1 and end > start:
            candidate = raw_text[start:end+1]
            try:
                data = json.loads(candidate)
                logging.info("Successfully parsed JSON from fallback")
            except Exception as json_err:
                raise RuntimeError(f"LLM generation failed: invalid json output and fallback parse failed ({json_err}). Raw output: {raw_text[:500]}...") from e
        else:
            raise RuntimeError(f"LLM generation failed: Invalid json output and no JSON-like substring found. Raw output: {raw_text[:500]}...") from e

        # set result to the parsed dict so downstream code can continue
        result = data

    # The chain may return a pydantic model instance (with model_dump)
    # or a plain dict. Normalize to a dict safely.
    if hasattr(result, "model_dump"):
        data = result.model_dump()
    elif isinstance(result, dict):
        data = result
    elif hasattr(result, "dict"):
        data = result.dict()
    elif hasattr(result, "to_dict"):
        data = result.to_dict()
    else:
        raise RuntimeError(f"Unexpected result type from LLM chain: {type(result)}")
    # Ensure metadata exists and set fields
    metadata = data.get("metadata")
    if metadata is None or not isinstance(metadata, dict):
        data["metadata"] = {"source_url": source_url, "title": title}
    else:
        data["metadata"]["source_url"] = source_url
        if data["metadata"].get("title", "") == "":
            data["metadata"]["title"] = title
    return data
