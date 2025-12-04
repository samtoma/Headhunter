# 🚀 Headhunter AI v2.0 - GitHub Backlog

This file contains pre-written GitHub issue descriptions for the v2.0 roadmap features. Copy and paste these to create issues.

---

## Epic 1: Calendar Integration

### [FEAT-001] Calendar Integration Epic

**Labels:** `epic`, `v2.0`, `backend`, `frontend`

#### Summary

Full two-way calendar synchronization with Google Calendar and Microsoft Outlook/365 for seamless interview scheduling.

#### Goals

- [ ] Enable Google Calendar OAuth connection
- [ ] Enable Microsoft 365 Calendar connection
- [ ] Support real-time event sync
- [ ] Display availability when scheduling

#### Child Issues

- [ ] [FEAT-001-1] Google Calendar OAuth Setup
- [ ] [FEAT-001-2] Microsoft Graph API Integration
- [ ] [FEAT-001-3] Calendar Connection UI
- [ ] [FEAT-001-4] Availability Detection Service
- [ ] [FEAT-001-5] Event Sync Service

#### Target: Phase 2 (Weeks 5-8)

---

### [FEAT-001-1] Google Calendar OAuth Setup

**Labels:** `feature`, `v2.0`, `backend`, `security`

#### Description

Implement Google OAuth 2.0 flow for Calendar API access.

#### Technical Details

- Create `app/services/google_calendar.py`
- Add OAuth callback endpoint
- Implement token refresh mechanism
- Store encrypted tokens in database

#### Acceptance Criteria

- [ ] Users can initiate Google Calendar connection
- [ ] OAuth flow completes successfully
- [ ] Tokens are stored encrypted (AES-256)
- [ ] Token refresh works automatically

---

### [FEAT-001-2] Microsoft Graph API Integration

**Labels:** `feature`, `v2.0`, `backend`, `security`

#### Description

Implement Microsoft Graph API integration for Outlook/365 calendar access.

#### Technical Details

- Create `app/services/microsoft_calendar.py`
- Leverage existing Azure AD SSO setup
- Add calendar scope to permissions
- Implement token management

#### Acceptance Criteria

- [ ] Users can connect Microsoft 365 calendar
- [ ] Events can be read from Outlook
- [ ] Works with existing Microsoft SSO users

---

## Epic 2: Google Sign-In

### [FEAT-002] Google Sign-In Epic

**Labels:** `epic`, `v2.0`, `backend`, `frontend`, `security`

#### Summary

Add Google as an OAuth 2.0 authentication provider alongside existing Microsoft SSO.

#### Goals

- [ ] One-click "Sign in with Google" button
- [ ] Automatic account linking by email
- [ ] Google Workspace domain support

#### Child Issues

- [ ] [FEAT-002-1] Google OAuth Backend Implementation
- [ ] [FEAT-002-2] Google Sign-In Button UI
- [ ] [FEAT-002-3] Account Linking Logic
- [ ] [FEAT-002-4] Database Schema Updates

#### Target: Phase 1 (Weeks 1-4)

---

### [FEAT-002-1] Google OAuth Backend Implementation

**Labels:** `feature`, `v2.0`, `backend`, `security`

#### Description

Implement Google OAuth 2.0 authentication flow in the backend.

#### Technical Details

- Create `app/api/v1/sso_google.py`
- Create `app/services/google_auth.py`
- Add `google_id` field to users table
- Implement JWT token generation after OAuth

#### Acceptance Criteria

- [ ] Google OAuth callback works
- [ ] JWT tokens issued after successful auth
- [ ] New users created with Google profile data
- [ ] Existing users linked by email match

---

## Epic 3: Interview Redesign

### [FEAT-003] Interview Redesign Epic

**Labels:** `epic`, `v2.0`, `backend`, `frontend`, `ux`

#### Summary

Complete reimagining of the interview workflow with visual timeline and enhanced feedback system.

#### Goals

- [ ] Beautiful visual interview timeline
- [ ] Structured scorecard system
- [ ] Competency-based ratings
- [ ] 360° consolidated feedback view

#### Child Issues

- [ ] [FEAT-003-1] Interview Timeline UI Component
- [ ] [FEAT-003-2] Enhanced Scorecard Schema
- [ ] [FEAT-003-3] Scorecard Input Form
- [ ] [FEAT-003-4] Consolidated Feedback View
- [ ] [FEAT-003-5] Interview Stage Templates
- [ ] [FEAT-003-6] Competency Framework

#### Target: Phase 3 (Weeks 9-12)

---

### [FEAT-003-1] Interview Timeline UI Component

**Labels:** `feature`, `v2.0`, `frontend`, `ux`

#### Description

Create a beautiful visual timeline showing candidate's interview journey.

#### Technical Details

- React component with stage nodes
- Animated transitions between stages
- Status indicators (passed/failed/pending)
- Date/time display for each stage

#### Acceptance Criteria

- [ ] Timeline shows all interview stages
- [ ] Stages are color-coded by status
- [ ] Current stage is highlighted
- [ ] Clicking stage shows details

---

## Epic 4: GraphRAG & Skills Matrix

### [FEAT-004] GraphRAG & Skills Matrix Epic

**Labels:** `epic`, `v2.0`, `backend`, `frontend`, `ai`

