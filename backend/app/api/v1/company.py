from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.models import User, UserRole
from pydantic import BaseModel
from typing import Optional
import httpx
from bs4 import BeautifulSoup
import os
from openai import AsyncOpenAI
import logging
import json

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Company"])

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

# Lazy client initialization
_client = None

def get_openai_client() -> AsyncOpenAI:
    """Get or create the OpenAI client (lazy initialization)"""
    global _client
    if _client is None:
        if not OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY not set. Cannot initialize OpenAI client.")
        _client = AsyncOpenAI(api_key=OPENAI_API_KEY)
        logger.info("AI Engine initialized for company profiling")
    return _client

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    description: Optional[str] = None
    culture: Optional[str] = None
    tagline: Optional[str] = None
    founded_year: Optional[int] = None
    company_size: Optional[str] = None
    headquarters: Optional[str] = None
    company_type: Optional[str] = None
    specialties: Optional[str] = None  # JSON string
    mission: Optional[str] = None
    vision: Optional[str] = None
    values: Optional[str] = None  # JSON string
    products_services: Optional[str] = None
    target_market: Optional[str] = None
    competitive_advantage: Optional[str] = None
    social_linkedin: Optional[str] = None
    social_twitter: Optional[str] = None
    social_facebook: Optional[str] = None
    logo_url: Optional[str] = None

class ExtractRequest(BaseModel):
    url: str
    fine_tuning: Optional[str] = None

