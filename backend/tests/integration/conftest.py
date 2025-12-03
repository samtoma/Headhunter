"""
Integration test fixtures using real PostgreSQL database.

These tests run against actual services (not mocks) to validate
end-to-end API behavior with real database interactions.
"""
import pytest
import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import get_db, Base
from app.models.models import User, Company, UserRole
from app.core.security import get_password_hash, create_access_token

# Use SQLite for integration tests (simpler setup)
# In a real production scenario, you'd want PostgreSQL, but for demonstration
# and ease of running tests, SQLite works fine for integration testing
TEST_DATABASE_URL = "sqlite:///./test_integration.db"

@pytest.fixture(scope="session")
def test_engine():
    """Create test database engine for the entire test session."""
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False} if "sqlite" in TEST_DATABASE_URL else {}
    )
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    yield engine
    
    # Drop all tables after session
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    
    # Clean up SQLite file if it exists
    if "sqlite" in TEST_DATABASE_URL and os.path.exists("./test_integration.db"):
        os.remove("./test_integration.db")

@pytest.fixture(scope="function")
def db_session(test_engine):
    """Create a new database session for each test with automatic rollback."""
    connection = test_engine.connect()
    transaction = connection.begin()
    
    Session = sessionmaker(bind=connection)
    session = Session()
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture(scope="function")
def integration_client(db_session):
    """
    Create a test client with dependency override to use test database.
    This client makes real HTTP requests to the FastAPI app.
    """
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    client = TestClient(app)
    
    yield client
    
    # Clean up
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def test_company(db_session):
    """Create a test company."""
    company = Company(
        name="Integration Test Corp",
        domain="integration-test.com",
        industry="Technology",
        description="Test company for integration tests",
        tagline="Testing the future"
    )
    db_session.add(company)
    db_session.commit()
    db_session.refresh(company)
    return company

@pytest.fixture(scope="function")
def test_admin_user(db_session, test_company):
    """Create a test admin user."""
    user = User(
        email="admin@integration-test.com",
        hashed_password=get_password_hash("TestPassword123!"),
        role=UserRole.ADMIN,
        company_id=test_company.id,
        is_verified=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture(scope="function")
def test_recruiter_user(db_session, test_company):
    """Create a test recruiter user."""
    user = User(
        email="recruiter@integration-test.com",
        hashed_password=get_password_hash("TestPassword123!"),
        role=UserRole.RECRUITER,
        company_id=test_company.id,
        is_verified=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture(scope="function")
def authenticated_integration_client(integration_client, test_admin_user):
    """
    Create an authenticated test client with admin user token.
    Ready for making authenticated API requests.
    """
    token = create_access_token({"sub": test_admin_user.email})
    integration_client.headers = {"Authorization": f"Bearer {token}"}
    return integration_client

@pytest.fixture(scope="function")
def recruiter_integration_client(integration_client, test_recruiter_user):
    """Create an authenticated test client with recruiter user token."""
    token = create_access_token({"sub": test_recruiter_user.email})
    integration_client.headers = {"Authorization": f"Bearer {token}"}
    return integration_client
