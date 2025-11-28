# backend/tests/conftest.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import get_db, Base
from app.models.models import User, Company, UserRole
from app.core.security import get_password_hash, create_access_token

# In-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}, 
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            db.close()
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)

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
        full_name="Test Admin",
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
            db.close()
    app.dependency_overrides[get_db] = override_get_db
    
    # Create client with auth header
    test_client = TestClient(app)
    test_client.headers = {"Authorization": f"Bearer {token}"}
    yield test_client