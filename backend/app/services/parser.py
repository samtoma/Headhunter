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
                n_ctx=8192,
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

def generate_job_metadata(title: str, company_context: Dict[str, str] = None) -> Dict[str, Any]:
    context_str = ""
    if company_context:
        name = company_context.get("name", "Our Company")
        desc = company_context.get("description", "")
        cult = company_context.get("culture", "")
        context_str = f"""
        CONTEXT ABOUT THE HIRING COMPANY ({name}):
        Description: {desc}
        Culture/Values: {cult}
        IMPORTANT: Tailor the job description to reflect this company's industry and values.
        """

    system_prompt = f"""You are an expert HR Manager for a leading tech company. 
    {context_str}
    
    For the Job Title "{title}", generate a structured JSON response containing:
    1. description: A professional, engaging job description (approx 150 words) suitable for LinkedIn.
    2. skills_required: A list of exactly 8 key technical and soft skills. 
       IMPORTANT: Each skill must be short (1-2 words maximum).
    3. required_experience: An integer estimate of years of experience needed (e.g., Senior=5, Junior=1).
    
    JSON Structure:
    {{
        "description": "...",
        "skills_required": ["Python", "React", "AWS"],
        "required_experience": 5
    }}
    """

    if OPENAI_API_KEY:
        try:
            kwargs = {
                "model": OPENAI_MODEL,
                "messages": [{"role": "system", "content": system_prompt}]
            }
            if not OPENAI_MODEL.startswith("o1"):
                kwargs["temperature"] = 1.0
                kwargs["response_format"] = {"type": "json_object"}

            completion = client.chat.completions.create(**kwargs)
            return json.loads(completion.choices[0].message.content)
        except Exception as e:
            print(f"OpenAI Error: {e}")
            return {}
    else:
        llm = get_local_llm()
        if not llm: return {}
        prompt = f"<|start_header_id|>system<|end_header_id|>\n{system_prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>"
        output = llm(prompt, max_tokens=1500, stop=["<|eot_id|>"], temperature=0.7, echo=False)
        try:
            return json.loads(repair_json(output['choices'][0]['text']))
        except:
            return {}

def parse_cv_with_llm(text: str, filename: str) -> Dict[str, Any]:
    truncated_text = text[:25000]
    
    system_prompt = f"""You are an expert Headhunter. Extract details from the CV below into strict JSON.

    Requirements:
    1. **summary**: A short 2-3 sentence professional summary of the candidate.
    2. **job_history**: List of jobs (Title, Company, Duration, Description).
    3. **bachelor_year**: Year of Bachelor's graduation (Int).
    4. **experience_years**: Total years of experience (Int).
    5. **personal**: Address, Age, Marital Status, Military Status.
    6. **contact**: Emails, Phones, Social Links (LinkedIn, GitHub, etc).
    7. **skills**: Technical & Soft Skills.
    
    JSON Structure:
    {{
      "name": "Name",
      "summary": "Experienced software engineer...",
      "email": ["a@b.com"],
      "phone": ["+123"],
      "address": "City",
      "age": 30,
      "marital_status": "Single",
      "military_status": "Exempt",
      "bachelor_year": 2015,
      "experience_years": 8,
      "last_job_title": "Title",
      "last_company": "Company",
      "social_links": ["linkedin..."],
      "skills": ["Python", "Java"],
      "education": [{{"school": "MIT", "degree": "BSc", "year": "2015"}}],
      "job_history": [
        {{"title": "Dev", "company": "Google", "duration": "2020-Present"}}
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
            
            data = json.loads(repair_json(raw))
            
            # --- FIX: NORMALIZE EMAIL/PHONE FIELDS ---
            # The DB expects 'email' and 'phone' (singular keys) storing JSON lists
            emails = data.get("emails") or data.get("email")
            phones = data.get("phones") or data.get("phone")
            
            # Ensure they are lists
            if emails and not isinstance(emails, list): emails = [emails]
            if phones and not isinstance(phones, list): phones = [phones]
            
            # Save back to data as JSON strings for the DB
            data["email"] = json.dumps(emails) if emails else None
            data["phone"] = json.dumps(phones) if phones else None
            
            return data
        except Exception as e:
            print(f"OpenAI Error: {e}")
            return {}
    else:
        llm = get_local_llm()
        if not llm: return {}
        prompt = f"<|start_header_id|>system<|end_header_id|>\n{system_prompt}<|eot_id|><|start_header_id|>user<|end_header_id|>\nCV Text:\n{truncated_text}<|eot_id|><|start_header_id|>assistant<|end_header_id|>"
        output = llm(prompt, max_tokens=3000, stop=["<|eot_id|>"], temperature=0.1, echo=False)
        try:
            data = json.loads(repair_json(output['choices'][0]['text']))
            
            # --- FIX: NORMALIZE EMAIL/PHONE FIELDS (Local LLM) ---
            emails = data.get("emails") or data.get("email")
            phones = data.get("phones") or data.get("phone")
            
            if emails and not isinstance(emails, list): emails = [emails]
            if phones and not isinstance(phones, list): phones = [phones]
            
            data["email"] = json.dumps(emails) if emails else None
            data["phone"] = json.dumps(phones) if phones else None
            
            return data
        except:
            return {}