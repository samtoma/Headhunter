import json
import re
import os
from pathlib import Path
from typing import List, Optional, Dict, Any
from pypdf import PdfReader
import docx

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5-mini-2025-08-07")

if OPENAI_API_KEY:
    from openai import OpenAI
    client = OpenAI(api_key=OPENAI_API_KEY)
    print(f"🚀 AI Engine: OpenAI Cloud ({OPENAI_MODEL})")
else:
    from llama_cpp import Llama
    print("🐢 AI Engine: Llama 3.1 (Local GPU Mode)")
    _llm = None
    MODEL_PATH = "/app/models/llama-3.1-8b-instruct-q4_k_m.gguf"

def get_local_llm():
    global _llm
    if _llm is None:
        print("🤖 Loading Local Llama Model...")
        try:
            _llm = Llama(
                model_path=MODEL_PATH,
                n_ctx=8192, # Increased context for full history
                n_threads=4,
                n_gpu_layers=-1,
                verbose=False
            )
        except Exception as e:
            print(f"❌ Failed to load model: {e}")
    return _llm

def extract_text(path: str) -> str:
    p = Path(path)
    try:
        if p.suffix.lower() == ".pdf":
            reader = PdfReader(str(path))
            return "\n".join([page.extract_text() or "" for page in reader.pages])
        elif p.suffix.lower() == ".docx":
            doc = docx.Document(str(path))
            return "\n".join([p.text for p in doc.paragraphs if p.text])
        return ""
    except Exception as e:
        print(f"Error reading file {path}: {e}")
        return ""

def repair_json(json_str: str) -> str:
    json_str = json_str.strip()
    if "```" in json_str:
        parts = json_str.split("```")
        for part in parts:
            if "{" in part:
                json_str = part.replace("json", "").strip()
                break
    return json_str

def parse_cv_with_llm(text: str, filename: str) -> Dict[str, Any]:
    truncated_text = text[:25000] # Increased limit for long CVs
    
    system_prompt = f"""You are an expert Headhunter. Extract details from the CV below into strict JSON.

    Requirements:
    1. **job_history**: Full list of jobs (Title, Company, Start/End Year).
    2. **bachelor_year**: The specific graduation year of the Bachelor's degree (used for experience calculation).
    3. **personal**: Extract Address, Age, Marital Status, Military Status (if mentioned).
    4. **experience_years**: If 'bachelor_year' found: (Current Year - Bachelor Year). Else: (Current Year - First Job Year).
    
    JSON Structure:
    {{
      "name": "Name",
      "address": "City, Country",
      "age": 30,
      "marital_status": "Married",
      "military_status": "Exempt",
      "bachelor_year": 2015,
      "experience_years": 10,
      "emails": ["a@b.com"],
      "phones": ["+123"],
      "last_job_title": "Title",
      "last_company": "Company",
      "social_links": ["linkedin..."],
      "skills": ["Python", "Java"],
      "education": [{{"school": "MIT", "degree": "BSc", "year": "2015"}}],
      "job_history": [
        {{"title": "Senior Dev", "company": "Google", "duration": "2020-Present"}},
        {{"title": "Junior Dev", "company": "Startup", "duration": "2018-2020"}}
      ]
    }}
    """

    if OPENAI_API_KEY:
        try:
            kwargs = {
                "model": OPENAI_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Filename: {filename}\nCV Text:\n{truncated_text}"}
                ]
            }
            if not OPENAI_MODEL.startswith("o1"):
                kwargs["temperature"] = 1.0
                kwargs["response_format"] = {"type": "json_object"}
            
            completion = client.chat.completions.create(**kwargs)
            raw = completion.choices[0].message.content
            return json.loads(repair_json(raw))
        except Exception as e:
            print(f"OpenAI Error: {e}")
            return {}
    else:
        llm = get_local_llm()
        if not llm: return {}
        prompt = f"<|start_header_id|>system<|end_header_id|>\n{system_prompt}<|eot_id|><|start_header_id|>user<|end_header_id|>\nCV Text:\n{truncated_text}<|eot_id|><|start_header_id|>assistant<|end_header_id|>"
        output = llm(prompt, max_tokens=3000, stop=["<|eot_id|>"], temperature=0.1, echo=False)
        try:
            return json.loads(repair_json(output['choices'][0]['text']))
        except:
            return {}