# Admin Logging & Monitoring Infrastructure Guide

## Overview

This document describes the comprehensive logging and monitoring system implemented in Headhunter AI, including how to view logs, infrastructure options, and best practices.

## Architecture

The logging system consists of three layers:

1. **Application Logging**: Structured JSON logs written to files and console
2. **Database Logging**: System events stored in PostgreSQL (`system_logs` table)
3. **External Aggregation** (Optional): Log aggregation services for advanced analysis

## Current Implementation

### Database-Backed Logging

All system events are stored in the `system_logs` table, which includes:

- **Request/Response Tracking**: All API requests with timing, status codes, IP addresses
- **Error Tracking**: Full stack traces, error types, and context
- **User Actions**: Invitations, logins, CV uploads, etc.
- **Deployment Tracking**: Version and environment information

### Admin Dashboard

Access the admin dashboard at `/admin` (super admin only) to view:

- **Overview**: System metrics, charts, and statistics
- **System Logs**: Filterable log viewer with search
- **Invitations**: Track all user invitations with status
- **Errors**: Recent errors with full stack traces

## Viewing Logs

### Option 1: Admin Dashboard (Recommended)

1. Log in as super admin
2. Navigate to Admin Dashboard
3. Use filters to search logs by:
   - Level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
   - Component (api, celery, auth, etc.)
   - Date range
   - Search text
   - Error status

### Option 2: Direct Database Query

```sql
-- Get recent errors
SELECT * FROM system_logs 
WHERE error_type IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 50;

-- Get logs for a specific user
SELECT * FROM system_logs 
WHERE user_id = 123 
ORDER BY created_at DESC;

-- Get API performance metrics
SELECT 
    http_path,
    AVG(response_time_ms) as avg_time,
    COUNT(*) as request_count,
    SUM(CASE WHEN http_status >= 400 THEN 1 ELSE 0 END) as error_count
FROM system_logs
WHERE component = 'api'
GROUP BY http_path
ORDER BY avg_time DESC;
```

### Option 3: File Logs

Log files are stored in `/app/logs/headhunter.log` (inside Docker container) or `./logs/headhunter.log` (local development).

View logs:
```bash
# Inside Docker container
docker exec headhunter_backend tail -f /app/logs/headhunter.log

# Local development
tail -f logs/headhunter.log
```

## Infrastructure Options for Advanced Logging

### Option 1: Grafana Loki (Recommended for Self-Hosted)

**Best for**: Self-hosted deployments, Docker environments

**Setup**:
1. Add Loki to `docker-compose.yml`:
```yaml
loki:
  image: grafana/loki:latest
  container_name: headhunter_loki
  ports:
    - "3100:3100"
  volumes:
    - ./data/loki:/loki
  command: -config.file=/etc/loki/local-config.yaml

promtail:
  image: grafana/promtail:latest
  container_name: headhunter_promtail
  volumes:
    - ./logs:/var/log/headhunter:ro
    - ./ops/promtail-config.yml:/etc/promtail/config.yml
  command: -config.file=/etc/promtail/config.yml

grafana:
  image: grafana/grafana:latest
  container_name: headhunter_grafana
  ports:
    - "3000:3000"
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=admin
  volumes:
    - ./data/grafana:/var/lib/grafana
```

2. Configure Promtail to read logs:
```yaml
# ops/promtail-config.yml
server:
  http_listen_port: 9080

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: headhunter
    static_configs:
      - targets:
          - localhost
        labels:
          job: headhunter
          __path__: /var/log/headhunter/*.log
```

**Benefits**:
- Lightweight and efficient
- Integrates with Grafana for visualization
- Labels-based querying (LogQL)
- Low resource usage

**Query Example**:
```
{job="headhunter"} |= "ERROR"
{job="headhunter"} | json | level="ERROR"
```

### Option 2: ELK Stack (Elasticsearch, Logstash, Kibana)

**Best for**: Enterprise deployments, complex search requirements

