from app.models.models import UserRole, Company, User

def test_company_crud_regular_user(authenticated_client, db):
    """Test company operations for a regular user (Admin of their company)"""
    client = authenticated_client
    
    # 1. Get My Company
    res = client.get("/companies/me")
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Test Company"
    
    # 2. Update My Company
    res = client.patch("/companies/me", json={"description": "Updated Desc"})
    assert res.status_code == 200
    assert res.json()["description"] == "Updated Desc"
    
    # 3. Try to access Super Admin routes (Should fail)
    res = client.get("/companies/")
    assert res.status_code == 403
    
    res = client.patch("/companies/1", json={"name": "Hacked"})
    assert res.status_code == 403

def test_company_super_admin(client, db):
    """Test Super Admin specific endpoints"""
    # Create Super Admin
    sa_email = "super@admin.com"
    sa_user = User(
        email=sa_email, 
        hashed_password="hash", 
        role=UserRole.SUPER_ADMIN,
        is_active=True
    )
    db.add(sa_user)
    db.commit()
    
    # Login as Super Admin
    # We need to mock login or create a token manually
    from app.core.security import create_access_token
    token = create_access_token(data={"sub": sa_email})
    client.headers = {"Authorization": f"Bearer {token}"}
    
    # Create some companies
    c1 = Company(name="C1", domain="c1.com")
    c2 = Company(name="C2", domain="c2.com")
    db.add(c1)
    db.add(c2)
    db.commit()
    
    # 1. Super Admin without company_id gets null from /companies/me
    # This is the fix for noisy 404 error logs
    res = client.get("/companies/me")
    assert res.status_code == 200
    assert res.json() is None, "Super Admin should get null, not 404"
    
    # 2. List Companies
    res = client.get("/companies/")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 2
    
    # 3. Update Company by ID
    res = client.patch(f"/companies/{c1.id}", json={"name": "C1 Updated"})
    assert res.status_code == 200
    assert res.json()["name"] == "C1 Updated"
    
    # 4. Get Company Users
    # Add user to C1
    u1 = User(email="u1@c1.com", hashed_password="pw", company_id=c1.id, role="recruiter")
    db.add(u1)
    db.commit()
    
    res = client.get(f"/companies/{c1.id}/users")
    assert res.status_code == 200
    assert len(res.json()) >= 1
    
    # 5. Get Company Jobs
    res = client.get(f"/companies/{c1.id}/jobs")
    assert res.status_code == 200

def test_company_edge_cases(client, db):
    # User without company
    u_no_comp = User(email="nocomp@test.com", hashed_password="pw", role="recruiter")
    db.add(u_no_comp)
    db.commit()
    
    from app.core.security import create_access_token
    token = create_access_token(data={"sub": "nocomp@test.com"})
    client.headers = {"Authorization": f"Bearer {token}"}
    
    # Users without company now get 200 with null (not 404)
    # This prevents noisy error logs for Super Admins
    res = client.get("/companies/me")
    assert res.status_code == 200
    assert res.json() is None
    
    res = client.patch("/companies/me", json={"name": "New"})
    assert res.status_code == 404
