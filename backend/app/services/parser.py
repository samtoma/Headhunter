import json
import os
from openai import AsyncOpenAI
import logging
from pathlib import Path
from typing import List, Dict, Any
from pypdf import PdfReader
import docx

logger = logging.getLogger(__name__)


OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

if not OPENAI_API_KEY:
    logger.warning("OPENAI_API_KEY not set. AI features will fail.")

def get_openai_client() -> AsyncOpenAI:
    """Create a new OpenAI client for the current event loop."""
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY not set. Cannot initialize OpenAI client.")
    # Do not cache the client globally because we use asyncio.run() which creates/closes loops.
    # The client's internal httpx session is tied to the loop.
    return AsyncOpenAI(api_key=OPENAI_API_KEY)

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
                        except Exception:
                            continue
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
    if not isinstance(edu, list):
        return json.dumps([])
    
    for e in edu:
        if not isinstance(e, dict):
            continue
        
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

async def generate_job_metadata(
    title: str, 
    company_context: Dict[str, str] = None,
    fine_tuning: str = None,
    location: str = None,
    employment_type: str = None
) -> Dict[str, Any]:
    """Generate comprehensive job description with all details"""
    
    context_str = ""
    if company_context:
        name = company_context.get("name", "Our Company")
        desc = company_context.get("description", "")
        cult = company_context.get("culture", "")
        mission = company_context.get("mission", "")
        values = company_context.get("values", "")
        
        context_str = f"""
HIRING COMPANY CONTEXT:
Company Name: {name}
Description: {desc}
Mission: {mission}
Culture & Values: {cult}
Company Values: {values}

IMPORTANT: Tailor the job description to reflect this company's industry, mission, and values.
"""
    
    fine_tuning_str = ""
    if fine_tuning:
        fine_tuning_str = f"\n\nADDITIONAL CUSTOMIZATION INSTRUCTIONS:\n{fine_tuning}"
    
    location_str = location or "To be determined"
    emp_type_str = employment_type or "Full-time"
    
    system_prompt = f"""You are an expert HR Manager and Job Description Writer.
{context_str}

For the Job Title "{title}" (Location: {location_str}, Type: {emp_type_str}), generate a comprehensive, professional job posting in JSON format.

The job description should be detailed, engaging, and professional - similar to what you'd see on LinkedIn or top company career pages.

Generate the following fields:

1. **description**: A compelling 2-3 paragraph overview of the role (150-200 words). Make it engaging and highlight why this role is exciting.

2. **responsibilities**: Array of 6-8 key responsibilities. Each should be a complete sentence starting with an action verb. Be specific and detailed.

3. **qualifications**: Array of 5-7 required qualifications. Include education, years of experience, specific technical skills, and soft skills.

4. **preferred_qualifications**: Array of 3-5 nice-to-have qualifications that would make a candidate stand out.

5. **skills_required**: Array of exactly 8-10 key technical and soft skills. Keep each skill to 1-2 words (e.g., "Python", "Leadership", "AWS").

6. **required_experience**: Integer representing years of experience needed (e.g., 3, 5, 7).

7. **benefits**: Array of 5-7 benefits offered. If company context includes benefits, use those. Otherwise, generate standard tech industry benefits.

8. **team_info**: A 2-3 sentence description of the team the candidate will join. Make it appealing and specific.

9. **growth_opportunities**: A 2-3 sentence description of career growth and learning opportunities in this role.

10. **application_process**: A brief 2-3 sentence description of what candidates can expect in the hiring process (e.g., "phone screen, technical interview, team interview").

11. **remote_policy**: Description of remote work policy (e.g., "Fully Remote", "Hybrid - 3 days in office", "On-site").

12. **salary_range**: Estimated salary range based on the role and experience level (e.g., "$80,000 - $120,000" or "Competitive salary based on experience").{fine_tuning_str}

Return ONLY valid JSON in this exact format:
{{
    "description": "...",
    "responsibilities": ["Lead the development of...", "Collaborate with..."],
    "qualifications": ["Bachelor's degree in...", "5+ years of experience..."],
    "preferred_qualifications": ["Experience with...", "Previous work in..."],
    "skills_required": ["Python", "React", "AWS", "Leadership"],
    "required_experience": 5,
    "benefits": ["Health insurance", "401k matching", "Unlimited PTO"],
    "team_info": "You'll join a team of...",
    "growth_opportunities": "This role offers...",
    "application_process": "Our process includes...",
    "remote_policy": "Hybrid - 3 days in office, 2 days remote",
    "salary_range": "$100,000 - $140,000"
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
            
            logger.debug("Generating comprehensive job metadata for '%s' using %s", title, OPENAI_MODEL)
            client = get_openai_client()
            completion = await client.chat.completions.create(**kwargs)
            result = json.loads(completion.choices[0].message.content)
            
            # Convert arrays to JSON strings for database storage
            for key in ["responsibilities", "qualifications", "preferred_qualifications", "skills_required", "benefits"]:
                if key in result and isinstance(result[key], list):
                    result[key] = json.dumps(result[key])
            
            return result
        except Exception as e:
            logger.error("OpenAI Error while generating job metadata: %s", e)
            return {}
    return {}


async def parse_cv_with_llm(text: str, filename: str) -> Dict[str, Any]:
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
    4. **experience_years**: Total years of experience, based on actual working years (most propably will be after graduation, you have to count the years spent in each job) (Int).
    5. **personal**: Address, Age, Marital Status, Military Status.
    6. **contact**: Emails, Phones, Social Links.
    7. **skills**: Technical & Soft Skills, the key word should not exceed 2 words.
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
            client = get_openai_client()
            completion = await client.chat.completions.create(**kwargs)
            raw = completion.choices[0].message.content
            logger.debug("Raw response received for '%s' (%d chars)", filename, len(raw or ""))
            data = json.loads(repair_json(raw))
            
            # Normalize Contact
            logger.debug("Normalizing contact info for '%s'", filename)
            data["email"] = clean_contact_field(data.get("email") or data.get("emails"))
            data["phone"] = clean_contact_field(data.get("phone") or data.get("phones"))
            if "skills" in data:
                data["skills"] = clean_contact_field(data["skills"])
            if "social_links" in data:
                data["social_links"] = clean_contact_field(data["social_links"])
            
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
