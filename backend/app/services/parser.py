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

# --- UPGRADED TEXT EXTRACTOR (Finds Hidden Links) ---
def extract_text(path: str) -> str:
    p = Path(path)
    text_content = []
    try:
        if p.suffix.lower() == ".pdf":
            reader = PdfReader(str(path))
            for page in reader.pages:
                # 1. Get the visible text
                text_content.append(page.extract_text() or "")
                
                # 2. Hunt for hidden links (Annotations)
                if "/Annots" in page:
                    for annot in page["/Annots"]:
                        try:
                            obj = annot.get_object()
                            # Check if it's a Link with a URI
                            if "/A" in obj and "/URI" in obj["/A"]:
                                uri = obj["/A"]["/URI"]
                                # Append it so AI can see it
                                text_content.append(f" [LINK: {uri}] ")
                        except:
                            continue # Skip broken links
                            
            return "\n".join(text_content)
            
        elif p.suffix.lower() == ".docx":
            doc = docx.Document(str(path))
            # DOCX link extraction is harder, but extracting text is standard
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

def clean_contact_field(value):
    """Ensures contact fields are always valid JSON lists of strings."""
    if not value: return json.dumps([])
    if isinstance(value, list): return json.dumps(value)
    if isinstance(value, str):
        value = value.strip()
        if value.startswith("[") and value.endswith("]"):
            try:
                json.loads(value) 
                return value 
            except: pass
        return json.dumps([value])
    return json.dumps([])

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
    1. description: A professional, engaging job description (approx 150 words).
    2. skills_required: A list of exactly 8 key technical and soft skills. Each skill must be 1-2 words max.
    3. required_experience: An integer estimate of years of experience needed.
    
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
        return {}

def parse_cv_with_llm(text: str, filename: str) -> Dict[str, Any]:
    truncated_text = text[:25000]
    
    system_prompt = f"""You are an expert Headhunter. Extract details from the CV below into strict JSON.
    
    CRITICAL: 
    1. Extract 'email' and 'phone' as LISTS of strings.
    2. Look for 'LINK:' tags in text to find Social Links (LinkedIn, GitHub, Portfolio).

    Requirements:
    1. **summary**: A short 2-3 sentence professional summary.
    2. **job_history**: List of jobs.
    3. **bachelor_year**: Year of Bachelor's graduation (Int).
    4. **experience_years**: Total years of experience (Int).
    5. **personal**: Address, Age, Marital Status, Military Status.
    6. **contact**: Emails, Phones, Social Links.
    7. **skills**: Technical & Soft Skills.
    
    JSON Structure:
    {{
      "name": "Name",
      "summary": "...",
      "email": ["a@b.com"],
      "phone": ["+123456"],
      "address": "City",
      "age": 30,
      "marital_status": "Single",
      "military_status": "Exempt",
      "bachelor_year": 2015,
      "experience_years": 8,
      "last_job_title": "Title",
      "last_company": "Company",
      "social_links": ["https://linkedin.com/in/..."],
      "skills": ["Python", "Java"],
      "education": [{{...}}],
      "job_history": [{{...}}]
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
            
            # Normalize Fields
            raw_email = data.get("email") or data.get("emails")
            raw_phone = data.get("phone") or data.get("phones")
            
            data["email"] = clean_contact_field(raw_email)
            data["phone"] = clean_contact_field(raw_phone)
            
            if "skills" in data: data["skills"] = clean_contact_field(data["skills"])
            if "social_links" in data: data["social_links"] = clean_contact_field(data["social_links"])
            if "education" in data: data["education"] = json.dumps(data["education"])
            if "job_history" in data: data["job_history"] = json.dumps(data["job_history"])

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
            
            raw_email = data.get("email") or data.get("emails")
            raw_phone = data.get("phone") or data.get("phones")
            
            final_emails = clean_list_field(raw_email)
            final_phones = clean_list_field(raw_phone)
            
            data["email"] = json.dumps(final_emails)
            data["phone"] = json.dumps(final_phones)
            
            return data
        except:
            return {}