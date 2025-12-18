# V3 Roadmap: Storage Migration & GDPR Compliance

## 📁 File Storage Migration

### Current State (V1-V2)

- **Storage**: Local folder mounted as Docker volume (`data/raw/`)
- **Path**: `backend/data/raw/{uuid}_{filename}.pdf`
- **Status**: ⚠️ Works for development, not production-ready

### V3 Target: Cloud Object Storage

#### Recommended: Cloudflare R2 or AWS S3

| Feature | Implementation |
|---------|----------------|
| **Upload** | Direct to S3 with presigned POST URLs |
| **Download** | Presigned GET URLs (time-limited, secure) |
| **Security** | Server-side encryption (AES-256) |
| **Backup** | Cross-region replication |

#### Migration Steps

1. **Add `file_storage_provider` config** (env variable)
2. **Create storage abstraction layer** (`app/core/storage.py`)
3. **Implement S3 adapter** with boto3
4. **Update CV upload endpoints** to use abstraction
5. **Add migration script** for existing files
6. **Update `filepath` field** to store S3 keys instead of local paths

#### Files to Modify

- `app/api/v1/cv.py` - Upload logic
- `app/api/v1/public.py` - Landing page uploads
- `app/core/storage.py` - New abstraction layer
- `app/core/config.py` - Add S3 credentials

---

## 🔐 GDPR Compliance Roadmap

### Legal Requirements for Recruitment Platforms

| Requirement | Description | Status |
|-------------|-------------|--------|
| **Consent** | Explicit opt-in before processing | ❌ TODO |
| **Right to Access** | User can download their data | ❌ TODO |
| **Right to Erasure** | "Right to be forgotten" | ❌ TODO |
| **Data Portability** | Export data in standard format | ❌ TODO |
| **Retention Limits** | Auto-delete after period | ❌ TODO |
| **Breach Notification** | 72-hour notification process | ❌ TODO |
| **DPO Designation** | Data Protection Officer | ❌ TODO |

### V3 Implementation Plan

#### Phase 1: Consent Management

```
- [ ] Add consent checkbox to landing page apply form
- [ ] Store consent timestamp in Application.tracking_data
- [ ] Add consent_given boolean to CV model
- [ ] Block processing without consent
```

#### Phase 2: Data Subject Rights

```
- [ ] Create /api/v1/gdpr/export/{email} endpoint
  - Returns all data for a candidate in JSON/ZIP
  - Includes: CV file, parsed data, applications, notes
  
- [ ] Create /api/v1/gdpr/delete/{email} endpoint
  - Hard delete all candidate data
  - Anonymize activity logs (keep for audit)
  - Delete CV file from storage
  
- [ ] Add "Request My Data" link to landing page
- [ ] Add "Delete My Data" link to landing page
```

#### Phase 3: Retention & Auto-Deletion

```
- [ ] Add retention_period_days to Company settings
- [ ] Create background job: purge_expired_candidates
- [ ] Run daily, delete CVs older than retention period
- [ ] Exempt candidates in active processes (status != Rejected)
- [ ] Send notification email before deletion (7 days warning)
```

#### Phase 4: Encryption at Rest

```
- [ ] Enable S3 server-side encryption (SSE-S3 or SSE-KMS)
- [ ] Encrypt PII fields in database (email, phone, address)
- [ ] Use Fernet symmetric encryption for stored data
- [ ] Store encryption keys in AWS Secrets Manager / Vault
```

#### Phase 5: Audit & Logging

```
- [ ] Enhanced ActivityLog for data access events
- [ ] Log who accessed which candidate's data
- [ ] Exportable audit trail for compliance reporting
- [ ] Breach detection alerts (unusual access patterns)
```

---

## 📋 Database Changes for GDPR

### New Fields

```sql
-- CV table
ALTER TABLE cvs ADD COLUMN consent_given BOOLEAN DEFAULT FALSE;
ALTER TABLE cvs ADD COLUMN consent_timestamp TIMESTAMP;
ALTER TABLE cvs ADD COLUMN retention_expires_at TIMESTAMP;
ALTER TABLE cvs ADD COLUMN anonymized BOOLEAN DEFAULT FALSE;

-- Company table  
ALTER TABLE companies ADD COLUMN retention_period_days INTEGER DEFAULT 365;
ALTER TABLE companies ADD COLUMN dpo_email VARCHAR(255);
```

### New Tables

```sql
-- GDPR Requests Log
CREATE TABLE gdpr_requests (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    request_type VARCHAR(50) NOT NULL, -- 'export', 'delete', 'access'
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'failed'
    requested_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    requested_by_ip VARCHAR(50),
    notes TEXT
);
```

---

## 🎯 Priority Order

1. **Storage Migration** - Required for scalability
2. **Consent Collection** - Legal requirement
3. **Export/Delete APIs** - User rights
4. **Retention Automation** - Reduces liability
5. **Encryption** - Enhanced security
6. **Audit Trail** - Compliance proof
