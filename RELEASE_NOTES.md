# Release Notes - v1.11.0

## Summary

This release focuses on stability, fixing critical bugs in the AI Search and Interview Feedback workflows, and enhancing the Interview Mode with a mobile-responsive design and richer data parsing.

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
- **Tests**: Core backend tests passing.

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
