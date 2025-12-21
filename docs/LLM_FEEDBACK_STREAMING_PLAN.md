# LLM Feedback Streaming Implementation Plan

## Overview

This document outlines the plan to implement live streaming LLM feedback generation with proper logging exclusion. The system will provide real-time updates during AI thinking and feedback preparation, while excluding these operations from normal API response logging.

## Current State Analysis

### Current LLM Operations
1. **CV Parsing** (`parse_cv_with_llm`) - Background task, not logged as API response
2. **Job Metadata Generation** (`generate_job_metadata`) - Called during job creation
3. **Department Profile Generation** (`generate_department_profile`) - Called during department creation
4. **Company Info Extraction** - Uses OpenAI for company profiling

### Current Logging Behavior
- All API endpoints are logged via `LoggingMiddleware`
- LLM operations that happen within API endpoints are logged as normal API responses
- No distinction between regular API calls and LLM operations
- No streaming/real-time updates for long-running LLM operations

## Requirements

### 1. Exclude LLM Feedback from Normal Logging
- LLM feedback generation endpoints should not be logged as regular API responses
- Should be logged separately with special component/action tags
- Should track LLM-specific metrics (tokens used, model, latency)

### 2. Live Feedback During LLM Processing
- Show real-time updates during LLM thinking/processing
- Display progress indicators (thinking, analyzing, generating)
- Stream partial responses as they're generated
- Handle errors gracefully with user feedback

## Implementation Plan

### Phase 1: Logging Exclusion & Special Logging

#### 1.1 Update Logging Middleware
**File**: `backend/app/core/logging_middleware.py`

**Changes**:
- Add skip patterns for LLM feedback endpoints (e.g., `/api/interviews/{id}/generate-feedback`)
- Add special logging category for LLM operations
- Track LLM-specific metadata (model, tokens, streaming)

**Implementation**:
```python
# Skip paths for LLM operations (they'll be logged separately)
llm_skip_paths = [
    "/api/interviews/{id}/generate-feedback",
    "/api/interviews/{id}/stream-feedback",
    "/api/ai/feedback/stream"
]

# Special logging for LLM operations
if path.startswith("/api/ai/") or "generate-feedback" in path:
    # Log with special component="llm"
    # Track tokens, model, streaming status
```

#### 1.2 Create LLM-Specific Logging
**File**: `backend/app/core/llm_logging.py` (new)

**Purpose**:
- Dedicated logger for LLM operations
- Tracks: model used, tokens consumed, latency, streaming status
- Separate from regular API logging

### Phase 2: Streaming Backend Implementation

#### 2.1 Create Streaming Feedback Endpoint
**File**: `backend/app/api/v1/interviews.py` (or new `ai_feedback.py`)

**Endpoint**: `POST /api/interviews/{interview_id}/generate-feedback/stream`

**Features**:
- WebSocket or Server-Sent Events (SSE) for streaming
- Real-time progress updates:
  - "thinking" - LLM is processing
  - "analyzing" - Analyzing interview data
  - "generating" - Generating feedback
  - "streaming" - Streaming partial content
- Final complete feedback when done

**Implementation Options**:

**Option A: WebSocket (Recommended)**
- Real-time bidirectional communication
- Can handle multiple concurrent streams
- Better for complex state management

**Option B: Server-Sent Events (SSE)**
- Simpler implementation
- One-way streaming (server → client)
- Good for simple progress updates

**Recommendation**: Use WebSocket for flexibility and future extensibility

#### 2.2 OpenAI Streaming Integration
**File**: `backend/app/services/ai_feedback.py` (new)

**Function**: `generate_interview_feedback_stream(interview_id, candidate_data, job_data)`

**Features**:
- Use OpenAI streaming API (`stream=True`)
- Yield progress updates:
  ```python
  yield {"type": "status", "status": "thinking", "message": "Analyzing interview data..."}
  yield {"type": "status", "status": "generating", "message": "Generating feedback..."}
  yield {"type": "chunk", "content": "The candidate demonstrated..."}
  yield {"type": "complete", "feedback": "Full feedback text"}
  ```
- Handle errors gracefully
- Track token usage

### Phase 3: Frontend Implementation

#### 3.1 Create LLM Feedback Component
**File**: `frontend/src/components/ai/LLMFeedbackGenerator.jsx` (new)

**Features**:
- WebSocket connection for streaming
- Progress indicators:
  - Thinking spinner
  - Status messages
  - Progress bar
- Live text streaming display
- Error handling UI
- Cancel button

**UI States**:
- Idle: "Generate AI Feedback" button
- Connecting: "Connecting to AI..."
- Thinking: "AI is analyzing..."
- Generating: "Generating feedback..." with spinner
- Streaming: Live text appearing
- Complete: Full feedback displayed
- Error: Error message with retry

