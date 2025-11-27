import json
import re
import os
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any
from pypdf import PdfReader
import docx

logger = logging.getLogger(__name__)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5-mini-2025-08-07")

if OPENAI_API_KEY:
    from openai import OpenAI
    client = OpenAI(api_key=OPENAI_API_KEY)
    logger.info("AI Engine: OpenAI Cloud (%s)", OPENAI_MODEL)
else:
    from llama_cpp import Llama
    logger.info("AI Engine: Llama 3.1 (Local GPU Mode)")
    _llm = None
    MODEL_PATH = "/app/models/llama-3.1-8b-instruct-q4_k_m.gguf"

def get_local_llm():
    global _llm
    if _llm is None:
        logger.info("Loading Local Llama Model...")
        try:
            _llm = Llama(
                model_path=MODEL_PATH,
                n_ctx=8192,
                n_threads=4,
                n_gpu_layers=-1,
                verbose=False
            )
        except Exception as e:
            logger.error("Failed to load local model: %s", e)
    return _llm

def extract_text(path: str) -> str:
    p = Path(path)
    text_content = []
    try:
        logger.debug("Extracting text from %s", path)
        if p.suffix.lower() == ".pdf":
            reader = PdfReader(str(path))
            logger.debug("PDF detected with %d pages", len(reader.pages))
            for page in reader.pages:
                text_content.append(page.extract_text() or "")
                if "/Annots" in page:
                    for annot in page["/Annots"]:
                        try:
                            obj = annot.get_object()
                            if "/A" in obj and "/URI" in obj["/A"]:
                                uri = obj["/A"]["/URI"]
                                text_content.append(f" [LINK: {uri}] ")
                        except: continue
            return "\n".join(text_content)
        elif p.suffix.lower() == ".docx":
            logger.debug("DOCX detected, reading paragraphs")
            doc = docx.Document(str(path))
            return "\n".join([p.text for p in doc.paragraphs if p.text])
        return ""
    except Exception as e:
        logger.error("Error reading file %s: %s", path, e)
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
    if not value:
        return json.dumps([])
    if isinstance(value, list):
        return json.dumps(value)
    if isinstance(value, str):
        value = value.strip()
        if value.startswith("[") and value.endswith("]"):
            try:
                json.loads(value)
                return value
            except Exception:
                pass
        return json.dumps([value])
    return json.dumps([])

# --- NEW NORMALIZERS ---
def normalize_job_history(jobs: List[Dict]) -> str:
    """Standardizes job history into a consistent List[Dict] JSON string."""
    cleaned = []
    if not isinstance(jobs, list):
        return json.dumps([])

    for j in jobs:
        if not isinstance(j, dict):
            continue

        # 1. Title
        title = j.get("title") or j.get("role") or j.get("position") or "Unknown Role"

        # 2. Company
        company = j.get("company") or j.get("organization") or "Unknown Company"

        # 3. Duration (Merge start/end if duration missing)
        duration = j.get("duration")
        if not duration:
            start = j.get("start_date") or j.get("start") or ""
            end = j.get("end_date") or j.get("end") or "Present"
            if start:
                duration = f"{start} - {end}"
            else:
                duration = ""

        # 4. Description (Merge highlights if description missing)
        desc = j.get("description") or j.get("summary") or ""
        if not desc:
            highlights = j.get("highlights") or j.get("responsibilities")
            if isinstance(highlights, list):
                desc = ". ".join(highlights)
            elif isinstance(highlights, str):
                desc = highlights
                
        cleaned.append({
            "title": title,
            "company": company,
            "duration": duration,
            "description": desc
        })
    return json.dumps(cleaned)

def normalize_education(edu: List[Dict]) -> str:
    """Standardizes education into a consistent List[Dict] JSON string."""
    cleaned = []
    if not isinstance(edu, list): return json.dumps([])
    
    for e in edu:
        if not isinstance(e, dict): continue
        
        # 1. School
        school = e.get("school") or e.get("institution") or e.get("university") or "Unknown Institution"
        
        # 2. Degree
        degree = e.get("degree") or e.get("major") or "Degree"
        
        # 3. Year
        year = e.get("year") or e.get("end_date") or e.get("date") or ""
        
        cleaned.append({
            "school": school,
            "degree": degree,
            "year": str(year)
        })
    return json.dumps(cleaned)