@router.post("/extract_info")
async def extract_company_info(
    request: ExtractRequest,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can perform this action")
    
    url = request.url
    if not url.startswith("http"):
        url = "https://" + url
        
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=20.0) as http_client:
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}
            
            # Scrape main page
            resp = await http_client.get(url, headers=headers)
            resp.raise_for_status()
            
            soup = BeautifulSoup(resp.text, "html.parser")
            
            # Extract metadata from page
            metadata = {}
            
            # Try to find founded year in meta tags or structured data
            for meta in soup.find_all("meta"):
                content = meta.get("content", "")
                property_name = meta.get("property", "") or meta.get("name", "")
                if "found" in property_name.lower() or "establish" in property_name.lower():
                    metadata["founded_hint"] = content
            
            # Look for structured data (JSON-LD)
            for script in soup.find_all("script", type="application/ld+json"):
                try:
                    data = json.loads(script.string)
                    if isinstance(data, dict):
                        if "foundingDate" in data:
                            metadata["founding_date"] = data["foundingDate"]
                        if "numberOfEmployees" in data:
                            metadata["employee_count"] = str(data["numberOfEmployees"])
                except Exception:
                    pass
            
            # Try to scrape About and Careers pages for more info
            additional_text = ""
            for path in ["/about", "/about-us", "/company", "/careers", "/jobs"]:
                try:
                    about_url = url.rstrip("/") + path
                    about_resp = await http_client.get(about_url, headers=headers, timeout=10.0)
                    if about_resp.status_code == 200:
                        about_soup = BeautifulSoup(about_resp.text, "html.parser")
                        for script in about_soup(["script", "style", "nav", "footer", "header"]):
                            script.decompose()
                        about_text = about_soup.get_text(separator=" ", strip=True)[:5000]
                        additional_text += f"\n\n--- {path.upper()} PAGE ---\n{about_text}"
                        break  # Just use first successful page
                except Exception:
                    continue
            
            # Remove script and style elements from main page
            for script in soup(["script", "style", "nav", "footer"]):
                script.decompose()
            text = soup.get_text(separator=" ", strip=True)[:20000]
            
            # Combine main text with additional pages
            full_text = text + additional_text
            
            # Extract social media links from page
            social_links = {
                "linkedin": None,
                "twitter": None,
                "facebook": None
            }
            for link in soup.find_all("a", href=True):
                href = link["href"]
                if "linkedin.com" in href and not social_links["linkedin"]:
                    social_links["linkedin"] = href
                elif ("twitter.com" in href or "x.com" in href) and not social_links["twitter"]:
                    social_links["twitter"] = href
                elif "facebook.com" in href and not social_links["facebook"]:
                    social_links["facebook"] = href
            
            fine_tuning_instruction = ""
            if request.fine_tuning:
                fine_tuning_instruction = f"\n\nADDITIONAL INSTRUCTIONS: {request.fine_tuning}"
            
            metadata_hints = ""
            if metadata:
                metadata_hints = f"\n\nMETADATA HINTS FOUND: {json.dumps(metadata)}"
            
            prompt = f"""
        Analyze the following company website text and extract comprehensive information in JSON format.
        
        CRITICAL INSTRUCTIONS:
        - BE VERY AGGRESSIVE about finding founding year, company size, and company type
        - Look for phrases like "Founded in", "Est. 2020", "Since 2015", "Established"
        - For company size, look for "X employees", "team of X", "X+ people", "join our team of X"
        - If you find ANY hints about these fields, use them - don't return null
        - Use reasonable inference: if they say "startup" they're likely 1-50 employees and Private
        - If they say "enterprise" or "Fortune 500" they're likely 1000+ and Public/Private
        - Check LinkedIn URLs for company size hints{metadata_hints}
        
        Extract the following fields (ONLY use null if you absolutely cannot find or infer the information):
        
        1. **name**: Company name
        2. **tagline**: A short, catchy tagline (1 sentence max)
        3. **description**: A comprehensive 2-3 paragraph description of what the company does
        4. **industry**: Primary industry (e.g., "Technology", "Healthcare", "Finance", "E-commerce")
        5. **founded_year**: Year the company was founded (integer) - SEARCH THOROUGHLY for this
        6. **company_size**: Employee count range - INFER if needed based on context
           - Use: "1-10", "11-50", "51-200", "201-500", "501-1000", or "1000+"
        7. **headquarters**: Location of headquarters (City, Country)
        8. **company_type**: Type of company - INFER from context if not explicit
           - Options: "Private", "Public", "Startup", "Non-profit", "Government"
           - Hints: "startup"=Startup, "inc."/"corp"=Private, "IPO"/"stock"=Public
        9. **specialties**: Array of 3-7 key specialties or focus areas
        10. **mission**: Mission statement (what they aim to achieve)
        11. **vision**: Vision statement (where they want to be in the future)
        12. **values**: Array of 3-5 core company values
        13. **culture**: Description of company culture and work environment
        14. **products_services**: Detailed description of main products and services
        15. **target_market**: Description of target customers/market
        16. **competitive_advantage**: What makes this company unique or better than competitors{fine_tuning_instruction}
        
        Return ONLY valid JSON in this exact format:
        {{
            "name": "...",
            "tagline": "...",
            "description": "...",
            "industry": "...",
            "founded_year": 2020,
            "company_size": "51-200",
            "headquarters": "San Francisco, USA",
            "company_type": "Private",
            "specialties": ["...", "...", "..."],
            "mission": "...",
            "vision": "...",
            "values": ["...", "...", "..."],
            "culture": "...",
            "products_services": "...",
            "target_market": "...",
            "competitive_advantage": "..."
        }}
        
        Website Text:
        {full_text}
        """
            
            client = get_openai_client()
            completion = await client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "You are an expert business analyst specializing in company research. You are VERY GOOD at finding founding dates, company sizes, and organizational types from website text. You use inference when needed. Always return valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            
            result = json.loads(completion.choices[0].message.content)
            
            # Add extracted social links
            if social_links["linkedin"]:
                result["social_linkedin"] = social_links["linkedin"]
            if social_links["twitter"]:
                result["social_twitter"] = social_links["twitter"]
            if social_links["facebook"]:
                result["social_facebook"] = social_links["facebook"]
            
            # Convert arrays to JSON strings for database storage
            if "specialties" in result and isinstance(result["specialties"], list):
                result["specialties"] = json.dumps(result["specialties"])
            if "values" in result and isinstance(result["values"], list):
                result["values"] = json.dumps(result["values"])
            
            return result
            
    except Exception as e:
        logger.error(f"Error extracting info: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to extract info: {str(e)}")

@router.put("/profile")
def update_company_profile(
    data: CompanyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can update company profile")
    
    company = current_user.company
    
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Update all fields
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(company, key, value)
    
    db.commit()
    db.refresh(company)
    return company

@router.get("/profile")
def get_company_profile(current_user: User = Depends(get_current_user)):
    return current_user.company

@router.post("/regenerate")
async def regenerate_company_profile(
    request: ExtractRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Regenerate company profile from website with optional fine-tuning"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can perform this action")
    
    # Extract new data
    extracted_data = await extract_company_info(request, current_user)
    
    # Update company profile
    company = current_user.company
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    for key, value in extracted_data.items():
        if value is not None:
            setattr(company, key, value)
    
    db.commit()
    db.refresh(company)
    return company
