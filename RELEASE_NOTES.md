# Release Notes - v1.16.0 (Developer Dashboard & Monitoring)

**Release Date:** 2025-12-21

## Summary

This release introduces a comprehensive **Developer & Support Monitoring Dashboard** with real-time system health checks, UX analytics, database statistics, and log management capabilities. It also includes a fix for Super Admin users accessing company endpoints.

## 🚀 Key Features

### 🖥️ Enhanced Admin Dashboard

- **System Health Monitoring:** Real-time health checks for Database, Redis, Celery, and ChromaDB with status indicators and response times.
- **UX Analytics:** Response time percentiles (p50, p95, p99), error rates, slow endpoint detection, and hourly request distribution charts.
- **Database Statistics:** Connection pool monitoring, table sizes, and total database size metrics.
- **Log Cleanup:** Preview and execute cleanup of old logs to manage database size.

### 📊 New API Endpoints (Super Admin Only)

| Endpoint | Description |
|----------|-------------|
| `GET /admin/health` | System-wide health check for all services |
| `GET /admin/ux-analytics` | Response time percentiles and error analytics |
| `GET /admin/database/stats` | Connection pool and table size statistics |
| `DELETE /admin/logs/cleanup` | Preview and execute old log deletion |

### 🐛 Bug Fixes

- **Super Admin 404 Fix:** `/companies/me` now returns `null` with 200 OK for Super Admin users instead of throwing a 404 error, eliminating noisy error logs.

## 🛠️ Technical Details

- **Backend:**
  - New endpoints in `admin.py` for health, UX analytics, and database monitoring.
  - Enhanced `logging_middleware.py` for comprehensive request tracking.
  - New database migration for SystemLog composite indexes.
- **Frontend:**
  - Enhanced `AdminLogsDashboard.jsx` with health status cards, percentile gauges, and area charts.

## ✅ Verification

- **Unit Tests:** Updated `test_companies.py` to reflect new null response behavior.
- **Manual Verification:** Tested health endpoints and dashboard rendering.

---

# Release Notes - v1.15.0 (Auto Invitations & Cancellations)

**Release Date:** 2025-12-19

## Summary

This release completes the calendar integration by introducing **Auto Interview Invitations** and **Cancellation Management**. Calendar events are now automatically created and sent to all participants, including the candidate (with CV attached) and interviewers, ensuring seamless scheduling.

## 🚀 Key Features

### 📅 Auto-Invitations

- **Automatic Sending:** Invitations are triggered immediately upon interview creation or scheduling.
- **Smart Attachments:** The candidate's CV is automatically renamed and attached to the calendar invite for interviewers.
- **Rich Event Details:** Calendar events include the interview type, candidate details, and direct links to the Headhunter dashboard.
- **Organizer Tracking:** The scheduler is set as the event organizer to track accept/decline responses.

### ❌ Cancellation Handling

- **Automated Cancellations:** Updating an interview status to "Cancelled" automatically sends a cancellation email.
- **Calendar Cleanup:** Sends `METHOD:CANCEL` to remove the event from all participants' calendars.
- **Smart Cleanup:** Ensures attachments are handled correctly during the cancellation process.

## 🛠️ Technical Details

- **Backend**:
  - Enhanced `send_interview_notification` in `email.py` to handle both `REQUEST` and `CANCEL` ICS methods.
  - Implemented secure temporary file handling for CV renaming/attachment using `shutil` and `/tmp/` directory.
  - Updated `create_interview` and `update_interview` logic to trigger notifications on status changes.

## ✅ Verification

- **Manual Verification**: Verified end-to-end flow with real Google Calendar and Outlook accounts (Invite & Cancel).
- **Unit Tests**: Added test cases for ICS generation, file renaming, and cancellation logic.

---

# Release Notes - v1.14.0 (Calendar Integration)

**Release Date:** 2025-12-18

## Summary

This release enables **two-way seamless synchronization** with Google Calendar and Microsoft Outlook. Users can now connect their calendars to check availability and automatically sync interview events.

## 🚀 Key Features

### 📅 Calendar Sync

- **Google Calendar Integration:** Connect via OAuth 2.0.
- **Microsoft Outlook Integration:** Connect via Microsoft Graph API.
- **Unified Settings:** New "Calendar" tab in Settings to manage connections.
- **Secure Storage:** Tokens are encrypted at rest using AES-256.

### 🛠️ Technical Details

- **Backend**:
  - New `CalendarProvider` abstraction.
  - Generic `/connect/{provider}` endpoints.
  - `CalendarConnection` model with encrypted fields.
- **Frontend**:
  - `CalendarSettings.jsx` component.

## ✅ Verification

- **Unit Tests**: Added comprehensive tests for encryption and OAuth flows.
- **Integration**: Validated with real Google and Microsoft accounts.

---

# Release Notes - v1.13.0 (Secure Invitation System)

**Release Date:** 2025-12-14

## Summary

This release introduces a **secure, token-based invitation system**, replacing the open signup model for improved security. Administrators can now invite team members with specific roles, track their pending status, and manage their access lifecycle including deactivation and archival.

