---
trigger: always_on
---

# Testing Strategy & Rules

## Backend Testing (pytest)

### Running Tests

**IMPORTANT**: Always set `PYTHONPATH=.` when running tests inside the container to ensure the `app` module is discoverable.

```bash
# turbo
docker exec -t -e PYTHONPATH=. headhunter_backend pytest tests/ -v

# Run specific test file
docker exec -t -e PYTHONPATH=. headhunter_backend pytest tests/test_invite_system.py -v

# Run with coverage
docker exec -t -e PYTHONPATH=. headhunter_backend pytest tests/ --cov=app --cov-report=term-missing
```

### Writing Tests

1. **Test File Naming**: Name test files as `test_<module_name>.py`.
2. **Test Function Naming**: Name test functions as `test_<description>`.
3. **Use Fixtures**: Use `conftest.py` fixtures for common setup (e.g., `db`, `client`, `authenticated_client`).

### Mocking External Services

When tests call endpoints that trigger external services (email, SMTP, etc.), **always mock** them to avoid real connections:

```python
from unittest.mock import patch, AsyncMock

@patch("app.core.email.send_team_invite_email", new_callable=AsyncMock)
def test_invite_user(mock_email, authenticated_client, db):
    # Test logic here
    response = authenticated_client.post("/users/invite", json={...})
    mock_email.assert_called_once()
```

**Patch Path Rule**: Use the module path where the function is **defined**, not where it's imported.

- ✅ `@patch("app.core.email.send_team_invite_email")`
- ❌ `@patch("app.api.v1.users.send_team_invite_email")`

### Database Tests

- Tests use an in-memory SQLite database by default (see `conftest.py`).
- For integration tests, use the E2E database seeding script:

  ```bash
  docker exec -t -e PYTHONPATH=. -e AUTO_CONFIRM=true headhunter_backend_e2e python tests/seed_test_data.py
  ```

---

## Frontend Testing (Cypress E2E)

### Running E2E Tests

1. **Start E2E Environment**:

   ```bash
   docker compose -f docker-compose.e2e.yml up -d
   ```

2. **Seed Database** (if needed):

   ```bash
   docker exec -t -e PYTHONPATH=. -e AUTO_CONFIRM=true headhunter_backend_e2e python tests/seed_test_data.py
   ```

3. **Run Tests**:

   ```bash
   # turbo
   docker exec -t headhunter_cypress_e2e npx cypress run

   # Specific spec file
   docker exec -t headhunter_cypress_e2e npx cypress run --spec "cypress/e2e/e2e_invite_flow.cy.js"
   ```

### Writing E2E Tests

- Place tests in `frontend/cypress/e2e/`.
- Use `cy.loginViaAPI()` for authentication (custom command in `commands.js`).
- Use unique selectors (e.g., `data-cy` attributes or unique IDs).

---

## Linting

### Backend (Ruff)

```bash
docker exec -t headhunter_backend ruff check .
```

### Frontend (ESLint)

```bash
# turbo
docker exec -t headhunter_frontend npm run lint
```

---

## CI/CD Notes

- GitHub Actions uses the same commands but with appropriate environment variables.
- Email sending is suppressed in CI by mocking (see backend test examples above).
- Always ensure `PYTHONPATH` is set in workflows.
