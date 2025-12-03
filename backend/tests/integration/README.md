# Integration Tests

This directory is reserved for integration tests that test API endpoints with real database connections.

## Structure

Integration tests should:
- Use real database connections (via `conftest.py` fixtures)
- Test actual HTTP requests to FastAPI endpoints
- Validate multi-tenancy and RBAC
- Mock only external services (OpenAI, etc.)

## Running Integration Tests

```bash
docker exec headhunter_backend python -m pytest tests/integration/ -v
```

## Writing Integration Tests

Example structure:

```python
def test_api_endpoint(integration_client, test_company):
    response = integration_client.get("/api/v1/endpoint")
    assert response.status_code == 200
```

See `conftest.py` for available fixtures.