## 🚀 Key Features

### 📩 Team Invitation Flow

- **Admin Invite**: Admins/Managers can invite new users via email using the "Invite Member" modal.
- **Role Assignment**: Assign specific roles (Recruiter, Interviewer, Admin) at the time of invitation.
- **Secure Onboarding**: New users receive a unique, time-limited (48h) link to set their password and active their account.
- **Pending Status**: Visual indicators show which team members have not yet accepted their invites.

### 👥 User Lifecycle Management

- **Soft Delete / Archive**: Deleting a user now "deactivates" them, preserving data integrity but revoking access.
- **Archive View**: Dedicated "Archived" tab in the Team view to manage deactivated users.
- **Reactivation**: Inviting a deactivated user automatically reactivates their account and resets their status to Pending.

### 🛡️ Security Enhancements

- **Role Refinement**: Removed the ambiguous 'Viewer' role; defaulted new invites to 'Interviewer'.
- **Access Control**: Strict RBAC enforcement on invite/delete actions.
- **Audit Logging**: All invitation and status change events are logged.

## 🛠️ Technical Details

- **Backend**:
  - New `POST /users/invite` endpoint with token generation.
  - Updates to `GET /users` to support `status=active|archived|all` filtering.
- **Frontend**:
  - `InviteUserModal` with dynamic department selection.
  - E2E Test Suite (`e2e_invite_flow.cy.js`) covering full invite-to-archive lifecycle.

## ✅ Verification

- **E2E Tests**: 100% Pass rate for Invite Flow and Pipeline regressions.
- **Unit Tests**: Full coverage for `invite_user` logic and permissions.

---

# Release Notes - v1.12.0 (Audit System & Attribution)

## Summary

This release introduces a **system-wide audit trail** with inline attribution across all major entities. Users can now clearly see who created, modified, uploaded, or assigned candidates, jobs, and departments directly within the UI.

## 🚀 Key Features

### 🔍 Inline Audit Attribution

- **Candidates**: Cards now show "Uploaded by [Name]".
- **Pipelines**: Candidate Drawer shows "Added by [Name]" in the Active Pipeline card (top-right).
- **Departments & Jobs**: Cards display "Created by" and "Modified by" attribution.
- **Interviews**: Primary log remains the "Interviewer" assignment.

### 📋 UI Enhancements

- **Sidebar Renaming**:
  - "Interviews" → **"My Interviews"**
  - "Timeline" → **"Interview Schedule"**
- **Activity Feed**: Enhanced with rich user attribution for pipeline events ("Added to Pipeline by...").
- **Source Tracking**: Applications now track `source` (Manual, Bulk Assign, API) and `assigned_by`.

### 🛠️ Technical Details

- **Database**:
  - Added `assigned_by` and `source` to `applications` table.
  - Added `uploaded_by` to `cvs` table.
  - Added `created_by`/`modified_by` to `jobs` and `departments`.
- **API**: Updated endpoints to populate user names for inline display.

## ✅ Verification

- **Frontend Tests**: 120/120 passing.
- **Backend Tests**: 10/12 passing (core logic verified).

---

# Release Notes - v1.11.0

## Summary

This release focuses on stability, fixing critical bugs in the AI Search and Interview Feedback workflows, and enhancing the Interview Mode with a mobile-responsive design and richer data parsing. We also improved frontend test stability by resolving React warnings and mocked dependencies.

## 🚀 Key Features

### Mobile-Friendly Interview Mode

- **Responsive Layout**: The Interview Mode now adapts to mobile screens.
- **Side Drawer**: Candidate Profile is now a slide-over drawer on mobile, accessible via a "View CV" button, keeping the feedback form accessible.
- **Full-Width Feedback**: The interview feedback form now utilizes the full screen width on small devices for better usability.

### Enriched CV Parsing

- **Education Details**: The parser now extracts deeper insights into candidate education:
  - **Institution** (University Name)
  - **Degree** (with full description)
  - **Field of Study** (Major)
  - **Year** (Graduation Year)
  - **Grade** (GPA/Honors)

### Auto-Syncing AI Search

- **Automatic Indexing**: Introduced a background service that automatically syncs CVs from postgres to ChromaDB on startup.
- **Self-Healing**: A re-indexing script is available to fix any data discrepancies manually.

## 🐛 Bug Fixes

### Frontend Stability

- **Test Suite**: Fixed `PipelineStatus` test failures by correcting mock data and selectors.
- **React Warnings**: Resolved `window.alert` implementation errors, duplicate key warnings in candidate lists, and uncontrolled input warnings in edit forms.

### Critical Fixes

- **AI Search Failure**: Fixed an issue where candidates were missing from search results due to missing `company_id` metadata. All 270+ CVs are now correctly indexed.
- **Save Feedback Error**: Resolved a `405 Method Not Allowed` error when saving interview feedback by aligning the frontend HTTP method (PATCH) with the backend API.
- **Application Crash**: Fixed a `ReferenceError` in `InterviewMode.jsx` that caused the application to crash on load.

### UI Improvements

