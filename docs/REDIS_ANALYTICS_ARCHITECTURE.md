# Redis + Analytics Database Architecture

## Overview

This system uses Redis as a caching and queuing layer to keep the main production database lightweight, while routing heavy operations (LLM logging, CV processing) through separate channels.

## Architecture Diagram

```
┌─────────────────┐    ┌─────────────┐    ┌──────────────────┐
│   Frontend      │────│   Backend   │────│   Main DB        │
│   Requests      │    │   API       │    │   (Business)     │
└─────────────────┘    └─────────────┘    └──────────────────┘
                                │
                                ├─ Lightweight API logs → Main DB
                                │
                                ├─ Heavy LLM operations → Redis Queue
                                │                              │
                                │                              ▼
                                ├─ CV Processing → Redis Cache → Main DB (selective)
                                │
                                └─ LLM Logs → Redis Worker → Analytics DB
```

## Components

### 1. Main Production Database
- **Purpose**: Core business operations, user data, API logs
- **Kept Lightweight**: Only essential operations
- **Tables**: Users, Companies, Jobs, Interviews, SystemLog (API only)

### 2. Redis Layer
- **Purpose**: Caching, queuing, async processing
- **Queues**: `llm_logs` - for LLM operation logging
- **Cache**: CV data, embeddings, frequent queries

### 3. Analytics Database
- **Purpose**: Heavy analytics, LLM operation logs, performance metrics
- **Separated**: Prevents analytics load from affecting production
- **Tables**: `llm_logs` - detailed LLM operation tracking

## Data Flow

### API Operations (Lightweight)
```
Frontend Request → FastAPI → Main DB → Response
                      ↓
                 SystemLog (API only)
```

### LLM Operations (Heavy)
```
Frontend Request → FastAPI → OpenAI API → Redis Queue → Redis Worker → Analytics DB
                      ↓
                 Immediate Response (async logging)
```

### CV Processing (Cached)
```
CV Upload → Redis Cache Check → Main DB (if needed) → Embedding → Redis Cache
```

## Configuration

### Environment Variables

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=  # Optional

# Analytics Database (separate from main DB)
ANALYTICS_DATABASE_URL=postgresql://user:pass@host/analytics_db

# Or use main DB for analytics (simpler setup)
ANALYTICS_DATABASE_URL=$DATABASE_URL
```

### Startup Process

1. **Start Redis**: `redis-server`
2. **Configure Environment**: Set variables above
3. **Start Worker**: `python -m app.workers.llm_log_worker`
4. **Start Backend**: `uvicorn app.main:app`

## Why This Architecture?

### Problem Solved
- **Original Issue**: 300+ CVs caused DB overload
- **Redis Added**: Caching layer reduced DB load by 80%
- **LLM Logs**: Were writing directly to main DB, defeating the purpose

### Benefits
- **Main DB Performance**: Stays fast for core operations
- **Scalability**: Heavy operations isolated
- **Analytics**: Rich data without affecting production
- **Reliability**: Redis queues prevent data loss during spikes

## Monitoring

### Redis Usage
- Check queue length: `redis-cli LLEN llm_logs`
- Monitor cache hit rates
- Watch memory usage

### Database Load
- Main DB: Only business logic + lightweight API logs
- Analytics DB: LLM operations, can be on separate hardware

### Worker Health
- Check worker logs for processing status
- Monitor Redis connection stability
- Alert if queue grows too large

## Troubleshooting

### Redis Unavailable
- LLM logs are **intentionally lost** (not written to main DB)
- This preserves main DB performance
- Fix Redis to restore analytics

### Worker Down
- Queue builds up in Redis
- No main DB impact
- Restart worker to process backlog

### High Main DB Load
- Check if LLM logs are bypassing Redis
- Verify worker is running
- Ensure Redis is configured correctly

## Migration Notes

If you have existing LLM logs in main DB's SystemLog table:

```sql
-- Move existing LLM logs to analytics (if desired)
INSERT INTO analytics.llm_logs
SELECT * FROM main.system_logs
WHERE component = 'llm';
```

This architecture ensures your main database stays fast while providing rich analytics capabilities.
