from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.models import User, Company, UserRole
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
client = AsyncOpenAI(api_key=OPENAI_API_KEY)

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    description: Optional[str] = None
    culture: Optional[str] = None

class ExtractRequest(BaseModel):
    url: str

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
        async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as http_client:
            # Fake user agent to avoid blocking
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}
            resp = await http_client.get(url, headers=headers)
            resp.raise_for_status()
            
        soup = BeautifulSoup(resp.text, "html.parser")
        # Remove script and style elements
        for script in soup(["script", "style", "nav", "footer"]):
            script.decompose()
        text = soup.get_text(separator=" ", strip=True)[:15000] # Limit context
        
        prompt = f"""
        Analyze the following company website text and extract:
        1. description: A short 2-3 sentence summary of what the company does.
        2. industry: The primary industry.
        3. culture: A description of their culture or values if mentioned.
        
        Return JSON format:
        {{
            "description": "...",
            "industry": "...",
            "culture": "..."
        }}
        
        Text:
        {text}
        """
        
        completion = await client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "system", "content": "You are a helpful assistant."}, {"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        
        return json.loads(completion.choices[0].message.content)
        
    except Exception as e:
        logger.error(f"Error extracting info: {e}")
        # Return empty or partial info instead of crashing if possible, but for now error is fine
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
    
    if data.name: company.name = data.name
    if data.website: company.website = data.website
    if data.industry: company.industry = data.industry
    if data.description: company.description = data.description
    if data.culture: company.culture = data.culture
    
    db.commit()
    db.refresh(company)
    return company

@router.get("/profile")
def get_company_profile(current_user: User = Depends(get_current_user)):
    return current_user.company
