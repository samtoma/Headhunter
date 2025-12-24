"""
AI Job Analysis Streaming Service

Generates job metadata using OpenAI with streaming support.
Provides real-time updates during job analysis.
"""

import json
import os
import time
from typing import AsyncGenerator, Dict, Any
from app.core.logging import get_logger
from app.services.parser import get_openai_client

logger = get_logger(__name__)

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")


async def generate_job_metadata_stream(
    title: str,
    company_context: Dict[str, str] = None,
    fine_tuning: str = None,
    location: str = None,
    employment_type: str = None
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Generate job metadata using OpenAI streaming API.
    
    Yields progress updates and content chunks:
    - {"type": "status", "status": "thinking", "message": "..."}
    - {"type": "status", "status": "analyzing", "message": "..."}
    - {"type": "status", "status": "generating", "message": "..."}
    - {"type": "chunk", "content": "partial JSON text..."}
    - {"type": "complete", "data": {...}, "tokens_used": 1234, "model": "..."}
    - {"type": "error", "message": "error message", "code": "ERROR_CODE"}
    
    Args:
        title: Job title
        company_context: Company information for context
        fine_tuning: Optional fine-tuning instructions
        location: Job location
        employment_type: Employment type (Full-time, Part-time, etc.)
    
    Yields:
        Dict with type, status, content, etc.
    """
    start_time = time.time()
    tokens_used = 0
    tokens_input = 0
    tokens_output = 0
    accumulated_content = ""
    
    try:
        # Send initial status
        yield {
            "type": "status",
            "status": "thinking",
            "message": "Analyzing job requirements..."
        }
        
        # Prepare context
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
        
        yield {
            "type": "status",
            "status": "generating",
            "message": "Generating job description with AI..."
        }
        
        # Call OpenAI with streaming
        client = get_openai_client()
        kwargs = {
            "model": OPENAI_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Generate job description for: {title}"}
            ],
            "stream": True
        }
        if not OPENAI_MODEL.startswith("o1"):
            kwargs["temperature"] = 1.0
            kwargs["response_format"] = {"type": "json_object"}
        
        stream = await client.chat.completions.create(**kwargs)
        
        # Stream the response
        async for chunk in stream:
            if chunk.choices and len(chunk.choices) > 0:
                delta = chunk.choices[0].delta
                if delta.content:
                    accumulated_content += delta.content
                    yield {
                        "type": "chunk",
                        "content": delta.content,
                        "accumulated": accumulated_content
                    }
                
                # Track token usage if available
                if hasattr(chunk, 'usage') and chunk.usage:
                    tokens_used = chunk.usage.total_tokens
                    if hasattr(chunk.usage, 'prompt_tokens'):
                        tokens_input = chunk.usage.prompt_tokens
                    if hasattr(chunk.usage, 'completion_tokens'):
                        tokens_output = chunk.usage.completion_tokens
        
        # Parse the complete JSON
        try:
            result = json.loads(accumulated_content)
            
            # Convert arrays to JSON strings for database storage
            for key in ["responsibilities", "qualifications", "preferred_qualifications", "skills_required", "benefits"]:
                if key in result and isinstance(result[key], list):
                    result[key] = json.dumps(result[key])
            
            # Estimate tokens if not provided
            if tokens_used == 0:
                tokens_used = int(len(accumulated_content.split()) * 1.3)
                # For estimation, assume roughly 10% input tokens, 90% output tokens
                tokens_input = int(tokens_used * 0.1)
                tokens_output = int(tokens_used * 0.9)
            
            latency_ms = int((time.time() - start_time) * 1000)
            
            yield {
                "type": "complete",
                "data": result,
                "tokens_used": tokens_used,
                "tokens_input": tokens_input,
                "tokens_output": tokens_output,
                "model": OPENAI_MODEL,
                "latency_ms": latency_ms
            }
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}")
            yield {
                "type": "error",
                "message": f"Failed to parse AI response: {str(e)}",
                "code": "PARSE_ERROR"
            }
        
    except Exception as e:
        logger.error(f"Error generating job metadata: {e}", exc_info=True)
        yield {
            "type": "error",
            "message": f"Failed to generate job description: {str(e)}",
            "code": "GENERATION_ERROR"
        }

