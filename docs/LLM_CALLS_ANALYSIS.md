# LLM Calls Analysis & Architecture

## Overview

This document catalogs all LLM (Large Language Model) calls in the Headhunter platform, their types, justifications, and proposed improvements for monitoring and cost tracking.

---

## LLM Call Inventory

### 1. **CV Parsing** (`parse_cv_with_llm`)
- **Location**: `backend/app/services/parser.py`
- **Type**: **Non-Streaming Chat Completion**
- **Model**: `gpt-4o-mini` (configurable via `OPENAI_MODEL`)
- **Endpoint**: Background task (Celery) via `/api/cv/upload` or `/api/cv/{id}/reparse`
- **Justification**:
  - **Why Non-Streaming**: CV parsing requires complete structured JSON output. The entire response must be parsed atomically to extract structured data (name, skills, experience, education, etc.). Streaming would complicate JSON parsing and error handling.
  - **Why Chat Completion**: Requires complex structured extraction with specific formatting rules. JSON mode ensures valid output.
  - **Frequency**: High - triggered on every CV upload
  - **Token Usage**: ~2,000-5,000 tokens per CV (depends on CV length, truncated to 25,000 chars)
- **Current Logging**: ✅ Logged with `action="parse_cv"`, tracks total tokens, latency

---

### 2. **Job Metadata Generation** (`generate_job_metadata`)
- **Location**: `backend/app/services/parser.py`
- **Type**: **Non-Streaming Chat Completion**
- **Model**: `gpt-4o-mini`
- **Endpoint**: `/api/jobs/analyze` (POST)
- **Justification**:
  - **Why Non-Streaming**: Requires complete structured JSON with multiple fields (description, responsibilities, qualifications, benefits, etc.). The entire response must be parsed atomically.
  - **Why Chat Completion**: Complex structured generation with company context, department templates, and fine-tuning instructions.
  - **Frequency**: Medium - triggered when creating/editing job postings
  - **Token Usage**: ~3,000-6,000 tokens per job analysis
- **Current Logging**: ✅ Logged with `action="generate_job_metadata"`, tracks total tokens, latency

---

### 3. **Job Analysis Streaming** (`generate_job_metadata_stream`)
- **Location**: `backend/app/services/ai_job_analysis.py`
- **Type**: **Streaming Chat Completion**
- **Model**: `gpt-4o-mini`
- **Endpoint**: WebSocket `/api/jobs/analyze/stream`
- **Justification**:
  - **Why Streaming**: Provides real-time feedback to users during job analysis generation. Users see progress as the AI generates content, improving UX and perceived performance.
  - **Why Chat Completion**: Same structured output as non-streaming version, but delivered incrementally.
  - **Frequency**: Medium - alternative to non-streaming endpoint
  - **Token Usage**: Same as non-streaming (~3,000-6,000 tokens), but tracked incrementally
- **Current Logging**: ✅ Logged with `action="analyze_job"`, tracks total tokens, latency, streaming=True

---

### 4. **Department Profile Generation** (`generate_department_profile`)
- **Location**: `backend/app/services/parser.py`
- **Type**: **Non-Streaming Chat Completion**
- **Model**: `gpt-4o-mini`
- **Endpoint**: `/api/departments/generate` (POST)
- **Justification**:
  - **Why Non-Streaming**: Requires complete structured JSON with department description, technologies, and job templates. Must be parsed atomically.
  - **Why Chat Completion**: Complex structured generation with company context and fine-tuning.
  - **Frequency**: Low - triggered when creating department profiles
  - **Token Usage**: ~2,000-4,000 tokens per department
- **Current Logging**: ✅ Logged with `action="generate_department_profile"`, tracks total tokens, latency

---