#### 3.2 Integrate into Interview Mode
**File**: `frontend/src/pages/InterviewMode.jsx`

**Integration**:
- Add "Generate AI Feedback" button
- Show streaming component when generating
- Auto-populate feedback field when complete
- Allow editing after generation

### Phase 4: Database & Tracking

#### 4.1 Add LLM Operation Tracking
**Considerations**:
- Track LLM operations in SystemLog with `component="llm"`
- Store: model, tokens, latency, streaming duration
- Link to interview/user for audit trail

#### 4.2 Optional: LLM Usage Analytics
- Track token usage per user/company
- Cost estimation
- Usage limits (if needed)

## Technical Architecture

### Backend Flow
```
1. User clicks "Generate AI Feedback"
2. Frontend opens WebSocket to /api/interviews/{id}/generate-feedback/stream
3. Backend:
   a. Authenticates WebSocket connection
   b. Fetches interview data
   c. Sends "thinking" status
   d. Calls OpenAI with streaming=True
   e. Streams chunks to frontend
   f. Sends "complete" when done
4. Frontend displays live updates
5. User can accept/edit/cancel
```

### WebSocket Message Format
```json
// Status update
{
  "type": "status",
  "status": "thinking|analyzing|generating|complete|error",
  "message": "Human-readable message",
  "progress": 0.5  // Optional 0-1 progress
}

// Content chunk
{
  "type": "chunk",
  "content": "Partial feedback text...",
  "accumulated": "Full text so far..."
}

// Complete
{
  "type": "complete",
  "feedback": "Complete feedback text",
  "tokens_used": 1234,
  "model": "gpt-4o-mini"
}

// Error
{
  "type": "error",
  "message": "Error message",
  "code": "ERROR_CODE"
}
```

## Implementation Steps

### Step 1: Exclude LLM Endpoints from Normal Logging
1. Update `LoggingMiddleware` to skip LLM endpoints
2. Create special LLM logger
3. Test logging exclusion

### Step 2: Create Streaming Backend
1. Create WebSocket endpoint for feedback generation
2. Implement OpenAI streaming integration
3. Add progress status updates
4. Handle errors gracefully

### Step 3: Create Frontend Components
1. Build `LLMFeedbackGenerator` component
2. Integrate WebSocket client
3. Add UI for streaming display
4. Handle all states (thinking, streaming, complete, error)

### Step 4: Integration & Testing
1. Integrate into InterviewMode
2. Test streaming with various interview data
3. Test error scenarios
4. Verify logging exclusion
5. Performance testing

## Security Considerations

1. **Authentication**: WebSocket must authenticate user
2. **Authorization**: Verify user has access to interview
3. **Rate Limiting**: Prevent abuse of LLM endpoints
4. **Token Limits**: Set reasonable limits on feedback length
5. **Cost Control**: Monitor and limit LLM usage

## Performance Considerations

1. **Concurrent Streams**: Support multiple users generating feedback simultaneously
2. **Connection Pooling**: Efficient WebSocket connection management
3. **Timeout Handling**: Handle long-running LLM operations
4. **Resource Cleanup**: Properly close connections and cleanup resources

## Future Enhancements

1. **Feedback Templates**: Pre-defined feedback templates
2. **Custom Prompts**: Allow users to customize AI prompts
3. **Feedback History**: Track AI-generated feedback for learning
4. **Multi-language Support**: Generate feedback in different languages
5. **Feedback Quality Scoring**: Rate AI-generated feedback quality

## Testing Strategy

1. **Unit Tests**: Test LLM service functions
2. **Integration Tests**: Test WebSocket streaming
3. **E2E Tests**: Test full flow from UI to completion
4. **Load Tests**: Test concurrent streaming connections
5. **Error Scenarios**: Test network failures, API errors, timeouts

## Success Metrics

1. ✅ LLM feedback endpoints excluded from normal API logging
2. ✅ Live updates visible during LLM processing
3. ✅ Streaming feedback appears in real-time
4. ✅ Error handling works gracefully
5. ✅ No performance degradation for other endpoints
6. ✅ Proper resource cleanup

## Timeline Estimate

- **Phase 1** (Logging Exclusion): 2-3 hours
- **Phase 2** (Streaming Backend): 4-6 hours
- **Phase 3** (Frontend): 4-6 hours
- **Phase 4** (Integration & Testing): 3-4 hours

**Total**: ~15-20 hours

---

## Implementation Checklist for New Agent

### ✅ Pre-Implementation
- [x] Plan document created
- [x] Architecture designed
- [x] Requirements documented

