from typing import Dict, Any
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
    model="gemini-2.5-flash" ,
    temperature=0.2,
    max_output_tokens=2048

)
_parser=JsonOutputParser(pydantic_object=QuizJSON)
_prompt=ChatPromptTemplate.from_messages(
    [
        ("system",
         "You generate high-quality multiple-choice quizzes from Wikipedia text.\n"
         "Return ONLY valid JSON that matches the provided schema.\n"
         "Do NOT include any extra commentary."),
        ("human",
         "Article title: {title}\n\n"
         "Article text:\n{article_text}\n\n"
         "Generate a quiz with:\n"
         "- 8 to 12 questions\n"
         "- Each question has exactly 4 options labeled A, B, C, D\n"
         "- Provide a short explanation for the correct answer\n"
         "- Include key_entities and related_topics in metadata\n\n"
         "{format_instructions}"
         )
    ]
    
).partial(format_instructions=_parser.get_format_instructions())
_chain=_prompt|_llm|_parser

def generate_quiz_json(title:str,article_text:str,source_url:str)->Dict:
    result = _chain.invoke({
        "title": title,
        'article_text': article_text
    })

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
