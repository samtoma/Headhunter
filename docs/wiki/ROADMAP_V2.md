# 🚀 Headhunter AI - Product Roadmap v2.0

> **Document Version:** 1.0  
> **Created:** 2025-12-04  
> **Status:** Implementation Phase 1 (Foundation)

---

## 📋 Executive Summary

This document outlines the next major evolution of Headhunter AI, transforming it from an ATS into an **Intelligent Recruitment Intelligence Platform**. Version 2.0 introduces advanced features including knowledge graphs, calendar automation, and a completely redesigned interview experience.

---

## 🎯 Feature Overview

| # | Feature | Priority | Complexity | Dependencies |
|---|---------|----------|------------|--------------|
| 1 | [Calendar Integration](#1-calendar-integration) | 🔴 High | High | Interview System |
| 2 | [Google Sign-In](#2-google-sign-in) | ✅ Complete | Medium | Auth System |
| 3 | [Interview Redesign](#3-interview-redesign) | 🔴 High | High | None |
| 4 | [GraphRAG & Skills Matrix](#4-graphrag--skills-matrix) | 🟡 Medium | Very High | ChromaDB |
| 5 | [Auto Interview Invitations](#5-auto-interview-invitations) | 🔴 High | Medium | Calendar, Interview |
| 6 | [Advanced Admin Dashboard](#6-advanced-admin-dashboard) | 🟡 Medium | High | Analytics |
| 7 | [Pipeline-Interview Merge](#7-pipeline-interview-merge) | 🔴 High | High | Interview Redesign |
| **8** | **[Role-Based Permissions](#8-role-based-permissions)** | **🔄 In Progress** | **Medium** | **User Model** |
| **2** | **[Google Sign-In](#2-google-sign-in)** | **✅ Complete** | **Medium** | **Auth System** |

---

## 1. Calendar Integration

### 1.1 Overview

Full two-way calendar synchronization with Google Calendar and Microsoft Outlook/365.

### 1.2 Capabilities

- **Read Access:** View existing calendar events to find available slots
- **Write Access:** Create interview events with all relevant details
- **Sync:** Real-time sync of event updates (reschedule, cancel)
- **Availability:** Smart slot detection across multiple calendars

### 1.3 Technical Approach

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Headhunter     │────▶│  Calendar Service│────▶│ Google Calendar │
│  Backend        │     │  (Abstraction)   │     │ Microsoft Graph │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

**Backend Components:**

- `app/services/calendar_service.py` - Abstract calendar interface
- `app/services/google_calendar.py` - Google Calendar API integration
- `app/services/microsoft_calendar.py` - Microsoft Graph API integration
- `app/api/v1/calendars.py` - REST endpoints

**Database Schema:**

```sql
CREATE TABLE calendar_connections (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    provider ENUM('google', 'microsoft'),
    access_token TEXT ENCRYPTED,
    refresh_token TEXT ENCRYPTED,
    calendar_id VARCHAR(255),
    sync_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### 1.4 User Stories

- [ ] As a recruiter, I can connect my Google Calendar to Headhunter
- [ ] As a recruiter, I can connect my Microsoft 365 Calendar
- [ ] As a recruiter, I can see my availability when scheduling interviews
- [ ] As a recruiter, interview events automatically appear on my calendar
- [ ] As a hiring manager, I receive calendar invitations for interviews

### 1.5 Security Considerations

- OAuth 2.0 tokens stored encrypted (AES-256)
- Automatic token refresh with secure rotation
- Minimal scope requests (calendars only)
- Audit logging for all calendar operations

---

## 2. Google Sign-In

### 2.1 Overview

✅ **IMPLEMENTED** - Google OAuth 2.0 authentication is now fully integrated alongside Microsoft SSO.

### 2.2 Capabilities

- One-click "Sign in with Google" button
- Automatic account linking for existing users (by email)
- New user creation with Google profile data
- Support for Google Workspace domains

### 2.3 Technical Approach

**Backend Components:**

- `app/api/v1/sso_google.py` - Google OAuth endpoints
- `app/services/google_auth.py` - Google OAuth service
- Update `app/models/models.py` - Add `sso_provider` field

**Flow:**

```
User → Frontend → Google OAuth → Backend → JWT Token → Dashboard
```

**Database Changes:**

```sql
ALTER TABLE users ADD COLUMN sso_provider VARCHAR(20);
ALTER TABLE users ADD COLUMN google_id VARCHAR(255);
```

### 2.4 User Stories

- [ ] As a new user, I can sign up using my Google account
- [ ] As an existing user, I can link my Google account
- [ ] As a Google Workspace user, my company is auto-detected

---

## 3. Interview Redesign

### 3.1 Overview

Complete reimagining of the interview workflow with a modern, visual timeline and enhanced feedback system.

### 3.2 Current Problems

- Interview timeline is basic and hard to follow
- Feedback forms are too simple
- No visual connection between interview stages
- Limited metrics and insights

### 3.3 New Design Vision

#### 3.3.1 Visual Timeline

```
┌─────────────────────────────────────────────────────────────────────┐
│  📅 Interview Journey - John Smith (Senior Developer)               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ●═══════●═══════●═══════○═══════○                                 │
│  │       │       │       │       │                                 │
│ Screen  Tech   Culture  Final  Offer                               │
│ ✅Pass  ✅Pass  🕐Now    ⏳      ⏳                                  │
│ Dec 1   Dec 3   Dec 5                                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### 3.3.2 Enhanced Feedback Form

- **Structured Scorecard:** Predefined competency areas
- **Star Ratings:** 1-5 stars for each competency
- **Pros/Cons:** Bulleted strengths and concerns
- **Recommendation:** Strong Yes / Yes / Maybe / No / Strong No
- **Private Notes:** Manager-only comments
- **Suggested Questions:** For next interviewer

#### 3.3.3 360° Feedback View

- All interviewer feedback in one consolidated view
- Average scores by competency
- Sentiment analysis of written feedback
- Recommendation distribution chart

### 3.4 Database Schema Updates

```sql
CREATE TABLE interview_scorecards (
    id UUID PRIMARY KEY,
    interview_id UUID REFERENCES interviews(id),
    interviewer_id UUID REFERENCES users(id),
    overall_rating INTEGER CHECK (1-5),
    recommendation ENUM('strong_yes', 'yes', 'maybe', 'no', 'strong_no'),
    strengths TEXT[],
    concerns TEXT[],
    private_notes TEXT,
    suggested_questions TEXT[],
    submitted_at TIMESTAMP
);

CREATE TABLE scorecard_competencies (
    id UUID PRIMARY KEY,
    scorecard_id UUID REFERENCES interview_scorecards(id),
    competency_name VARCHAR(100),
    rating INTEGER CHECK (1-5),
    notes TEXT
);

CREATE TABLE interview_stage_templates (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    name VARCHAR(100),
    stage_order INTEGER,
    competencies JSONB,
    default_duration INTEGER, -- minutes
    interviewer_count INTEGER DEFAULT 1
);
```

### 3.5 User Stories

- [ ] As an interviewer, I see a beautiful visual timeline of the candidate's journey
- [ ] As an interviewer, I complete a structured scorecard with competencies
- [ ] As a hiring manager, I see consolidated feedback from all interviewers
- [ ] As a recruiter, I can create custom interview stage templates
- [ ] As an admin, I can define company-wide competency frameworks

---

## 4. GraphRAG & Skills Matrix

### 4.1 Overview

Build an intelligent knowledge graph that maps candidates, skills, projects, and roles. Enable semantic search and visual exploration.

### 4.2 Core Concepts

#### 4.2.1 Knowledge Graph Entities

```
          ┌─────────────┐
          │  CANDIDATE  │
          └──────┬──────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
┌───────┐  ┌─────────┐  ┌──────────┐
│ SKILL │  │ PROJECT │  │ COMPANY  │
└───┬───┘  └────┬────┘  └────┬─────┘
    │           │            │
    │      ┌────┴────┐       │
    │      ▼         ▼       │
    │ ┌────────┐ ┌───────┐   │
    └▶│  ROLE  │ │ TOOL  │◀──┘
      └────────┘ └───────┘
```

#### 4.2.2 Relationship Types

- `CANDIDATE --HAS_SKILL--> SKILL` (with proficiency level)
- `CANDIDATE --WORKED_AT--> COMPANY` (with dates, role)
- `CANDIDATE --WORKED_ON--> PROJECT`
- `SKILL --RELATED_TO--> SKILL` (e.g., React → JavaScript)
- `ROLE --REQUIRES--> SKILL`
- `PROJECT --USES--> TOOL`

### 4.3 Skills Matrix

#### 4.3.1 Candidate Skills Matrix

```
┌─────────────────────────────────────────────────────────────┐
│  Skills Matrix - Engineering Candidates                     │
├──────────────┬────────┬────────┬────────┬────────┬────────┤
│ Candidate    │ Python │ React  │ AWS    │ Docker │ SQL    │
├──────────────┼────────┼────────┼────────┼────────┼────────┤
│ John Smith   │ ████▒  │ ████▒  │ ███▒▒  │ ████▒  │ ████▒  │
│ Jane Doe     │ █████  │ ██▒▒▒  │ ████▒  │ ███▒▒  │ █████  │
│ Bob Wilson   │ ███▒▒  │ █████  │ ██▒▒▒  │ ████▒  │ ███▒▒  │
└──────────────┴────────┴────────┴────────┴────────┴────────┘
```

#### 4.3.2 Role-Skill Mapping

- **Project Manager** → Leadership, Agile, Stakeholder Management, Risk Management
- **Product Manager** → User Research, Roadmap Planning, Analytics, A/B Testing
- Visual mapping of skill gaps for candidates vs. role requirements

### 4.4 Visual Network View

Interactive graph visualization using D3.js or vis.js showing:

- Candidates as nodes (sized by experience)
- Skills as connected nodes (colored by category)
- Edges showing proficiency strength
- Clustering by skill similarity
- Search/filter capabilities

### 4.5 Technical Architecture

```
┌────────────────┐     ┌─────────────────┐     ┌──────────────┐
│ CV Processing  │────▶│ Entity Extractor│────▶│   ChromaDB   │
│ (Parser)       │     │ (GPT-4o)        │     │ (Embeddings) │
└────────────────┘     └─────────────────┘     └──────┬───────┘
                                                      │
                                                      ▼
                       ┌─────────────────┐     ┌──────────────┐
                       │ Graph Builder   │◀────│   Neo4j /    │
                       │ Service         │     │   NetworkX   │
                       └─────────────────┘     └──────────────┘
                                                      │
                                                      ▼
                                               ┌──────────────┐
                                               │ Visual Graph │
                                               │ (D3.js)      │
                                               └──────────────┘
```

**Backend Components:**

- `app/services/graph_service.py` - Knowledge graph operations
- `app/services/entity_extractor.py` - AI-powered entity extraction
- `app/api/v1/graph.py` - Graph query endpoints

### 4.6 Search Capabilities

**Natural Language Queries:**

- "Find React developers with AWS experience"
- "Show candidates similar to John Smith"
- "Who has worked at FAANG companies?"
- "Find project managers with technical background"

### 4.7 User Stories

- [ ] As a recruiter, I can see a visual map of all candidates by skills
- [ ] As a recruiter, I can search "Find Python experts with ML experience"
- [ ] As a recruiter, I can see skill gaps for a candidate vs. a job
- [ ] As an admin, I can define role-skill mappings
- [ ] As a recruiter, I can find candidates similar to a specific person

---

## 5. Auto Interview Invitations

### 5.1 Overview

When an interview is scheduled, automatically send calendar invitations to all participants.

### 5.2 Invitation Rules

| Participant | Attendance | Gets Invite |
|-------------|------------|-------------|
| Interviewer(s) | Mandatory | ✅ Always |
| Hiring Manager | Optional | ✅ If in same department |
| Recruiter | Optional | ✅ If assigned to job |
| Admin | Optional | ✅ If company-wide setting enabled |

### 5.3 Invitation Content

```
Subject: Interview - [Candidate Name] for [Position] - [Stage Name]

📅 [Date & Time]
📍 [Location / Video Link]
👤 Candidate: [Name] - [Current Company]
📋 Position: [Job Title]
🎯 Stage: [Interview Stage]

Preparation Materials:
- Candidate Resume (attached)
- Interview Scorecard Template
- Suggested Questions

Quick Links:
[View Candidate Profile] [Submit Feedback]
```

### 5.4 Technical Implementation

- Leverage Calendar Integration (Feature #1)
- Event triggers on interview creation/update
- Queue-based sending via Celery
- Retry logic for failed invitations
- Tracking for invitation status

### 5.5 User Stories

- [ ] As an interviewer, I receive a calendar invite when assigned
- [ ] As a hiring manager, I get optional invites for my department's interviews
- [ ] As a recruiter, I can customize invitation templates
- [ ] As an admin, I can configure default invitation settings

---

## 6. Advanced Admin Dashboard

### 6.1 Overview

A comprehensive "mission control" dashboard for platform administrators to monitor every action across all companies.

### 6.2 Dashboard Sections

#### 6.2.1 Real-Time Activity Feed

```
┌─────────────────────────────────────────────────────────────────┐
│  🔴 LIVE ACTIVITY FEED                                    🔄    │
├─────────────────────────────────────────────────────────────────┤
│ ● [2s ago] john@acme.com moved "Sarah Connor" to Interview     │
│ ● [5s ago] jane@techcorp.io uploaded 3 new CVs                 │
│ ● [12s ago] admin@startup.com created new job "DevOps Lead"    │
│ ● [30s ago] recruiter@bigco.com scheduled interview            │
│ ● [1m ago] System: AI parsing completed for 15 resumes         │
└─────────────────────────────────────────────────────────────────┘
```

#### 6.2.2 Platform Metrics

- Total users (active/inactive)
- Total companies
- CVs processed (today/week/month/all-time)
- AI API usage and costs
- System health indicators

#### 6.2.3 Company Breakdown

```
┌─────────────────────────────────────────────────────────────────┐
│  COMPANY ANALYTICS                                              │
├─────────────┬─────────┬──────────┬───────────┬─────────────────┤
│ Company     │ Users   │ Jobs     │ Candidates│ Last Activity   │
├─────────────┼─────────┼──────────┼───────────┼─────────────────┤
│ Acme Corp   │ 12      │ 8 active │ 234       │ 2 mins ago      │
│ TechCorp    │ 5       │ 3 active │ 89        │ 1 hour ago      │
│ StartupXYZ  │ 3       │ 2 active │ 45        │ Yesterday       │
└─────────────┴─────────┴──────────┴───────────┴─────────────────┘
```

#### 6.2.4 Audit Log

- Complete action history with filters
- Export to CSV/Excel
- Search by user, company, action type
- Date range filtering

### 6.3 Technical Implementation

**New Audit Service:**

```python
# app/services/audit_service.py
class AuditService:
    async def log_action(
        user_id: UUID,
        company_id: UUID,
        action: str,
        entity_type: str,
        entity_id: UUID,
        details: dict
    )
```

**Database Schema:**

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    user_id UUID REFERENCES users(id),
    company_id UUID REFERENCES companies(id),
    action VARCHAR(50),
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_company ON audit_logs(company_id, timestamp DESC);
```

### 6.4 User Stories

- [ ] As a super admin, I see real-time activity across all companies
- [ ] As a super admin, I can drill down into any company's metrics
- [ ] As a super admin, I can search the audit log for specific actions
- [ ] As a super admin, I can export audit logs for compliance
- [ ] As a super admin, I receive alerts for suspicious activities

---

## 7. Pipeline-Interview Merge

### 7.1 Overview

Unify the Kanban pipeline view with the interview workflow, creating a seamless experience where interview stages ARE the pipeline stages.

### 7.2 Current State vs. New Vision

**Current (Separate Systems):**

```
Pipeline: New → Screening → Interview → Offer → Hired
                              │
                              ▼
Interview: [Separate UI with its own stages]
```

**New (Unified View):**

```
Pipeline + Interviews:
┌─────────┬─────────────┬─────────────┬─────────────┬─────────────┬───────┐
│   New   │  Screening  │  Technical  │   Culture   │    Final    │ Offer │
│         │  Interview  │  Interview  │  Interview  │  Interview  │       │
├─────────┼─────────────┼─────────────┼─────────────┼─────────────┼───────┤
│ [Card]  │   [Card]    │   [Card]    │             │             │       │
│ [Card]  │ ○ Scheduled │ ✓ Passed    │             │             │       │
│ [Card]  │ ● In Review │             │             │             │       │
└─────────┴─────────────┴─────────────┴─────────────┴─────────────┴───────┘
```

### 7.3 Key Changes

#### 7.3.1 Merged Data Model

- Pipeline stages = Interview stages (configurable per job)
- Candidate cards show interview status badges
- Drag-and-drop advances interviews automatically
- Interview scheduling available inline

#### 7.3.2 Enhanced Card View

```
┌─────────────────────────────────────┐
│ 👤 Sarah Connor                     │
│ Senior Developer @ TechCorp         │
├─────────────────────────────────────┤
│ 🎯 Technical Interview              │
│ 📅 Dec 5, 2:00 PM                   │
│ 👥 John (Lead), Mike (Senior)       │
│ ────────────────────────────────    │
│ [View Profile] [Schedule] [Feedback]│
└─────────────────────────────────────┘
```

#### 7.3.3 Inline Actions

- Click card → Candidate drawer with interview timeline
- Quick-schedule dropdown on hover
- Instant feedback submission
- Batch operations for stage advancement

### 7.4 Database Changes

```sql
-- Make pipeline_stages reference interview_stages
ALTER TABLE pipeline_stages ADD COLUMN interview_stage_id UUID REFERENCES interview_stages(id);

-- Or: Merge tables entirely
CREATE TABLE unified_stages (
    id UUID PRIMARY KEY,
    job_id UUID REFERENCES jobs(id),
    name VARCHAR(100),
    stage_type ENUM('non_interview', 'interview'),
    position INTEGER,
    default_duration INTEGER,
    required_interviewers INTEGER DEFAULT 1,
    scorecard_template_id UUID
);
```

### 7.5 User Stories

- [ ] As a recruiter, I see interviews embedded in the pipeline board
- [ ] As a recruiter, I can schedule interviews by dragging to interview columns
- [ ] As a recruiter, candidate cards show interview status at a glance
- [ ] As a hiring manager, I can see all feedback without leaving the board
- [ ] As an admin, I can configure which stages require interviews

---

## 8. Role-Based Permissions

> 📋 **Full documentation:** [ROLE_PERMISSIONS.md](./ROLE_PERMISSIONS.md)

### 8.1 Overview

Implement comprehensive role-based access control (RBAC) with department-scoping for Hiring Managers and Interviewers.

### 8.2 User Roles

| Role | Scope | Default Department |
|------|-------|-------------------|
| **Admin** | Full company access | HR |
| **Recruiter** | Full recruitment access | HR |
| **Hiring Manager** | Own department only | Assigned |
| **Interviewer** | Assigned interviews only | Assigned |
| **Super Admin** | Cross-company global | N/A |

### 8.3 Key Requirements

#### 8.3.1 Team Member Management

| Who is Adding | Can Add | Default Dept Assignment |
|---------------|---------|------------------------|
| Admin | Any role | Must select |
| Recruiter | Any role | Must select |
| Hiring Manager | Interviewer only | **Auto: own department** |

#### 8.3.2 Department Scoping (Hiring Manager)

- Can ONLY see pipelines/jobs in their department
- Can ONLY see candidates applied to their department jobs
- Can ONLY see interviews for their department
- Can update their department (not create new)
- Can NOT access company settings

#### 8.3.3 Interview-Only Access (Interviewer)

- Can ONLY see their assigned interviews
- Can ONLY access candidate profiles for assigned interviews
- Can NOT see salary information (masked)
- Can NOT access pipelines, search, or analytics

### 8.4 Technical Implementation

**Backend Changes:**

- Add department-scoped query filters
- Add role-based endpoint guards
- Auto-assign department on user invite

**Frontend Changes:**

- Conditional UI rendering by role
- Department filter for Hiring Managers
- Salary masking for Interviewers

### 8.5 User Stories

- [ ] As an Admin, I can add any team member with any role
- [ ] As a Recruiter, I can add team members (must assign dept)
- [ ] As a Hiring Manager, I can add interviewers (auto-assigned to my dept)
- [ ] As a Hiring Manager, I only see my department's data
- [ ] As an Interviewer, I only see my assigned interviews
- [ ] As an Interviewer, salary information is hidden from me

---

## 📅 Implementation Phases

### Phase 1: Foundation (Weeks 1-4)

- [x] Google Sign-In **COMPLETED**
- [x] Frontend Test Stability & CI Fixes **COMPLETED**
- [ ] Database schema updates for all features
- [x] Audit logging infrastructure **COMPLETED**
- [ ] **Role-Based Permissions (Feature #8)**
  - [ ] Team member invite with auto-department assignment
  - [ ] Hiring Manager department-scoped data filtering
  - [ ] Recruiter view-only restrictions for settings
  - [ ] Interviewer salary masking

### Phase 2: Calendar & Invitations (Weeks 5-8)

- [ ] Google Calendar Integration
- [ ] Microsoft Calendar Integration
- [ ] Auto Interview Invitations

### Phase 3: Interview Redesign (Weeks 9-12)

- [ ] New interview timeline UI
- [ ] Enhanced scorecard system
- [ ] Pipeline-Interview merge

### Phase 4: Intelligence (Weeks 13-16)

- [ ] GraphRAG entity extraction
- [ ] Skills matrix
- [ ] Visual knowledge graph
- [ ] Semantic search

### Phase 5: Admin & Polish (Weeks 17-20)

- [ ] Advanced admin dashboard
- [ ] Real-time activity feed
- [ ] Final integrations and polish

---

## 📌 GitHub Backlog Structure

Each feature should be created as a GitHub Epic with child issues:

```
Epic: [FEAT-001] Calendar Integration
├── Issue: [FEAT-001-1] Google Calendar OAuth Setup
├── Issue: [FEAT-001-2] Microsoft Graph API Integration
├── Issue: [FEAT-001-3] Calendar Connection UI
├── Issue: [FEAT-001-4] Availability Detection
└── Issue: [FEAT-001-5] Event Sync Service
```

---

## 🏷️ Labels for GitHub

| Label | Color | Description |
|-------|-------|-------------|
| `epic` | #5319E7 | Major feature container |
| `feature` | #1D76DB | New functionality |
| `enhancement` | #A2EEEF | Improvement to existing |
| `backend` | #FBCA04 | Backend changes |
| `frontend` | #0E8A16 | Frontend changes |
| `database` | #D93F0B | Schema changes |
| `ai` | #7057FF | AI/ML related |
| `security` | #B60205 | Security related |

---

*Document maintained by Headhunter AI Engineering Team*