def generate_job_metadata(title: str, company_context: Dict[str, str] = None) -> Dict[str, Any]:
    context_str = ""
    if company_context:
        name = company_context.get("name", "Our Company")
        desc = company_context.get("description", "")
        cult = company_context.get("culture", "")
        context_str = f"CONTEXT ABOUT THE HIRING COMPANY ({name}):\nDescription: {desc}\nCulture/Values: {cult}\nIMPORTANT: Tailor the job description to reflect this company's industry and values."

    system_prompt = f"""You are an expert HR Manager. 
    {context_str}
    For the Job Title "{title}", generate a structured JSON response containing:
    1. description: A professional, engaging job description (approx 150 words).
    2. skills_required: A list of exactly 8 key technical/soft skills. Each skill must be 1-2 words max.
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
            kwargs = { "model": OPENAI_MODEL, "messages": [{"role": "system", "content": system_prompt}] }
            if not OPENAI_MODEL.startswith("o1"):
                kwargs["temperature"] = 1.0
                kwargs["response_format"] = {"type": "json_object"}
            logger.debug("Generating job metadata for '%s' using %s", title, OPENAI_MODEL)
            completion = client.chat.completions.create(**kwargs)
            return json.loads(completion.choices[0].message.content)
        except Exception as e:
            logger.error("OpenAI Error while generating job metadata: %s", e)
            return {}
    return {}

def parse_cv_with_llm(text: str, filename: str) -> Dict[str, Any]:
    truncated_text = text[:25000]
    logger.debug(
        "Starting parse for '%s' (original len=%d, truncated len=%d)",
        filename,
        len(text),
        len(truncated_text),
    )
    system_prompt = """You are an expert Headhunter. Extract details from the CV below into strict JSON.
    CRITICAL: Extract 'email' and 'phone' as LISTS of strings.
    Requirements:
    1. **summary**: A short 2-3 sentence professional summary.
    2. **job_history**: List of jobs (Title, Company, Duration, Description).
    3. **bachelor_year**: Year of Bachelor's graduation (Int).
    4. **experience_years**: Total years of experience, based on actual working years (most propably will be after graduation) (Int).
    5. **personal**: Address, Age, Marital Status, Military Status.
    6. **contact**: Emails, Phones, Social Links.
    7. **skills**: Technical & Soft Skills.
    8. **social_link**: linkedin link extraction, Github, any url refered to in the cv
    
    JSON Structure:
    {
      "name": "Name",
      "summary": "...",
      "email": ["a@b.com"],
      "phone": ["+123456"],
      "address": "City",
      "age": 30,
      "marital_status": "Single / Married / Not Specified",
      "military_status": "Exempt / Not Specified / To be served",
      "bachelor_year": 2015,
      "experience_years": 8,
      "last_job_title": "Title",
      "last_company": "Company",
      "social_links": ["http://linkedin.com/samuel-toma..."],
      "skills": ["Python", "Java"],
      "education": [{ "school": "MIT", "degree": "BSc", "year": "2015" }],
      "job_history": [{ "title": "Dev", "company": "Google", "duration": "2020-Present", "description": "..." }]
    }
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
            
            logger.debug("Calling OpenAI for '%s' using model %s", filename, OPENAI_MODEL)
            completion = client.chat.completions.create(**kwargs)
            raw = completion.choices[0].message.content
            logger.debug("Raw response received for '%s' (%d chars)", filename, len(raw or ""))
            data = json.loads(repair_json(raw))
            
            # Normalize Contact
            logger.debug("Normalizing contact info for '%s'", filename)
            data["email"] = clean_contact_field(data.get("email") or data.get("emails"))
            data["phone"] = clean_contact_field(data.get("phone") or data.get("phones"))
            if "skills" in data: data["skills"] = clean_contact_field(data["skills"])
            if "social_links" in data: data["social_links"] = clean_contact_field(data["social_links"])
            
            # Normalize Nested Structures
            logger.debug("Normalizing nested structures for '%s'", filename)
            data["job_history"] = normalize_job_history(data.get("job_history", []))
            data["education"] = normalize_education(data.get("education", []))

            logger.info("Parsed CV '%s' successfully. Keys: %s", filename, list(data.keys()))
            return data
        except Exception as e:
            logger.error("OpenAI Error while parsing CV '%s': %s", filename, e)
            return {}
    return {}