- **Missing Data**: Restored Candidate Name and Job Title in the Interview Mode header (previously showed generic text).
- **Navigation**: Fixed broken navigation links in the Interviews table (`/ interview / 123` -> `/interview/123`).

## 🛠️ Technical Details

- **Sync Service**: `backend/app/services/sync_service.py`
- **Re-index Script**: `backend/scripts/reindex_chroma.py`
- **Frontend Fix**: Updated `axios.put` to `axios.patch` in `InterviewMode.jsx`.

## ✅ Verification

- **Search**: Verified via `check_embeddings_status.py` (270/270 indexed).
- **Tests**: Core backend tests passing. Frontend tests passing (100% stable).

---

# Release Notes - v1.10.0 (Email Verification & Stability)

**Release Date:** 2025-12-06

### 🚀 New Features

- **Full Email Verification Flow**:
  - **Secure Signup**: New users receive a verification email upon registration.
  - **Login Enforcement**: Access is strictly limited to verified accounts. Unverified attempts are blocked with a clear prompt.
  - **Resend Capability**: Users can easily request a new verification link if needed.
  - **Frontend UI**: Dedicated `VerifyEmail` and `PendingVerification` pages for a seamless user experience.

### 🛡️ Security & Infrastructure

- **SMTP Configuration**: Added comprehensive documentation and configuration support for SMTP (Google App Passwords, etc.).
- **Production Readiness**: Frontend URL configuration now supports production domains (e.g., `headhunter.samueltoma.io`).

### 🧹 Quality & Maintenance

- **Linting Overhaul**: Achieved **Zero Lint Errors** across both Frontend (ESLint) and Backend (Ruff).
  - Removed unused code, imports, and variables.
  - Fixed code style issues (e.g., import ordering in `users.py`).
- **Test Stability**: Fixed backend authentication tests to align with new verification requirements.

---

# Release Notes - v1.9.2 (Previous)

**Release Date:** 2025-12-04

### 🚀 New Features

- **AI-Powered Department Generation:** Generate department descriptions, technologies, and job templates with a single click using AI.
- **Frontend Design System:** Standardized UI components and design rules in `docs/DESIGN_SYSTEM.md`.
- **Enhanced Version Control:** Improved version mismatch detection with auto-cache clearing and hard reload.

### 🐛 Bug Fixes

- Fixed "GenGenerate" text overlap issue in AI buttons.
- Fixed "shadow" ghosting artifact on disabled buttons by removing opacity transitions.
- Fixed inconsistent version strings across the application.

---

# Release Notes - v1.8.0-RC2

## 🚀 Release Highlights

### 🧪 Quality Assurance & Stability

This release focuses on hardening the application with comprehensive test coverage and critical bug fixes.

#### Backend Stability

- ✅ **100% Test Coverage**: Achieved full coverage for all backend services including Stats, SSO, Embeddings, Email, Sync, Jobs, Users, and Parser.
- ✅ **Linting & Code Quality**: Resolved all backend linting errors, ensuring a clean and maintainable codebase.

#### Frontend Improvements

- ✅ **Pipeline Assignment Fixes**: Resolved UI freezing issues and improved the assignment dropdown UX (filtering assigned jobs).
- ✅ **Unit Test Expansion**: Added robust unit tests for key pipeline components:
  - `CandidateCard`: Interaction and rendering tests.
  - `PipelineHeader`: Search, sort, and view control tests.
  - `PipelineBoard`: Refactored and tested the Kanban board logic.
- ✅ **Refactoring**: Extracted `PipelineBoard` for better modularity.

---

# Release Notes - v1.8.0-RC1

## 🚀 Release Highlights

### 🧪 Comprehensive Testing Strategy Overhaul

We have implemented a robust, multi-layered testing strategy to ensure enterprise-grade reliability.

#### Backend Test Coverage (83% Total)

We achieved **100% coverage** on critical core components:

- ✅ **Stats API** (Analytics & Reporting)
- ✅ **SSO API** (Microsoft Authentication)
- ✅ **Embeddings Service** (Vector Search Integration)
- ✅ **Email Service** (Notifications & Verification)
- ✅ **Sync API** (Frontend Data Synchronization)

Significant improvements in other key areas:

- **Jobs API:** 94% coverage (RBAC & Logic)
- **Parser Service:** 86% coverage (PDF/DOCX Extraction & AI)
- **Users API:** 83% coverage (Security & Role Management)

#### Infrastructure Updates

- **Docker-Based Testing:** All tests now run in isolated Docker containers for consistency.
- **Integration Testing Layer:** Added a dedicated integration test suite with real database connections.
- **E2E Stability:** Eliminated flaky Cypress tests by moving to a full-stack Docker Compose environment (`docker-compose.e2e.yml`).

### 🛠️ Fixes & Improvements

- **SSO:** Fixed redirect handling and user creation logic for Microsoft SSO.
- **Stats:** Fixed department aggregation and RBAC for analytics endpoints.
- **Parser:** Improved error handling for PDF annotations and DOCX files.
- **Security:** Enhanced cross-company access controls in Users API.

---

*Generated by Headhunter AI Engineering Team*
