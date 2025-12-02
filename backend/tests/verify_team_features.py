import requests
import sys
import time

BASE_URL = "http://127.0.0.1:30001"

def login(email, password):
    res = requests.post(f"{BASE_URL}/auth/login", data={"username": email, "password": password})
    if res.status_code != 200:
        print(f"Login failed for {email}: {res.text}")
        sys.exit(1)
    return res.json()["access_token"]

def verify_team_features():
    print("--- Verifying Team Features ---")
    
    # 1. Login as Company Admin
    print("Logging in as Company Admin...")
    token = login("samuel.toma@tpaymobile.com", "password123")
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Create User with Department
    new_email = f"teammate{int(time.time())}@tpaymobile.com"
    print(f"Creating new user {new_email} with Department 'Engineering'...")
    user_data = {
        "email": new_email,
        "password": "password123",
        "role": "interviewer",
        "department": "Engineering"
    }
    res = requests.post(f"{BASE_URL}/users/", json=user_data, headers=headers)
    if res.status_code != 200:
        print(f"Failed to create user: {res.text}")
        sys.exit(1)
    
    user = res.json()
    print(f"Created User: ID={user['id']}, Dept={user.get('department')}")
    
    if user.get("department") != "Engineering":
        print("FAILURE: Department not set correctly on creation")
        sys.exit(1)
        
    user_id = user["id"]
    
    # 3. Update User Role and Department
    print("Updating user role to 'recruiter' and Department to 'HR'...")
    update_data = {
        "role": "recruiter",
        "department": "HR"
    }
    res = requests.patch(f"{BASE_URL}/users/{user_id}/role", json=update_data, headers=headers)
    if res.status_code != 200:
        print(f"Failed to update user: {res.text}")
        sys.exit(1)
        
    updated_user = res.json()
    print(f"Updated User: Role={updated_user['role']}, Dept={updated_user.get('department')}")
    
    if updated_user["role"] != "recruiter" or updated_user.get("department") != "HR":
        print("FAILURE: Role or Department update failed")
        sys.exit(1)
        
    # 4. Verify Login Count (should be 0 initially)
    if updated_user.get("login_count", -1) != 0:
         print(f"FAILURE: Login count is {updated_user.get('login_count')}, expected 0")
         
    # 5. Cleanup
    print("Cleaning up (deleting user)...")
    requests.delete(f"{BASE_URL}/users/{user_id}", headers=headers)
    
    print("SUCCESS: Team features verified!")

if __name__ == "__main__":
    verify_team_features()
