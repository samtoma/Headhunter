# Deep Dive: Backend & Frontend Fixes

This document outlines the specific improvements and bug fixes implemented to enhance security, performance, and cross-platform compatibility.

## 1. Authentication & Security

### Improved Email Validation
- **What:** Replaced manual `@` checks with Pydantic's `EmailStr`.
- **Why:** The previous check (`"@" in email`) was too weak and allowed invalid email formats. `EmailStr` (via `email-validator`) ensures RFC-compliant email addresses.
- **Where:** Updated `UserCreate` schema in `auth.py` and `UserBase` in `schemas/user.py`.

### Non-blocking Email Operations
- **What:** Switched from `await send_verification_email(...)` to `background_tasks.add_task(...)`.
- **Why:** Sending emails is an I/O intensive operation that can take several seconds. Blocking the request cycle for this makes the API feel slow and prone to timeouts. Background tasks allow the API to respond immediately while the email is sent in the background.
- **Where:** `signup`, `resend_verification`, and `forgot_password` endpoints in `auth.py`.

### Security Key Centralization
- **What:** Moved `ENCRYPTION_KEY` and its default `DEV_KEY` from `security.py` to `config.py`.
- **Why:** Hardcoding keys in logic files is a bad practice. Moving them to `config.py` allows them to be managed via environment variables consistently with other settings.
- **Where:** `backend/app/core/config.py` and `backend/app/core/security.py`.

## 2. Robustness & Onboarding

### Logs Database Resiliency
- **What:** Made `LOGS_DATABASE_URL` optional with a fallback to the main `DATABASE_URL`.
- **Why:** The application was crashing on startup if `LOGS_DATABASE_URL` was not set. This created a high barrier for new developers. The fallback allows the app to run in "mono-db" mode for development while still supporting the intended split architecture for production.
- **Where:** `backend/app/core/config.py`.

### Dead Code Removal
- **What:** Deleted `get_verified_user` from `deps.py`.
- **Why:** This function was not used anywhere in the codebase, increasing maintenance surface area without providing value.

## 3. Calendar Feature Enhancements

### Event Validation
- **What:** Introduced `CalendarEventCreate` Pydantic schema for the `/events` POST endpoint.
- **Why:** Previously, the endpoint accepted a raw `Dict[str, Any]`, which is dangerous as it allows malformed data to be passed directly to external providers (Google/Microsoft). The schema ensures required fields like `summary`, `start`, and `end` are present and correctly formatted.
- **Where:** `backend/app/schemas/calendar.py` and `backend/app/api/v1/calendars.py`.

## 4. Cross-Platform Compatibility (Mac/Windows/Linux)

### Frontend Rollup Support for ARM64
- **What:** Added `@rollup/rollup-linux-arm64-gnu` to `optionalDependencies` in `frontend/package.json`.
- **Why:** Users on Apple Silicon Macs (M1/M2/M3) or ARM-based Linux servers were seeing a "Cannot find module" error because the lockfile/package only targeted x64.
- **Verification:** This ensures the Vite/Rollup build process works natively on ARM64 architectures.

### Cross-Platform Note
- **Mac:** Now fully supported (Intel and Apple Silicon).
- **Windows:** Supported via Docker Desktop (WSL2 backend recommended).
- **Linux:** Fully supported across architectures (x64 and ARM64).

## Summary of Configuration Changes
- Added `ENCRYPTION_KEY` and `LOGS_DATABASE_URL` to `.env.example` to guide users on required environment variables.
- Updated documentation to reflect the new flexibility in database configuration.
