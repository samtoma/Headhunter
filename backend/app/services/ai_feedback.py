"""
AI Feedback Generation Service

Generates interview feedback using OpenAI with streaming support.
Provides real-time updates during feedback generation.
"""

import json
import os
import time
from typing import AsyncGenerator, Dict, Any, Optional
from openai import AsyncOpenAI
from app.core.logging import get_logger
from app.services.parser import get_openai_client

logger = get_logger(__name__)

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")


async def generate_interview_feedback_stream(
    interview_data: Dict[str, Any],
    candidate_data: Dict[str, Any],
    job_data: Dict[str, Any]
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Generate interview feedback using OpenAI streaming API.
    
    Yields progress updates and content chunks:
    - {"type": "status", "status": "thinking", "message": "..."}
    - {"type": "status", "status": "analyzing", "message": "..."}
    - {"type": "status", "status": "generating", "message": "..."}
    - {"type": "chunk", "content": "partial text..."}
    - {"type": "complete", "feedback": "full feedback", "tokens_used": 1234, "model": "..."}
    - {"type": "error", "message": "error message", "code": "ERROR_CODE"}
    
    Args:
        interview_data: Interview information (step, status, scheduled_at, etc.)
        candidate_data: Candidate CV and parsed data
        job_data: Job posting information
    
    Yields:
        Dict with type, status, content, etc.
    """
    start_time = time.time()
    tokens_used = 0
    tokens_input = 0
    tokens_output = 0
    
    try:
        # Send initial status
        yield {
            "type": "status",
            "status": "thinking",
            "message": "Analyzing interview data..."
        }
        
        # Prepare prompt
        candidate_name = candidate_data.get("name", "Candidate")
        candidate_summary = candidate_data.get("summary", "No summary available")
        candidate_experience = candidate_data.get("experience_years", 0)
        candidate_skills = candidate_data.get("skills", [])
        if isinstance(candidate_skills, str):
            try:
                candidate_skills = json.loads(candidate_skills)
            except:
                candidate_skills = []
        
        job_title = job_data.get("title", "Position")
        job_description = job_data.get("description", "No description available")
        job_requirements = job_data.get("qualifications", [])
        if isinstance(job_requirements, str):
            try:
                job_requirements = json.loads(job_requirements)
            except:
                job_requirements = []
        
        interview_step = interview_data.get("step", "Interview")
        interview_status = interview_data.get("status", "Completed")
        
        # Build system prompt
        system_prompt = """You are an expert interview feedback analyst. Generate comprehensive, professional interview feedback based on the candidate's profile, job requirements, and interview context.

Your feedback should be:
1. **Professional and constructive** - Focus on objective observations
2. **Structured** - Cover technical skills, communication, cultural fit, and overall assessment
3. **Actionable** - Provide specific examples and recommendations
4. **Balanced** - Highlight both strengths and areas for improvement
5. **Concise but thorough** - Aim for 300-500 words

Structure your feedback as follows:
- **Technical Assessment**: Evaluate technical skills and experience relevant to the role
- **Communication Skills**: Assess clarity, articulation, and professional communication
- **Cultural Fit**: Evaluate alignment with company values and team dynamics
- **Overall Assessment**: Summary with recommendation (Pass/Fail/Reschedule)
- **Key Strengths**: 2-3 main strengths
- **Areas for Improvement**: 2-3 areas that need development

Be specific and reference the candidate's background and the job requirements when relevant."""

        # Build user prompt
        user_prompt = f"""Generate interview feedback for the following interview:

**Interview Details:**
- Stage: {interview_step}
- Status: {interview_status}
- Scheduled: {interview_data.get('scheduled_at', 'Not specified')}

**Candidate Profile:**
- Name: {candidate_name}
- Summary: {candidate_summary}
- Years of Experience: {candidate_experience}
- Key Skills: {', '.join(candidate_skills[:10]) if candidate_skills else 'Not specified'}

**Job Requirements:**
- Position: {job_title}
- Description: {job_description[:500]}...
- Required Qualifications: {', '.join(job_requirements[:5]) if job_requirements else 'Not specified'}

Generate comprehensive interview feedback that evaluates the candidate's fit for this role."""

        yield {
            "type": "status",
            "status": "generating",
            "message": "Generating feedback with AI..."
        }
        
        # Get OpenAI client
        client = get_openai_client()
        
        # Stream completion
        accumulated_content = ""
        stream = await client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            stream=True,
            temperature=0.7
        )
        
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
        
        # Get final token count if not available from chunks
        if tokens_used == 0:
            # Make a final call to get usage (or estimate)
            # For now, we'll estimate based on content length
            # In production, you might want to make a non-streaming call to get exact usage
            tokens_used = len(accumulated_content.split()) * 1.3  # Rough estimate
        
        # Calculate latency
        latency_ms = int((time.time() - start_time) * 1000)
        
        # Send completion
        yield {
            "type": "complete",
            "feedback": accumulated_content,
            "tokens_used": int(tokens_used),
            "tokens_input": int(tokens_input),
            "tokens_output": int(tokens_output),
            "model": OPENAI_MODEL,
            "latency_ms": latency_ms
        }
        
    except Exception as e:
        logger.error(f"Error generating interview feedback: {e}", exc_info=True)
        yield {
            "type": "error",
            "message": f"Failed to generate feedback: {str(e)}",
            "code": "GENERATION_ERROR"
        }