### 5. **Company Profile Extraction** (`extract_company_info`)
- **Location**: `backend/app/api/v1/company.py`
- **Type**: **Non-Streaming Chat Completion**
- **Model**: `gpt-4o-mini`
- **Endpoint**: `/api/company/regenerate` (POST)
- **Justification**:
  - **Why Non-Streaming**: Requires complete structured JSON extraction from website content. Must parse entire response to extract company details (name, mission, values, departments, etc.).
  - **Why Chat Completion**: Complex extraction task requiring structured output with inference capabilities (e.g., inferring company size from context).
  - **Frequency**: Low - triggered when regenerating company profiles from website
  - **Token Usage**: ~5,000-15,000 tokens per extraction (depends on website content length)
- **Current Logging**: ✅ Logged with `action="extract_company_info"`, tracks total tokens, latency

---

### 6. **Interview Feedback Generation** (`generate_interview_feedback_stream`)
- **Location**: `backend/app/services/ai_feedback.py`
- **Type**: **Streaming Chat Completion**
- **Model**: `gpt-4o-mini`
- **Endpoint**: WebSocket `/api/interviews/{id}/generate-feedback/stream`
- **Justification**:
  - **Why Streaming**: Provides real-time feedback during interview feedback generation. Users see the feedback being written in real-time, improving UX and engagement.
  - **Why Chat Completion**: Generates comprehensive, natural-language feedback based on interview data, candidate CV, and job requirements.
  - **Frequency**: Medium - triggered when generating interview feedback
  - **Token Usage**: ~1,500-3,000 tokens per feedback generation
- **Current Logging**: ✅ Logged with `action="generate_feedback"`, tracks total tokens, latency, streaming=True

---

### 7. **Embedding Generation** (`generate_embedding`)
- **Location**: `backend/app/services/embeddings.py`
- **Type**: **Embedding API** (Not Chat Completion)
- **Model**: `text-embedding-3-small` or `text-embedding-ada-002`
- **Endpoint**: Internal - called during CV parsing for vector search
- **Justification**:
  - **Why Embedding API**: Purpose-built for generating dense vector representations for semantic search. More efficient and cost-effective than chat completions for this use case.
  - **Why Not Chat Completion**: Embeddings are numerical vectors, not text. The embedding API is optimized for this task.
  - **Frequency**: High - one embedding per CV upload
  - **Token Usage**: ~500-2,000 tokens per embedding (depends on CV content length)
- **Current Logging**: ❌ **NOT CURRENTLY LOGGED** - Should be added for complete cost tracking

---

## Summary Table

| Operation | Type | Streaming | Frequency | Avg Tokens | Logged | Justification |
|-----------|------|-----------|-----------|------------|--------|---------------|
| CV Parsing | Chat Completion | ❌ | High | 2,000-5,000 | ✅ | Structured extraction requires complete JSON |
| Job Analysis | Chat Completion | ❌ | Medium | 3,000-6,000 | ✅ | Structured generation requires complete JSON |
| Job Analysis (Stream) | Chat Completion | ✅ | Medium | 3,000-6,000 | ✅ | Real-time UX improvement |
| Department Profile | Chat Completion | ❌ | Low | 2,000-4,000 | ✅ | Structured generation requires complete JSON |
| Company Extraction | Chat Completion | ❌ | Low | 5,000-15,000 | ✅ | Complex extraction with inference |
| Interview Feedback | Chat Completion | ✅ | Medium | 1,500-3,000 | ✅ | Real-time UX improvement |
| Embeddings | Embedding API | N/A | High | 500-2,000 | ❌ | **Missing - needs logging** |

---

## Token Usage Breakdown

### Current Tracking
- ✅ Total tokens per operation
- ❌ Input tokens (prompt tokens)
- ❌ Output tokens (completion tokens)
- ❌ Per-company breakdown
- ❌ Cost estimation

### Why Track Input/Output Separately?

1. **Cost Calculation**: OpenAI pricing differs for input vs output tokens:
   - `gpt-4o-mini`: $0.15/$0.60 per 1M tokens (input/output)
   - `gpt-4o`: $5/$15 per 1M tokens (input/output)
   - Output tokens are typically 3-4x more expensive

2. **Optimization**: Understanding input/output ratio helps:
   - Optimize prompts (reduce input tokens)
   - Identify operations with high output token usage
   - Plan for cost scaling

