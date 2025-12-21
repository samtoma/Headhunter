# LLM Logging - Separate Database Proposal

## Problem Statement

Currently, LLM operations are logged to the main `SystemLog` table in the production database. This creates several issues:

1. **Performance Impact**: LLM logging writes can slow down production database operations
2. **Table Bloat**: LLM logs accumulate quickly and can bloat the main database
3. **Query Performance**: Mixing operational logs with analytics data can slow down queries
4. **Scalability**: As LLM usage grows, logging overhead increases
5. **Resource Contention**: LLM analytics queries compete with production queries

## Proposed Solutions

### Option A: Separate PostgreSQL Database (Recommended)

**Architecture:**
- Dedicated PostgreSQL database (`headhunter_analytics`) for LLM logs
- Async writes via message queue (Redis/RabbitMQ) or direct async writes
- Separate connection pool
- Can scale independently

**Pros:**
- ✅ Zero impact on production database
- ✅ Can optimize schema specifically for analytics
- ✅ Independent scaling and backups
- ✅ Can use read replicas for analytics queries
- ✅ Easy to archive old data

**Cons:**
- ⚠️ Additional database to manage
- ⚠️ Slightly more complex deployment

**Implementation:**
```python
# New database configuration
ANALYTICS_DATABASE_URL = os.getenv("ANALYTICS_DATABASE_URL", "postgresql://...")

# Separate SQLAlchemy engine
analytics_engine = create_engine(ANALYTICS_DATABASE_URL)
AnalyticsSessionLocal = sessionmaker(bind=analytics_engine)

# Update LLMLogger to use analytics database
class LLMLogger:
    @staticmethod
    def _write_llm_log_sync(...):
        db = AnalyticsSessionLocal()
        # Write to analytics database
```

---

### Option B: Separate Schema (Same Database)

**Architecture:**
- Same PostgreSQL database, different schema (`analytics.llm_logs`)
- Separate connection pool pointing to schema
- Easier to manage than separate database

**Pros:**
- ✅ Easier deployment (no new database)
- ✅ Still isolates analytics from production
- ✅ Can use database-level permissions

**Cons:**
- ⚠️ Still shares database resources (CPU, memory, I/O)
- ⚠️ Backup/restore includes analytics data

**Implementation:**
```python
# Use schema in connection
ANALYTICS_SCHEMA = "analytics"
# Set search_path or use schema-qualified table names
```

---

### Option C: Time-Series Database (TimescaleDB/InfluxDB)

**Architecture:**
- Use TimescaleDB (PostgreSQL extension) or InfluxDB
- Optimized for time-series analytics
- Built-in retention policies
- Better performance for aggregations

**Pros:**
- ✅ Optimized for time-series queries
- ✅ Automatic data retention/compression
- ✅ Better performance for aggregations
- ✅ Built-in downsampling

**Cons:**
- ⚠️ Additional infrastructure complexity
- ⚠️ Learning curve for team
- ⚠️ Migration effort

---

### Option D: Message Queue + Worker (Hybrid)

**Architecture:**
- LLM operations publish to Redis/RabbitMQ
- Background worker consumes and writes to analytics database
- Decouples logging from request handling

**Pros:**
- ✅ Non-blocking writes (best performance)
- ✅ Can batch writes for efficiency
- ✅ Resilient to database outages
- ✅ Can add multiple consumers

**Cons:**
- ⚠️ More moving parts
- ⚠️ Potential message loss if queue fails
- ⚠️ Need to monitor queue depth

**Implementation:**
```python
# Publish to queue
redis_client.lpush("llm_logs", json.dumps(log_data))

# Worker consumes and writes
while True:
    log_data = redis_client.brpop("llm_logs", timeout=1)
    if log_data:
        write_to_analytics_db(log_data)
```

---

## Recommended Approach: Option A + Option D (Hybrid)

**Best of both worlds:**
1. Separate PostgreSQL database for analytics
2. Message queue (Redis) for async writes
3. Background worker to consume and write

**Benefits:**
- Zero impact on production database
- Non-blocking LLM logging
- Resilient and scalable
- Can batch writes for efficiency

---

## Implementation Plan

### Phase 1: Separate Database Setup
1. Create `headhunter_analytics` database
2. Create `LLMLog` model in analytics database
3. Set up separate SQLAlchemy engine and session
4. Update `LLMLogger` to write to analytics database

### Phase 2: Async Queue Integration
1. Set up Redis for message queue
2. Update `LLMLogger` to publish to queue
3. Create background worker to consume queue
4. Implement batching for efficiency

### Phase 3: Migration & Monitoring
1. Migrate existing LLM logs (optional)
2. Set up monitoring for queue depth
3. Add alerts for queue/worker failures
4. Update dashboard to query analytics database

### Phase 4: Optimization
1. Add indexes for common queries
2. Implement data retention policies
3. Set up read replicas for analytics
4. Add caching layer for frequent queries

---

## Database Schema

```sql
CREATE DATABASE headhunter_analytics;

CREATE TABLE llm_logs (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    action VARCHAR(100) NOT NULL,
    message TEXT,
    user_id INTEGER,
    company_id INTEGER,
    interview_id INTEGER,
    model VARCHAR(50),
    tokens_used INTEGER,
    tokens_input INTEGER,
    tokens_output INTEGER,
    cost_usd DECIMAL(10, 6),
    latency_ms INTEGER,
    streaming BOOLEAN DEFAULT FALSE,
    error_type VARCHAR(100),
    error_message TEXT,
    metadata JSONB,
    deployment_version VARCHAR(50),
    deployment_environment VARCHAR(50)
);

-- Indexes for common queries
CREATE INDEX idx_llm_logs_company_id ON llm_logs(company_id);
CREATE INDEX idx_llm_logs_created_at ON llm_logs(created_at);
CREATE INDEX idx_llm_logs_action ON llm_logs(action);
CREATE INDEX idx_llm_logs_model ON llm_logs(model);
CREATE INDEX idx_llm_logs_company_created ON llm_logs(company_id, created_at);

-- Partition by month for better performance (TimescaleDB)
-- SELECT create_hypertable('llm_logs', 'created_at');
```

---

## Cost Estimation

**Current Setup:**
- Production database: Shared resources
- Risk: Performance degradation

**Proposed Setup:**
- Analytics database: ~$50-200/month (depending on size)
- Redis queue: ~$10-50/month
- Worker: Minimal (runs on existing infrastructure)

**Total Additional Cost:** ~$60-250/month

**Benefits:**
- Improved production performance
- Better analytics capabilities
- Scalable architecture
- Cost allocation per company

---

## Migration Strategy

1. **Dual Write Period** (1-2 weeks):
   - Write to both databases
   - Verify data consistency
   - Monitor performance

2. **Cutover**:
   - Switch reads to analytics database
   - Stop writing to production database
   - Archive old logs (optional)

3. **Cleanup**:
   - Remove LLM logs from production database (optional)
   - Update all queries to use analytics database

---

## Monitoring & Alerts

- Queue depth (alert if > 1000 messages)
- Worker health (alert if worker down)
- Database connection pool usage
- Write latency
- Query performance

---

## Next Steps

1. ✅ Document proposal (this document)
2. ⏳ Get approval for separate database
3. ⏳ Set up analytics database
4. ⏳ Implement async logging
5. ⏳ Deploy and monitor

