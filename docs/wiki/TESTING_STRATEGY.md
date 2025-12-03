# Headhunter Testing Strategy & Wiki

## 1. Overview
This document outlines the comprehensive testing strategy for the Headhunter application. Our goal is **100% consistency** and **reliability** in our End-to-End (E2E) tests, ensuring that every commit is verified against a stable, production-like environment.

## 2. Architecture
We utilize a Docker-centric testing architecture to eliminate "it works on my machine" issues.

*   **Framework**: Cypress (Frontend), Pytest (Backend)
*   **Environment**: Docker Compose (`docker-compose.yml`)
*   **CI/CD**: GitHub Actions

### Directory Structure
```
/frontend/cypress/
├── e2e/                 # Test Specifications
│   ├── auth.cy.js       # Authentication Flows
│   ├── analytics.cy.js  # Dashboard & Analytics
│   └── ...
├── support/
│   ├── commands.js      # Custom Commands & API Mocks
│   └── e2e.js           # Global Configuration
└── screenshots/         # Artifacts from failed tests
```

## 3. Authentication Testing Strategy
We employ a **Hybrid Authentication Strategy** to balance test speed with coverage.

### A. UI-Based Login Flow (`auth.cy.js`)
*   **Purpose**: Verify the actual Login UI, form validation, and error handling.
*   **Method**: `cy.visit('/login')` -> `cy.type()` -> `cy.click()`.
*   **Key Assertion**: Verifies redirection to Dashboard and presence of auth token in `localStorage`.

### B. Programmatic Session Restoration
*   **Purpose**: Speed up tests for protected routes (Dashboard, Pipeline, etc.) by bypassing the login form.
*   **Method**: Using `onBeforeLoad` to inject the session directly into the browser.
    ```javascript
    cy.visit('/', {
        onBeforeLoad: (win) => {
            win.localStorage.setItem('token', 'mock-token-123');
            win.localStorage.setItem('role', 'admin');
        }
    });
    ```
*   **Benefit**: Reduces test execution time and isolates login failures from feature tests.

## 4. API Mocking Strategy
To ensure consistency and speed, we **mock all API responses** for frontend tests. This decouples frontend verification from backend state.

### Centralized Mocks (`commands.js`)
We use a custom command `cy.mockAllAPIs()` to define a single source of truth for API responses.

*   **Core Auth**: `/api/auth/login`, `/api/users/me`
*   **Dashboard**: `/api/stats/dashboard`, `/api/analytics/dashboard`
*   **Resources**: `/api/jobs`, `/api/applications`, `/api/cvs`

### Catch-All Pattern
To prevent unhandled requests from causing flakes or 404s, we implement catch-all interceptors for common GET requests that return safe empty defaults.

## 5. Best Practices & Guidelines

### 1. Explicit Waits
**NEVER** use `cy.wait(ms)`. Always wait for an aliased API call.
*   **Bad**: `cy.wait(2000)`
*   **Good**: `cy.wait('@getJobs')`

### 2. Selectors
Prefer resilient selectors over CSS classes that might change.
*   **Preferred**: `cy.get('[data-testid="submit-btn"]')`
*   **Acceptable**: `cy.contains('Sign In')`
*   **Avoid**: `cy.get('.div > .btn-primary')`

### 3. Isolation
Tests must be independent. We use `cy.clearLocalStorage()` in `beforeEach` to ensure a clean slate.

## 6. Running Tests

### Local (Docker)
To run tests in the exact environment used by CI:
```bash
./run_cypress_in_docker.sh
```

### Debugging Flakiness
To verify stability, use the stress-test script:
```bash
./scripts/run_tests_multiple_times.sh 5
```
This runs the suite 5 times and reports pass/fail rates.

## 7. CI/CD Pipeline
Our GitHub Actions workflow (`.github/workflows/ci.yml`) enforces quality gates:

1.  **Build**: Builds the Docker image.
2.  **Test**: Runs Cypress tests 3 times.
3.  **Artifacts**: Uploads screenshots and videos on failure.

## 8. Troubleshooting Common Issues

### "Timed out retrying"
*   **Cause**: The element didn't appear or the API call didn't finish within the timeout.
*   **Fix**: Check if the API mock is correct and if the application logic actually triggers the call. Increase timeout if necessary (e.g., `{ timeout: 10000 }`).

### "Application Error" / White Screen
*   **Cause**: JavaScript error in the frontend (e.g., `undefined` property).
*   **Fix**: Check the browser console logs or use `cy.on('uncaught:exception')` to debug. Ensure mocks provide all expected data fields.
