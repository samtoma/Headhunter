# Logging Database Architecture

## Overview

The logging system uses a **dual-database architecture** to separate high-volume logging data from the main business database. This ensures optimal performance and scalability.

## Database Separation

### Main Database (`headhunter_db`)
- **Purpose:** Business data (Users, Companies, Jobs, Applications, etc.)
- **Managed by:** Alembic migrations
- **Tables:** All business tables including `user_invitations`

### Logs Database (`headhunter_logs`)
- **Purpose:** High-volume logging data (System logs, LLM logs)
- **Managed by:** Worker's `create_tables()` function
- **Tables:** `system_logs`, `llm_logs`
- **Why not Alembic?** 
  - Separate database requires separate Alembic configuration
  - Worker-based creation is simpler for this use case
  - Tables are created automatically when worker starts

## Table Creation Approach

### Main Database Tables

**Migration:** `ccb0d9fd7e5b_add_systemlog_and_userinvitation_models.py`

This migration creates:
- ✅ `user_invitations` table (in main DB)

**Note:** `system_logs` is NOT created here because it belongs to the logs database.

### Logs Database Tables

**Location:** `backend/app/workers/unified_log_worker.py` → `create_tables()`

This function creates:
- ✅ `system_logs` table
- ✅ `llm_logs` table
- ✅ Composite indexes for performance

**Features:**
- Retry logic (5 attempts with 2-second delays)
- Handles transient connection issues
- Creates indexes automatically
- Uses `CREATE INDEX IF NOT EXISTS` for idempotency

## Why This Approach?

### Benefits:
1. **Performance:** Logs don't impact main database performance
2. **Scalability:** Logs database can scale independently
3. **Simplicity:** No need for separate Alembic setup for logs DB
4. **Resilience:** Worker retries table creation on startup

### Trade-offs:
1. **No Migration History:** Logs database schema changes aren't tracked in Alembic
2. **Manual Schema Changes:** Must update worker code for schema changes
3. **Documentation Required:** Approach must be documented (this file)

## Indexes

Composite indexes are created in the worker's `create_tables()` function:

1. **`idx_system_logs_level_created`** - For filtering by level and ordering by date
2. **`idx_system_logs_component_created`** - For filtering by component and ordering by date
3. **`idx_system_logs_errors`** - For error queries (partial index on error_type IS NOT NULL)

These indexes significantly improve query performance for common admin dashboard queries.

## Migration Files

### `ccb0d9fd7e5b_add_systemlog_and_userinvitation_models.py`
- Creates `user_invitations` in main DB
- Does NOT create `system_logs` (belongs to logs DB)

### `3b5f7a8c9d2e_add_composite_indexes_for_system_logs.py`
- No-op migration (documented)
- Indexes are created by worker, not Alembic
- Kept for migration chain integrity

## Configuration

### Environment Variables

```bash
# Main database
DATABASE_URL=postgresql://user:password@db:5432/headhunter_db

# Logs database (REQUIRED)
LOGS_DATABASE_URL=postgresql://user:password@db:5432/headhunter_logs

# Thread pool size for logging operations (optional, default: 2)
LOG_THREAD_POOL_SIZE=2
```

## Health Monitoring

The health check endpoint (`/api/v1/admin/health`) monitors:
- ✅ Logs database connectivity
- ✅ Logs queue depth (Redis `logs_queue`)
- ✅ Log worker process status
- ✅ Recent log write activity

## Best Practices

1. **Always use separate databases** - Never mix logs with business data
2. **Monitor queue depth** - High queue depth indicates worker issues
3. **Check worker status** - Ensure worker process is running
4. **Review logs database size** - Implement retention policies
5. **Test table creation** - Verify worker can create tables on startup

## Troubleshooting

### Tables Not Created
- Check logs database connection string
- Verify worker is running
- Check worker logs for errors
- Ensure database user has CREATE TABLE permissions

### High Queue Depth
- Check if worker is running: `pgrep -f unified_log_worker`
- Check worker logs for errors
- Verify logs database connectivity
- Consider increasing worker instances

### Indexes Missing
- Worker should create indexes automatically
- Check worker startup logs
- Manually create indexes if needed (see worker code for SQL)

## Future Considerations

For production at scale, consider:
1. Separate Alembic setup for logs database
2. Migration versioning for logs database schema
3. Automated schema migration testing
4. Read replicas for logs database queries
5. Partitioning for very high volume

