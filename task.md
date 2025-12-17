# 📋 Headhunter AI - Task Tracker

## ✅ Completed (v1.8.1)

- [x] Backend: Achieve 100% Test Coverage <!-- gh: 16 -->
  - [x] Stats API <!-- gh: 17 -->
  - [x] SSO API <!-- gh: 18 -->
  - [x] Embeddings Service <!-- gh: 19 -->
  - [x] Email Service <!-- gh: 20 -->
  - [x] Sync API <!-- gh: 21 -->
  - [x] Jobs API <!-- gh: 22 -->
  - [x] Users API <!-- gh: 23 -->
  - [x] Design Alignment (Invite Acceptance) <!-- gh: 89 -->
    - [x] Update `ResetPassword.jsx` styles to match premium design <!-- gh: 90 -->
  - [x] Remove 'Viewer' Role <!-- gh: 91 -->
    - [x] Remove from Backend Enum (`models.py`) <!-- gh: 92 -->
    - [x] Remove from Frontend Invite Modal (`InviteUserModal.jsx`) <!-- gh: 93 -->
    - [x] Cleanup Seeds (`seed_test_data.py`) <!-- gh: 94 -->
  - [ ] User Management Enhancements <!-- gh: 95 -->
    - [ ] Implement Archive View (Frontend & Backend) <!-- gh: 96 -->
    - [ ] Validated Pending Status Display <!-- gh: 97 -->
  - [x] Parser Service <!-- gh: 24 -->
- [x] Debug Frontend Pipeline Assignment <!-- gh: 25 -->
  - [x] Fix "freeze" issue (overflow/layout) <!-- gh: 26 -->
  - [x] Add regression tests for assignment/removal <!-- gh: 27 -->
  - [x] Improve UX (loading states, filtering assigned jobs) <!-- gh: 28 -->
- [x] Pipeline Components (Board, Column, Card) <!-- gh: 30 -->
- [x] Frontend: Increase Unit Test Coverage <!-- gh: 29 -->
  - [x] Modals (CompanyProfileModal - 16 tests) <!-- gh: 31 -->
  - [x] Shared Components (UploadProgressWidget - 12 tests) <!-- gh: 32 -->
- [x] End-to-End Tests <!-- gh: 33 -->
  - [x] CompanyProfileModal E2E with screenshots (5 tests) <!-- gh: 76 -->
  - [x] UploadProgressWidget E2E with screenshots (5 tests) <!-- gh: 77 -->
  - [x] Critical User Flows (e2e_recruitment_flow.cy.js - 202 lines) <!-- gh: 34 -->

---

## 🔄- **In Progress (Active Sprint)**

    - [FEAT-008] Role-Based Permissions (Phase 1)
        - [x] [FEAT-008-1] Team member invite system (Backend API & Email) <!-- gh: 98 -->
        - [ ] [FEAT-008-2] Department-scoped access control <!-- gh: 99 -->
        - [ ] [FEAT-008-3] Interviewer view restrictions <!-- gh: 100 -->
        - [/] [FEAT-008-4] User Account Status (Active/Deactivated) (DB & Model only) <!-- gh: 101 -->
        - [/] [FEAT-008-5] Granular Feature Toggles (DB & Model only) <!-- gh: 83 -->

---

## 🚀 v2.0 Roadmap Backlog

> See [ROADMAP_V2.md](docs/wiki/ROADMAP_V2.md) for full details

### Phase 1: Foundation (Weeks 1-4)

- [x] [FEAT-002] Google Sign-In <!-- v2.0 --> <!-- gh: 36 -->
  - [x] [FEAT-002-1] Google OAuth Backend Implementation <!-- gh: 37 -->
  - [x] [FEAT-002-2] Google Sign-In Button UI <!-- gh: 38 -->
  - [x] [FEAT-002-3] Account Linking Logic <!-- gh: 39 -->
  - [x] [FEAT-002-4] Database Schema Updates <!-- gh: 40 -->
