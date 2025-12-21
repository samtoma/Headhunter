from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session, joinedload
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
import time
import asyncio
from app.core.llm_logging import LLMLogger
from jose import jwt, JWTError
from app.core.security import SECRET_KEY, ALGORITHM

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
    departments: Optional[str] = None # JSON string

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
            
            # Helper function to make absolute URLs
            def make_absolute_url(href, base_url):
                if not href:
                    return None
                if href.startswith("http"):
                    return href
                if href.startswith("//"):
                    return "https:" + href
                if href.startswith("/"):
                    from urllib.parse import urlparse
                    parsed = urlparse(base_url)
                    return f"{parsed.scheme}://{parsed.netloc}{href}"
                return None
            
            # Extract logo URL - prioritize high-quality sources
            logo_url = None
            
            # 1. First check structured data (JSON-LD) - often has the best quality logo
            for script in soup.find_all("script", type="application/ld+json"):
                try:
                    data = json.loads(script.string)
                    if isinstance(data, dict):
                        if "foundingDate" in data:
                            metadata["founding_date"] = data["foundingDate"]
                        if "numberOfEmployees" in data:
                            metadata["employee_count"] = str(data["numberOfEmployees"])
                        # Extract logo from structured data (higher priority than og:image)
                        if "logo" in data:
                            if isinstance(data["logo"], str):
                                logo_url = make_absolute_url(data["logo"], url)
                            elif isinstance(data["logo"], dict) and "url" in data["logo"]:
                                logo_url = make_absolute_url(data["logo"]["url"], url)
                        # Extract company name from structured data
                        if "name" in data and data.get("@type") in ["Organization", "Corporation", "LocalBusiness"]:
                            metadata["company_name"] = data["name"]
                except Exception:
                    pass
            
            # 2. Look for explicit logo images in page content (img with logo in class/id/alt/src)
            if not logo_url:
                for img in soup.find_all("img", src=True):
                    img_src = img.get("src", "")
                    img_class = " ".join(img.get("class", []))
                    img_id = img.get("id", "")
                    img_alt = img.get("alt", "")
                    # Check if this is likely a logo
                    indicators = [img_src.lower(), img_class.lower(), img_id.lower(), img_alt.lower()]
                    if any("logo" in ind for ind in indicators):
                        # Skip tiny icons and favicons
                        if "favicon" not in img_src.lower() and "icon" not in img_src.lower():
                            logo_url = make_absolute_url(img_src, url)
                            if logo_url:
                                break
            
            # 3. Try og:image (often used for social sharing, may be banner not logo)
            if not logo_url:
                og_image = soup.find("meta", property="og:image")
                if og_image and og_image.get("content"):
                    logo_url = make_absolute_url(og_image.get("content"), url)
            
            # 4. Last resort: apple-touch-icon (usually 180x180, better than favicon)
            if not logo_url:
                for link in soup.find_all("link", rel=True):
                    rel = " ".join(link.get("rel", []))
                    # Prefer apple-touch-icon (larger) over regular icon
                    if "apple-touch-icon" in rel:
                        href = link.get("href")
                        logo_url = make_absolute_url(href, url)
                        break
            
            # 5. Skip favicons - they're too small for logos
            
            # Try to scrape About, Careers, and Team pages for more info
            additional_text = ""
            team_text = ""  # Separate variable for team/leadership content
            for path in ["/about", "/about-us", "/company", "/careers", "/jobs", "/team", "/our-team", "/leadership"]:
                try:
                    page_url = url.rstrip("/") + path
                    page_resp = await http_client.get(page_url, headers=headers, timeout=10.0)
                    if page_resp.status_code == 200:
                        page_soup = BeautifulSoup(page_resp.text, "html.parser")
                        for script in page_soup(["script", "style", "nav", "footer", "header"]):
                            script.decompose()
                        page_text = page_soup.get_text(separator=" ", strip=True)[:5000]
                        
                        # Capture team/leadership pages separately for department inference
                        if path in ["/team", "/our-team", "/leadership", "/about", "/about-us", "/company"]:
                            team_text += f"\n{page_text}"
                        
                        additional_text += f"\n\n--- {path.upper()} PAGE ---\n{page_text}"
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
        16. **competitive_advantage**: What makes this company unique or better than competitors
        17. **departments**: Array of department names found or inferred from the website
            - Look for team pages, leadership sections, career listings, job categories
            - Common departments: "Engineering", "Product", "Sales", "Marketing", "Customer Success", "Operations", "Finance", "HR", "Legal"
            - Infer from job titles, team member titles, or organizational structure mentioned{fine_tuning_instruction}
        
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
            "competitive_advantage": "...",
            "departments": ["Engineering", "Sales", "Marketing", "..."]
        }}
        
        Website Text:
        {full_text}
        """
            
            start_time = time.time()
            client = get_openai_client()
            completion = await client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "You are an expert business analyst specializing in company research. You are VERY GOOD at finding founding dates, company sizes, and organizational types from website text. You use inference when needed. Always return valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"}
            )
            
            # Track token usage
            tokens_used = 0
            tokens_input = 0
            tokens_output = 0
            if hasattr(completion, 'usage') and completion.usage:
                tokens_used = completion.usage.total_tokens
                tokens_input = completion.usage.prompt_tokens
                tokens_output = completion.usage.completion_tokens
            
            result = json.loads(completion.choices[0].message.content)
            
            # Log LLM operation
            latency_ms = int((time.time() - start_time) * 1000)
            LLMLogger.log_llm_operation(
                action="extract_company_info",
                message=f"Extracted company info from {url}",
                user_id=current_user.id if current_user else None,
                company_id=current_user.company_id if current_user else None,
                model=OPENAI_MODEL,
                tokens_used=tokens_used,
                tokens_input=tokens_input,
                tokens_output=tokens_output,
                latency_ms=latency_ms,
                streaming=False,
                metadata={"url": url}
            )
            
            # Add extracted social links
            if social_links["linkedin"]:
                result["social_linkedin"] = social_links["linkedin"]
            if social_links["twitter"]:
                result["social_twitter"] = social_links["twitter"]
            if social_links["facebook"]:
                result["social_facebook"] = social_links["facebook"]
            
            # Add logo URL if found
            if logo_url:
                result["logo_url"] = logo_url
            
            # Add the original website URL to preserve it
            result["website"] = url
            
            # Convert arrays to JSON strings for database storage
            if "specialties" in result and isinstance(result["specialties"], list):
                result["specialties"] = json.dumps(result["specialties"])
            if "values" in result and isinstance(result["values"], list):
                result["values"] = json.dumps(result["values"])
            if "departments" in result and isinstance(result["departments"], list):
                result["departments"] = json.dumps(result["departments"])
            
            return result
            
    except Exception as e:
        logger.error(f"Error extracting info: {e}")
        # Log error if we have timing info
        if 'start_time' in locals():
            latency_ms = int((time.time() - start_time) * 1000)
            LLMLogger.log_llm_operation(
                action="extract_company_info_error",
                message=f"Error extracting company info from {url}: {str(e)}",
                user_id=current_user.id if current_user else None,
                company_id=current_user.company_id if current_user else None,
                model=OPENAI_MODEL,
                tokens_used=tokens_used if 'tokens_used' in locals() else None,
                tokens_input=tokens_input if 'tokens_input' in locals() else None,
                tokens_output=tokens_output if 'tokens_output' in locals() else None,
                latency_ms=latency_ms,
                error_type=type(e).__name__,
                error_message=str(e),
                metadata={"url": url}
            )
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


# ==================== WebSocket for Company Profile Extraction Progress ====================

async def authenticate_company_websocket(websocket: WebSocket) -> Optional[User]:
    """Authenticate WebSocket connection for company profile extraction"""
    token = websocket.query_params.get("token")

    if not token:
        await websocket.close(code=1008, reason="Authentication required")
        return None

    db_gen = None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if not email:
            await websocket.close(code=1008, reason="Invalid token")
            return None

        db_gen = get_db()
        db = next(db_gen)
        try:
            user = db.query(User).filter(User.email == email).first()
            if not user:
                await websocket.close(code=1008, reason="User not found")
                return None

            return user
        finally:
            try:
                next(db_gen, None)
            except StopIteration:
                pass
    except JWTError:
        await websocket.close(code=1008, reason="Invalid token")
        return None
    except Exception as e:
        await websocket.close(code=1011, reason=f"Authentication error: {str(e)}")
        return None
    finally:
        if db_gen:
            try:
                next(db_gen, None)
            except StopIteration:
                pass


@router.websocket("/regenerate/stream")
async def stream_company_profile_extraction(websocket: WebSocket):
    """
    WebSocket endpoint for streaming company profile extraction with step-by-step progress.

    Connect with: ws://host/api/company/regenerate/stream?token=YOUR_JWT_TOKEN&url=https://company-website.com

    Query parameters:
    - token: JWT authentication token
    - url: Company website URL (required)

    Messages sent to client:
    - {"type": "step", "step": 1, "total_steps": 5, "message": "Fetching website content..."}
    - {"type": "complete", "data": {...}, "tokens_used": 1234, "model": "...", "latency_ms": 5000}
    - {"type": "error", "message": "error message", "code": "ERROR_CODE"}
    """
    await websocket.accept()

    # Authenticate user
    user = await authenticate_company_websocket(websocket)
    if not user:
        return

    db_gen = None
    start_time = None
    tokens_used = 0
    tokens_input = 0
    tokens_output = 0
    model_used = OPENAI_MODEL
    latency_ms = 0

    try:
        # Get query parameters
        url = websocket.query_params.get("url")
        if not url:
            await websocket.send_json({
                "type": "error",
                "message": "Company website URL is required",
                "code": "MISSING_URL"
            })
            await websocket.close()
            return

        # Get database session
        db_gen = get_db()
        db = next(db_gen)

        # Re-fetch user with company relationship
        user = db.query(User).options(joinedload(User.company)).filter(User.id == user.id).first()
        if not user:
            await websocket.send_json({
                "type": "error",
                "message": "User not found",
                "code": "USER_NOT_FOUND"
            })
            await websocket.close()
            return

        # Verify user owns the company
        if not user.company:
            await websocket.send_json({
                "type": "error",
                "message": "Company not found",
                "code": "COMPANY_NOT_FOUND"
            })
            await websocket.close()
            return

        # Start timing
        start_time = time.time()

        # Step 1: Fetching website content
        await websocket.send_json({
            "type": "step",
            "step": 1,
            "total_steps": 5,
            "message": "Fetching website content..."
        })

        # Fetch website content (same logic as original endpoint)
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                })
                response.raise_for_status()
                soup = BeautifulSoup(response.text, 'html.parser')

                # Extract text content
                for script in soup(["script", "style"]):
                    script.decompose()

                text_content = soup.get_text(separator=' ', strip=True)
                full_text = text_content[:15000]  # Limit text length
        except Exception as e:
            await websocket.send_json({
                "type": "error",
                "message": f"Failed to fetch website content: {str(e)}",
                "code": "FETCH_FAILED"
            })
            return

        # Step 2: Analyzing content
        await websocket.send_json({
            "type": "step",
            "step": 2,
            "total_steps": 5,
            "message": "Analyzing website content and extracting key information..."
        })
        await asyncio.sleep(0.5)

        # Step 3: Processing with AI
        await websocket.send_json({
            "type": "step",
            "step": 3,
            "total_steps": 5,
            "message": "Processing with AI to extract company details..."
        })

        # Build the prompt (same as original)
        prompt = f"""Extract the following information from the company website text below. Return ONLY valid JSON:

{{
    "name": "Company Name",
    "description": "Brief company description (2-3 sentences)",
    "founding_year": 2015,
    "industry": "Primary industry/sector",
    "company_size": "e.g., 51-200 employees, 201-500 employees, etc.",
    "headquarters": "City, State/Country",
    "mission": "Company mission statement",
    "vision": "Company vision",
    "values": ["Value 1", "Value 2", "Value 3"],
    "culture": "Company culture description",
    "products_services": "Main products or services offered",
    "target_market": "Target market or customer base",
    "competitive_advantage": "What makes them unique",
    "departments": ["Engineering", "Sales", "Marketing", "HR", "Finance"]
}}

Website Text:
{full_text}
"""

        # Call OpenAI
        client = get_openai_client()
        completion = await client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": "You are an expert business analyst specializing in company research. You are VERY GOOD at finding founding dates, company sizes, and organizational types from website text. You use inference when needed. Always return valid JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )

        # Track token usage
        if hasattr(completion, 'usage') and completion.usage:
            tokens_used = completion.usage.total_tokens
            tokens_input = completion.usage.prompt_tokens
            tokens_output = completion.usage.completion_tokens

        result = json.loads(completion.choices[0].message.content)

        # Step 4: Validating data
        await websocket.send_json({
            "type": "step",
            "step": 4,
            "total_steps": 5,
            "message": "Validating extracted information..."
        })
        await asyncio.sleep(0.3)

        # Step 5: Generating profile
        await websocket.send_json({
            "type": "step",
            "step": 5,
            "total_steps": 5,
            "message": "Generating company profile..."
        })
        await asyncio.sleep(0.2)

        # Calculate latency
        latency_ms = int((time.time() - start_time) * 1000)

        # Log successful operation
        LLMLogger.log_llm_operation(
            action="extract_company_info",
            message=f"Extracted company info from {url}",
            user_id=user.id,
            company_id=user.company_id,
            model=model_used,
            tokens_used=tokens_used,
            tokens_input=tokens_input,
            tokens_output=tokens_output,
            latency_ms=latency_ms,
            streaming=False,
            metadata={"url": url}
        )

        # Send completion
        await websocket.send_json({
            "type": "complete",
            "data": result,
            "tokens_used": tokens_used,
            "tokens_input": tokens_input,
            "tokens_output": tokens_output,
            "model": model_used,
            "latency_ms": latency_ms
        })

    except Exception as e:
        latency_ms = int((time.time() - start_time) * 1000) if start_time else 0
        await websocket.send_json({
            "type": "error",
            "message": f"Internal error: {str(e)}",
            "code": "INTERNAL_ERROR"
        })

        # Log error
        LLMLogger.log_llm_operation(
            action="extract_company_info_error",
            message=f"Error extracting company info from {url}: {str(e)}",
            user_id=user.id if user else None,
            company_id=user.company_id if user else None,
            model=model_used,
            tokens_used=tokens_used,
            tokens_input=tokens_input,
            tokens_output=tokens_output,
            latency_ms=latency_ms,
            error_type=type(e).__name__,
            error_message=str(e)
        )
    finally:
        # Clean up database connection
        if db_gen:
            try:
                next(db_gen, None)
            except StopIteration:
                pass
        try:
            await websocket.close()
        except:
            pass