**Setup**:
1. Add ELK stack to `docker-compose.yml`:
```yaml
elasticsearch:
  image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
  environment:
    - discovery.type=single-node
    - xpack.security.enabled=false
  ports:
    - "9200:9200"
  volumes:
    - ./data/elasticsearch:/usr/share/elasticsearch/data

logstash:
  image: docker.elastic.co/logstash/logstash:8.11.0
  volumes:
    - ./logs:/var/log/headhunter:ro
    - ./ops/logstash.conf:/usr/share/logstash/pipeline/logstash.conf
  depends_on:
    - elasticsearch

kibana:
  image: docker.elastic.co/kibana/kibana:8.11.0
  ports:
    - "5601:5601"
  environment:
    - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
  depends_on:
    - elasticsearch
```

2. Configure Logstash:
```ruby
# ops/logstash.conf
input {
  file {
    path => "/var/log/headhunter/*.log"
    codec => json
  }
}

filter {
  json {
    source => "message"
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "headhunter-logs-%{+YYYY.MM.dd}"
  }
}
```

**Benefits**:
- Powerful full-text search
- Rich visualization in Kibana
- Scalable for large deployments
- Advanced analytics

**Query Example**:
```
level:ERROR AND component:api
message:"user_invited" AND company_id:1
```

### Option 3: Cloud Services

#### AWS CloudWatch
- Send logs via AWS SDK
- Automatic retention and archiving
- Integrated with AWS services

#### Datadog
- APM and log management
- Real-time alerting
- Infrastructure monitoring

#### Sentry
- Error tracking and monitoring
- Performance monitoring
- Release tracking

## Recommended Setup for Production

### Minimal Setup (Current)
- Database-backed logging (PostgreSQL)
- Admin dashboard for viewing
- File logs for backup

### Recommended Setup
- **Grafana Loki** for log aggregation
- **Grafana** for visualization and dashboards
- **Database logging** for structured queries
- **File logs** for backup and compliance

### Enterprise Setup
- **ELK Stack** for comprehensive log management
- **Prometheus** for metrics
- **Grafana** for unified dashboards
- **AlertManager** for notifications

## Monitoring Best Practices

### 1. Set Up Alerts

Create alerts for:
- Error rate > 5% in last 5 minutes
- Response time > 1000ms
- Failed invitations
- Database connection errors

### 2. Regular Log Review

- Daily: Check error logs
- Weekly: Review invitation statistics
- Monthly: Analyze performance trends

### 3. Log Retention

- Database logs: 90 days (configurable)
- File logs: 7 days (rotated daily)
- External aggregation: Per service policy

### 4. Security

- Never log passwords or tokens
- Redact sensitive headers (authorization, cookies)
- Restrict admin dashboard access to super admins only

## Troubleshooting User Reports

When a user reports a bug:

1. **Get Context**:
   - User email/ID
   - Approximate time
   - Action they were performing

2. **Search Logs**:
   ```sql
   SELECT * FROM system_logs
   WHERE user_id = <user_id>
     AND created_at >= '<time>'
   ORDER BY created_at DESC;
   ```

3. **Check Errors**:
   - Filter by `error_type IS NOT NULL`
   - Review stack traces
   - Check related requests

4. **Trace Request**:
   - Use `request_id` to trace across services
   - Check response times
   - Verify database queries

## Deployment Tracking

The system automatically tracks:
- Deployment version (from `DEPLOYMENT_VERSION` or `GIT_COMMIT` env var)
- Deployment environment (from `DEPLOYMENT_ENV` env var)

Set these in your deployment:
```bash
export DEPLOYMENT_VERSION=$(git rev-parse --short HEAD)
export DEPLOYMENT_ENV="production"
```

## API Endpoints

### Admin Endpoints (Super Admin Only)

- `GET /api/v1/admin/metrics` - System metrics
- `GET /api/v1/admin/logs` - System logs with filters
- `GET /api/v1/admin/logs/stats` - Log statistics
- `GET /api/v1/admin/invitations` - User invitations
- `GET /api/v1/admin/invitations/stats` - Invitation statistics
- `GET /api/v1/admin/errors` - Recent errors

## Next Steps

1. **Set up Grafana Loki** (recommended for production)
2. **Create custom dashboards** in Grafana
3. **Set up alerts** for critical errors
4. **Configure log retention** policies
5. **Train team** on using admin dashboard

## Support

For questions or issues with the logging system, check:
- Admin dashboard documentation
- API documentation at `/docs`
- Database schema in `backend/app/models/models.py`