- [x] [FEAT-006-1] Audit Logging Infrastructure <!-- v2.0 --> <!-- gh: 41 -->
  - [x] Inline Attribution for Candidates (Drawer/List) <!-- gh: 85 -->
  - [x] Inline Attribution for Pipelines <!-- gh: 86 -->
  - [x] Inline Attribution for Jobs & Departments <!-- gh: 87 -->
  - [x] Enhanced Activity Log <!-- gh: 88 -->
- [ ] [FEAT-008] Role-Based Permissions <!-- v2.0 --> <!-- gh: 78 --> (Moved to In Progress)

### Phase 2: Calendar & Automation (Weeks 5-8)

- [ ] [FEAT-001] Calendar Integration <!-- v2.0 --> <!-- gh: 42 -->
  - [ ] [FEAT-001-1] Google Calendar OAuth Setup <!-- gh: 43 -->
  - [ ] [FEAT-001-2] Microsoft Graph API Integration <!-- gh: 44 -->
  - [ ] [FEAT-001-3] Calendar Connection UI <!-- gh: 45 -->
  - [ ] [FEAT-001-4] Availability Detection <!-- gh: 46 -->
  - [ ] [FEAT-001-5] Event Sync Service <!-- gh: 47 -->
- [ ] [FEAT-005] Auto Interview Invitations <!-- v2.0 --> <!-- gh: 48 -->
  - [ ] [FEAT-005-1] Invitation Rules Engine <!-- gh: 49 -->
  - [ ] [FEAT-005-2] Event Trigger System <!-- gh: 50 -->
  - [ ] [FEAT-005-3] Invitation Template System <!-- gh: 51 -->

### Phase 3: Interview Experience (Weeks 9-12)

- [ ] [FEAT-003] Interview Redesign <!-- v2.0 --> <!-- gh: 52 -->
  - [ ] [FEAT-003-1] Interview Timeline UI Component <!-- gh: 53 -->
  - [ ] [FEAT-003-2] Enhanced Scorecard Schema <!-- gh: 54 -->
  - [ ] [FEAT-003-3] Scorecard Input Form <!-- gh: 55 -->
  - [ ] [FEAT-003-4] Consolidated Feedback View <!-- gh: 56 -->
  - [ ] [FEAT-003-5] Interview Stage Templates <!-- gh: 57 -->
- [ ] [FEAT-007] Pipeline-Interview Merge <!-- v2.0 --> <!-- gh: 58 -->
  - [ ] [FEAT-007-1] Unified Stage Data Model <!-- gh: 59 -->
  - [ ] [FEAT-007-2] Enhanced Candidate Card Component <!-- gh: 60 -->
  - [ ] [FEAT-007-3] Inline Scheduling Widget <!-- gh: 61 -->
  - [ ] [FEAT-007-4] Drag-and-Drop Interview Advancement <!-- gh: 62 -->

### Phase 4: Intelligence (Weeks 13-16)

- [ ] [FEAT-004] GraphRAG & Skills Matrix <!-- v2.0 --> <!-- gh: 63 -->
  - [ ] [FEAT-004-1] Entity Extraction Service <!-- gh: 64 -->
  - [ ] [FEAT-004-2] Knowledge Graph Database <!-- gh: 65 -->
  - [ ] [FEAT-004-3] Graph Query API <!-- gh: 66 -->
  - [ ] [FEAT-004-4] D3.js Visual Network Component <!-- gh: 67 -->
  - [ ] [FEAT-004-5] Skills Matrix UI <!-- gh: 68 -->
  - [ ] [FEAT-004-6] Natural Language Search <!-- gh: 69 -->
  - [ ] [FEAT-004-7] Role-Skill Mapping Admin <!-- gh: 70 -->

### Phase 5: Admin & Analytics (Weeks 17-20)

- [ ] [FEAT-006] Advanced Admin Dashboard <!-- v2.0 --> <!-- gh: 71 -->
  - [ ] [FEAT-006-2] Real-Time Activity Feed (WebSocket) <!-- gh: 72 -->
  - [ ] [FEAT-006-3] Platform Metrics Dashboard <!-- gh: 73 -->
  - [ ] [FEAT-006-4] Company Analytics View <!-- gh: 74 -->
  - [ ] [FEAT-006-5] Audit Log Search & Export <!-- gh: 75 -->