3. **Company Billing**: Per-company token tracking enables:
   - Usage-based billing
   - Cost allocation
   - Fair resource distribution

---

## Proposed Improvements

### 1. Enhanced Token Tracking

**Update `LLMLogger` to track input/output tokens separately:**

```python
LLMLogger.log_llm_operation(
    action="parse_cv",
    tokens_used=5000,  # Total (for backward compatibility)
    tokens_input=3000,  # NEW
    tokens_output=2000,  # NEW
    ...
)
```

**Update metadata structure:**
```json
{
    "tokens_used": 5000,
    "tokens_input": 3000,
    "tokens_output": 2000,
    "model": "gpt-4o-mini",
    "cost_usd": 0.0015  // Calculated based on model pricing
}
```

### 2. Company-Level Filtering & KPIs

**Add company filter to LLM metrics endpoint:**
- Total tokens (input + output) per company
- Input tokens per company
- Output tokens per company
- Cost per company
- Operations count per company
- Average tokens per operation per company

### 3. Separate Database for LLM Logging

**Problem**: LLM logging writes to the main `SystemLog` table, which:
- Can impact production database performance
- Mixes operational logs with LLM analytics
- May cause table bloat over time
- Could slow down other queries

**Solution**: Create dedicated `LLMLog` table in separate database or schema:

**Option A: Separate Database (Recommended)**
- Dedicated PostgreSQL database for analytics
- Async writes via message queue (Redis/RabbitMQ)
- No impact on production database
- Can scale independently

**Option B: Separate Schema**
- Same database, different schema (`analytics.llm_logs`)
- Easier to manage, but still shares database resources
- Good for smaller deployments

**Option C: Time-Series Database**
- Use TimescaleDB (PostgreSQL extension) or InfluxDB
- Optimized for time-series analytics
- Better performance for aggregations
- Built-in retention policies

---

## Implementation Plan

### Phase 1: Enhanced Token Tracking (Immediate)
1. Update `LLMLogger` to accept `tokens_input` and `tokens_output`
2. Extract input/output tokens from OpenAI responses
3. Update all LLM call sites to pass input/output tokens
4. Update metrics endpoint to calculate and display input/output breakdown

### Phase 2: Company Filtering (Immediate)
1. Add company filter to `/api/v1/admin/llm/metrics`
2. Update frontend dashboard to show company selector
3. Display per-company KPIs (tokens, cost, operations)

### Phase 3: Separate Database (Short-term)
1. Create `LLMLog` model in separate database/schema
2. Implement async logging via message queue
3. Migrate existing logs (optional)
4. Update `LLMLogger` to write to new location

### Phase 4: Embedding Logging (Short-term)
1. Add logging to `generate_embedding` function
2. Track embedding tokens and costs
3. Include in metrics dashboard

---

## Cost Estimation

### Current Monthly Estimates (Example)
Assuming:
- 1,000 CV uploads/month: 1,000 × 3,500 tokens = 3.5M tokens
- 500 job analyses/month: 500 × 4,500 tokens = 2.25M tokens
- 200 interview feedbacks/month: 200 × 2,250 tokens = 450K tokens
- 50 company extractions/month: 50 × 10,000 tokens = 500K tokens
- 1,000 embeddings/month: 1,000 × 1,250 tokens = 1.25M tokens

**Total**: ~8M tokens/month

**Cost (gpt-4o-mini)**:
- Input: ~5M tokens × $0.15/1M = $0.75
- Output: ~3M tokens × $0.60/1M = $1.80
- Embeddings: ~1.25M tokens × $0.02/1M = $0.025
- **Total**: ~$2.58/month

**With company breakdown**, you can:
- Identify high-usage companies
- Implement usage-based billing
- Set usage limits per company
- Optimize costs per company

---

## Next Steps

1. ✅ Document all LLM calls (this document)
2. ⏳ Update token tracking to include input/output
3. ⏳ Add company filtering to metrics
4. ⏳ Implement separate database for LLM logs
5. ⏳ Add embedding logging
6. ⏳ Create cost estimation dashboard

