# backend/tests/conftest.py
import os
import pytest

# Set environment variables for testing before importing app components
# This prevents validation errors in app/core/config.py
os.environ["LOGS_DATABASE_URL"] = "sqlite:///:memory:"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["ALLOW_MISSING_LOGS_DB"] = "true"
os.environ["TESTING"] = "true"

# Monkey patch JSONB to be JSON for SQLite compatibility (SystemLog/LLMLog use JSONB)
import sqlalchemy.dialects.postgresql
from sqlalchemy.types import JSON
sqlalchemy.dialects.postgresql.JSONB = JSON

from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402
from app.core.database import get_db, Base  # noqa: E402
from app.core.database_logs import engine_logs  # noqa: E402
from app.models.log_models import LogBase  # noqa: E402
from app.models.models import User, Company, UserRole  # noqa: E402
from app.core.security import get_password_hash, create_access_token  # noqa: E402
from fastapi_cache import FastAPICache  # noqa: E402
from fastapi_cache.backends.inmemory import InMemoryBackend  # noqa: E402

# In-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}, 
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(autouse=True)
def init_test_cache():
    FastAPICache.init(InMemoryBackend(), prefix="test-cache")
    yield

@pytest.fixture(scope="function")
def db():
    # Create tables for both Main DB and Logs DB
    Base.metadata.create_all(bind=engine)
    LogBase.metadata.create_all(bind=engine_logs)
    
    session = TestingSessionLocal()
    yield session
    session.close()
    
    # Drop tables
    Base.metadata.drop_all(bind=engine)
    LogBase.metadata.drop_all(bind=engine_logs)

@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass # Do not close the session here, let the fixture handle it
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)

@pytest.fixture(scope="function")
def test_company(db):
    """Create a test company for use in tests."""
    company = Company(
        name="Test Company",
        domain="testcompany.com",
        industry="Technology",
        description="A test company",
        tagline="Testing made easy",
        website="https://testcompany.com"
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return company

@pytest.fixture(scope="function")
def authenticated_client(db):
    """Create a test client with an authenticated user"""
    # Create test company
    company = Company(
        name="Test Company",
        domain="test.com",
        industry="Technology",
        description="Test company for testing"
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    
    # Create test user
    user = User(
        email="admin@test.com",
        hashed_password=get_password_hash("testpassword"),
        role=UserRole.ADMIN,
        company_id=company.id,
        is_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create access token
    token = create_access_token({"sub": user.email})
    
    # Override get_db dependency
    def override_get_db():
        try:
            yield db
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    
    # Create client with auth header
    test_client = TestClient(app)
    test_client.headers = {"Authorization": f"Bearer {token}"}
    yield test_client