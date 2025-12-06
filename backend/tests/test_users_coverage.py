from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.models import User, UserRole, Company
from app.core.security import get_password_hash

def test_create_user_domain_mismatch(client: TestClient, db: Session):
    # Setup Admin
    admin = User(email="admin@domain1.com", hashed_password=get_password_hash("pass"), role=UserRole.ADMIN, company_id=1, is_verified=True)
    db.add(admin)
    db.commit()
    
    login_res = client.post("/auth/login", data={"username": "admin@domain1.com", "password": "pass"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Try create user with different domain
    res = client.post("/users/", json={"email": "user@domain2.com", "password": "pass"}, headers=headers)
    assert res.status_code == 400
    assert "domain" in res.json()["detail"]

def test_delete_user_self(client: TestClient, db: Session):
    # Setup Admin
    admin = User(email="admin@self.com", hashed_password=get_password_hash("pass"), role=UserRole.ADMIN, company_id=1, is_verified=True)
    db.add(admin)
    db.commit()
    
    login_res = client.post("/auth/login", data={"username": "admin@self.com", "password": "pass"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Try delete self
    res = client.delete(f"/users/{admin.id}", headers=headers)
    assert res.status_code == 400
    assert "yourself" in res.json()["detail"]

def test_cross_company_access(client: TestClient, db: Session):
    # Setup Company 1 Admin
    c1 = Company(name="C1", domain="c1.com")
    db.add(c1)
    db.commit()
    admin1 = User(email="admin@c1.com", hashed_password=get_password_hash("pass"), role=UserRole.ADMIN, company_id=c1.id, is_verified=True)
    db.add(admin1)
    
    # Setup Company 2 User
    c2 = Company(name="C2", domain="c2.com")
    db.add(c2)
    db.commit()
    user2 = User(email="user@c2.com", hashed_password=get_password_hash("pass"), role=UserRole.RECRUITER, company_id=c2.id)
    db.add(user2)
    db.commit()
    
    login_res = client.post("/auth/login", data={"username": "admin@c1.com", "password": "pass"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Try Delete User from C2
    res = client.delete(f"/users/{user2.id}", headers=headers)
    assert res.status_code == 403
    
    # 2. Try Update Role User from C2
    res = client.patch(f"/users/{user2.id}", json={"role": "admin"}, headers=headers)
    assert res.status_code == 404 # Code returns 404 for not found/not authorized combo in update
    
    # 3. Try Update Role Dedicated User from C2
    res = client.patch(f"/users/{user2.id}/role", json={"role": "admin"}, headers=headers)
    assert res.status_code == 404