#### Summary

Build an intelligent knowledge graph mapping candidates, skills, projects, and roles with visual exploration.

#### Goals

- [ ] Entity extraction from CVs
- [ ] Knowledge graph construction
- [ ] Visual network view
- [ ] Semantic search capabilities
- [ ] Skills matrix comparison view

#### Child Issues

- [ ] [FEAT-004-1] Entity Extraction Service
- [ ] [FEAT-004-2] Knowledge Graph Database (Neo4j/NetworkX)
- [ ] [FEAT-004-3] Graph Query API
- [ ] [FEAT-004-4] D3.js Visual Network Component
- [ ] [FEAT-004-5] Skills Matrix UI
- [ ] [FEAT-004-6] Natural Language Search
- [ ] [FEAT-004-7] Role-Skill Mapping Admin

#### Target: Phase 4 (Weeks 13-16)

---

### [FEAT-004-1] Entity Extraction Service

**Labels:** `feature`, `v2.0`, `backend`, `ai`

#### Description

Use GPT-4o to extract structured entities from parsed CVs.

#### Technical Details

- Create `app/services/entity_extractor.py`
- Extract: Skills, Companies, Projects, Tools, Roles
- Output structured JSON with relationships
- Store in ChromaDB for embeddings

#### Acceptance Criteria

- [ ] Extracts skills with proficiency levels
- [ ] Identifies companies and roles
- [ ] Links projects to technologies
- [ ] Embeddings stored in ChromaDB

---

## Epic 5: Auto Interview Invitations

### [FEAT-005] Auto Interview Invitations Epic

**Labels:** `epic`, `v2.0`, `backend`, `integration`

#### Summary

Automatically send calendar invitations when interviews are scheduled.

#### Goals

- [ ] Auto-send invites on interview creation
- [ ] Configurable invitation rules
- [ ] Rich event content with candidate info
- [ ] Attach relevant documents

#### Child Issues

- [ ] [FEAT-005-1] Invitation Rules Engine
- [ ] [FEAT-005-2] Event Trigger System
- [ ] [FEAT-005-3] Invitation Template System
- [ ] [FEAT-005-4] Invitation Status Tracking

#### Dependencies: [FEAT-001] Calendar Integration

#### Target: Phase 2 (Weeks 5-8)

---

## Epic 6: Advanced Admin Dashboard

### [FEAT-006] Advanced Admin Dashboard Epic

**Labels:** `epic`, `v2.0`, `backend`, `frontend`, `security`

#### Summary

Mission control dashboard for platform administrators to monitor all activity.

#### Goals

- [ ] Real-time activity feed
- [ ] Platform-wide metrics
- [ ] Company breakdown analytics
- [ ] Complete audit logging
- [ ] Export capabilities

#### Child Issues

- [ ] [FEAT-006-1] Audit Logging Infrastructure
- [ ] [FEAT-006-2] Real-Time Activity Feed (WebSocket)
- [ ] [FEAT-006-3] Platform Metrics Dashboard
- [ ] [FEAT-006-4] Company Analytics View
- [ ] [FEAT-006-5] Audit Log Search & Export

#### Target: Phase 5 (Weeks 17-20)

---

### [FEAT-006-1] Audit Logging Infrastructure

**Labels:** `feature`, `v2.0`, `backend`, `security`, `database`

#### Description

Implement comprehensive audit logging for all user actions.

#### Technical Details

- Create `app/services/audit_service.py`
- Create `audit_logs` table with indexes
- Log: user, company, action, entity, details, IP, user-agent
- Add middleware for automatic logging

#### Acceptance Criteria

- [ ] All CRUD operations logged
- [ ] Logs include user and company context
- [ ] IP address and user-agent captured
- [ ] Queryable by date range
- [ ] Performant indexes in place

---

## Epic 7: Pipeline-Interview Merge

### [FEAT-007] Pipeline-Interview Merge Epic

**Labels:** `epic`, `v2.0`, `backend`, `frontend`, `ux`

#### Summary

Unify Kanban pipeline view with interview workflow for seamless experience.

#### Goals

- [ ] Interview stages as pipeline columns
- [ ] Inline interview scheduling
- [ ] Status badges on candidate cards
- [ ] Drag-and-drop advances interviews

#### Child Issues

- [ ] [FEAT-007-1] Unified Stage Data Model
- [ ] [FEAT-007-2] Enhanced Candidate Card Component
- [ ] [FEAT-007-3] Inline Scheduling Widget
- [ ] [FEAT-007-4] Drag-and-Drop Interview Advancement
- [ ] [FEAT-007-5] Quick Feedback Modal

#### Dependencies: [FEAT-003] Interview Redesign

#### Target: Phase 3 (Weeks 9-12)

---

## Labels to Create

```
epic: #5319E7 (Purple)
v2.0: #006B75 (Teal)
feature: #1D76DB (Blue)
backend: #FBCA04 (Yellow)
frontend: #0E8A16 (Green)
database: #D93F0B (Orange)
ai: #7057FF (Violet)
security: #B60205 (Red)
ux: #E99695 (Pink)
integration: #BFD4F2 (Light Blue)
```

---

*Generated for Headhunter AI v2.0 Roadmap*
