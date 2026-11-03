import pytest
from fastapi.testclient import TestClient
import os

from main import app, get_db
from database import Base, engine, SessionLocal
from models import User

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_startup_seeds_users(client):
    # Verify initial seeded users are present
    response = client.get("/users")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 3
    emails = [u["email"] for u in data]
    assert "admin@gym.com" in emails
    assert "trainer.nam@gym.com" in emails
    assert "member.an@gym.com" in emails

def test_user_crud_flow(client):
    # 1. Create a new user with full_name
    new_user = {
        "email": "test.user@gym.com",
        "full_name": "Test User Name",
        "role": "member",
        "password": "secretpassword",
        "is_active": True
    }
    create_res = client.post("/users", json=new_user)
    assert create_res.status_code == 201
    created = create_res.json()
    user_id = created["id"]
    assert created["email"] == new_user["email"]
    assert created["full_name"] == "Test User Name"

    # 2. Get user by ID
    get_res = client.get(f"/users/{user_id}")
    assert get_res.status_code == 200
    assert get_res.json()["email"] == new_user["email"]
    assert get_res.json()["full_name"] == "Test User Name"

    # 3. Update user full_name and other fields
    update_data = {
        "email": "updated.user@gym.com",
        "full_name": "Updated User Name",
        "role": "trainer",
        "password": "newpassword123",
        "is_active": False
    }
    update_res = client.put(f"/users/{user_id}", json=update_data)
    assert update_res.status_code == 200
    assert update_res.json()["email"] == "updated.user@gym.com"
    assert update_res.json()["full_name"] == "Updated User Name"
    assert update_res.json()["is_active"] is False

    # 4. Delete user
    del_res = client.delete(f"/users/{user_id}")
    assert del_res.status_code == 200

    # 5. Verify deleted
    get_after_del = client.get(f"/users/{user_id}")
    assert get_after_del.status_code == 404

def test_user_login_success(client):
    # Admin login
    admin_res = client.post("/users/login", json={"email": "admin@gym.com", "password": "password123"})
    assert admin_res.status_code == 200
    data = admin_res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "admin@gym.com"
    assert data["user"]["role"] == "admin"
    assert "full_name" in data["user"]

    # Member login
    member_res = client.post("/users/login", json={"email": "member.an@gym.com", "password": "password123"})
    assert member_res.status_code == 200
    m_data = member_res.json()
    assert "access_token" in m_data
    assert m_data["user"]["email"] == "member.an@gym.com"
    assert m_data["user"]["role"] == "member"
    assert "full_name" in m_data["user"]

def test_user_login_invalid_credentials(client):
    # Wrong password
    res1 = client.post("/users/login", json={"email": "admin@gym.com", "password": "wrongpassword"})
    assert res1.status_code == 401
    assert "detail" in res1.json()

    # Non-existent email
    res2 = client.post("/users/login", json={"email": "nonexistent@gym.com", "password": "password123"})
    assert res2.status_code == 401

def test_password_hashing_and_verification(client):
    import uuid
    unique_email = f"hashed.{uuid.uuid4().hex[:8]}@gym.com"
    new_user = {
        "email": unique_email,
        "full_name": "Hashed User",
        "role": "member",
        "password": "mysecretpassword",
        "is_active": True
    }
    create_res = client.post("/users", json=new_user)
    assert create_res.status_code == 201
    user_id = create_res.json()["id"]

    # Verify that the password is not stored in plain text
    get_res = client.get(f"/users/{user_id}")
    assert get_res.status_code == 200
    stored_password = get_res.json()["password"]
    assert stored_password != "mysecretpassword"
    assert stored_password.startswith("$argon2")

    # Verify that login works with the plain password
    login_res = client.post("/users/login", json={"email": unique_email, "password": "mysecretpassword"})
    assert login_res.status_code == 200

    # Cleanup
    client.delete(f"/users/{user_id}")


def test_upgrade_user_role_from_user_to_member(client):
    import uuid
    import jwt
    from config import settings

    unique_email = f"user.{uuid.uuid4().hex[:8]}@gym.com"
    new_user = {
        "email": unique_email,
        "full_name": "New User Person",
        "role": "user",
        "password": "userpass123",
        "is_active": True
    }
    create_res = client.post("/users", json=new_user)
    assert create_res.status_code == 201
    user_id = create_res.json()["id"]
    assert create_res.json()["role"] == "user"
    assert create_res.json()["full_name"] == "New User Person"

    # User registers membership plan -> role should be upgraded to 'member'
    patch_res = client.patch(f"/users/{user_id}/role", json={"role": "member", "full_name": "Upgraded Member Person"})
    assert patch_res.status_code == 200
    res_data = patch_res.json()
    assert res_data["user"]["role"] == "member"
    assert res_data["user"]["full_name"] == "Upgraded Member Person"
    assert "access_token" in res_data

    # Token payload should have role 'member' and full_name
    decoded = jwt.decode(res_data["access_token"], settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    assert decoded["role"] == "member"
    assert decoded["full_name"] == "Upgraded Member Person"

    # Verify persisted in database
    get_res = client.get(f"/users/{user_id}")
    assert get_res.status_code == 200
    assert get_res.json()["role"] == "member"
    assert get_res.json()["full_name"] == "Upgraded Member Person"

    # Cleanup
    client.delete(f"/users/{user_id}")


def test_update_user_without_password(client):
    import uuid
    unique_email = f"nopass.{uuid.uuid4().hex[:8]}@gym.com"
    new_user = {
        "email": unique_email,
        "full_name": "No Pass User",
        "role": "user",
        "password": "originalpassword",
        "is_active": True
    }
    create_res = client.post("/users", json=new_user)
    assert create_res.status_code == 201
    user_id = create_res.json()["id"]

    # Update without supplying password
    update_res = client.put(f"/users/{user_id}", json={
        "email": unique_email,
        "full_name": "Updated No Pass User",
        "role": "member",
        "is_active": True
    })
    assert update_res.status_code == 200
    assert update_res.json()["role"] == "member"
    assert update_res.json()["full_name"] == "Updated No Pass User"

    # Verify original password still works for login
    login_res = client.post("/users/login", json={"email": unique_email, "password": "originalpassword"})
    assert login_res.status_code == 200

    # Cleanup
    client.delete(f"/users/{user_id}")