### Phase 1: Logging Exclusion
- [ ] Update `backend/app/core/logging_middleware.py`:
  - [ ] Add skip patterns for LLM endpoints (`/api/interviews/{id}/generate-feedback`, `/api/interviews/{id}/stream-feedback`)
  - [ ] Add special logging path for LLM operations
- [ ] Create `backend/app/core/llm_logging.py`:
  - [ ] Create `LLMLogger` class
  - [ ] Track: model, tokens, latency, streaming status
  - [ ] Write to SystemLog with `component="llm"`
- [ ] Test logging exclusion works correctly

### Phase 2: Streaming Backend
- [ ] Create `backend/app/services/ai_feedback.py`:
  - [ ] Implement `generate_interview_feedback_stream()` function
  - [ ] Use OpenAI streaming API (`stream=True`)
  - [ ] Yield progress updates (thinking, analyzing, generating, chunks)
  - [ ] Handle errors gracefully
  - [ ] Track token usage
- [ ] Create WebSocket endpoint in `backend/app/api/v1/interviews.py`:
  - [ ] Add `@router.websocket("/{interview_id}/generate-feedback/stream")`
  - [ ] Authenticate WebSocket connection
  - [ ] Verify user has access to interview
  - [ ] Call streaming service
  - [ ] Forward progress updates to client
  - [ ] Handle disconnections
- [ ] Test streaming with OpenAI API

### Phase 3: Frontend Components
- [ ] Create `frontend/src/components/ai/LLMFeedbackGenerator.jsx`:
  - [ ] WebSocket connection management
  - [ ] State management (idle, connecting, thinking, generating, streaming, complete, error)
  - [ ] Progress indicators UI
  - [ ] Live text streaming display
  - [ ] Error handling UI
  - [ ] Cancel functionality
- [ ] Create `frontend/src/hooks/useLLMFeedback.js` (optional helper hook):
  - [ ] WebSocket connection logic
  - [ ] Message handling
  - [ ] State management
- [ ] Test component in isolation

### Phase 4: Integration
- [ ] Integrate into `frontend/src/pages/InterviewMode.jsx`:
  - [ ] Add "Generate AI Feedback" button
  - [ ] Show `LLMFeedbackGenerator` when generating
  - [ ] Auto-populate feedback field when complete
  - [ ] Allow editing after generation
- [ ] Test full flow end-to-end
- [ ] Test error scenarios
- [ ] Verify logging exclusion
- [ ] Performance testing

### Testing Checklist
- [ ] Unit tests for LLM service
- [ ] Integration tests for WebSocket endpoint
- [ ] E2E tests for full flow
- [ ] Test concurrent streams
- [ ] Test network failures
- [ ] Test API errors
- [ ] Test timeouts
- [ ] Verify logging exclusion
- [ ] Verify resource cleanup

### Files to Create/Modify

**New Files:**
- `backend/app/core/llm_logging.py` - LLM-specific logging
- `backend/app/services/ai_feedback.py` - LLM feedback streaming service
- `frontend/src/components/ai/LLMFeedbackGenerator.jsx` - Frontend component
- `frontend/src/hooks/useLLMFeedback.js` - Optional helper hook

**Files to Modify:**
- `backend/app/core/logging_middleware.py` - Add LLM endpoint exclusions
- `backend/app/api/v1/interviews.py` - Add WebSocket endpoint
- `frontend/src/pages/InterviewMode.jsx` - Integrate LLM feedback generator

### Key Dependencies
- OpenAI Python SDK (already installed)
- FastAPI WebSocket support (already available)
- React WebSocket client (native browser API)

### Important Notes
1. **Authentication**: WebSocket must use JWT token from query params (similar to `/ws/sync`)
2. **Authorization**: Verify user has access to the interview before generating feedback
3. **Error Handling**: All errors should be sent to client with clear messages
4. **Resource Cleanup**: Properly close WebSocket connections and database sessions
5. **Token Tracking**: Track OpenAI token usage for cost monitoring
6. **Rate Limiting**: Consider adding rate limits to prevent abuse

### Example OpenAI Streaming Code
```python
async def generate_feedback_stream(candidate_data, job_data, interview_data):
    client = get_openai_client()
    stream = await client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[...],
        stream=True
    )
    
    async for chunk in stream:
        if chunk.choices[0].delta.content:
            yield {"type": "chunk", "content": chunk.choices[0].delta.content}
```

### Example WebSocket Handler
```python
@router.websocket("/{interview_id}/generate-feedback/stream")
async def stream_feedback_generation(websocket: WebSocket, interview_id: int):
    await websocket.accept()
    user = await authenticate_websocket(websocket)
    # Verify access, then stream...
```

---

## Ready for Implementation

This plan is complete and ready for a new agent to implement. All requirements, architecture, and technical details are documented above.

