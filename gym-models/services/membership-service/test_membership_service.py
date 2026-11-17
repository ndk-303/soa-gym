import pytest
from fastapi.testclient import TestClient

from main import app

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_startup_seeds_membership(client):
    # Verify seeded plans
    res_plans = client.get("/membership-plans")
    assert res_plans.status_code == 200
    plans = res_plans.json()
    assert len(plans) >= 3
    plan_names = [p["name"] for p in plans]
    assert "Goi 1 Thang Co Ban" in plan_names

    # Verify seeded members
    res_members = client.get("/members")
    assert res_members.status_code == 200
    members = res_members.json()
    assert len(members) >= 1
    assert members[0]["email"] == "member.an@gym.com"

def test_membership_plan_crud(client):
    new_plan = {
        "name": "Goi Thu Nghiem",
        "duration_days": 15,
        "price": 250000.0,
        "is_active": True
    }
    # Create
    create_res = client.post("/membership-plans", json=new_plan)
    assert create_res.status_code == 201
    plan_id = create_res.json()["id"]

    # Read
    get_res = client.get(f"/membership-plans/{plan_id}")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Goi Thu Nghiem"

    # Update
    update_res = client.put(f"/membership-plans/{plan_id}", json={
        "name": "Goi Thu Nghiem VIP",
        "duration_days": 20,
        "price": 300000.0,
        "is_active": False
    })
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Goi Thu Nghiem VIP"

    # Delete
    del_res = client.delete(f"/membership-plans/{plan_id}")
    assert del_res.status_code == 200
    assert client.get(f"/membership-plans/{plan_id}").status_code == 404

def test_member_crud(client):
    new_member = {
        "user_id": 99,
        "full_name": "Tran Van Test",
        "email": "tranvantest@gym.com",
        "status": "active",
        "membership_plan_id": 1
    }
    # Create
    create_res = client.post("/members", json=new_member)
    assert create_res.status_code == 201
    member_id = create_res.json()["id"]

    # Read
    get_res = client.get(f"/members/{member_id}")
    assert get_res.status_code == 200
    assert get_res.json()["full_name"] == "Tran Van Test"

    # Update
    update_res = client.put(f"/members/{member_id}", json={
        "user_id": 99,
        "full_name": "Tran Van Test Updated",
        "email": "tranvantest@gym.com",
        "status": "suspended",
        "membership_plan_id": 2
    })
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "suspended"

    # Delete
    del_res = client.delete(f"/members/{member_id}")
    assert del_res.status_code == 200
    assert client.get(f"/members/{member_id}").status_code == 404


def test_duplicate_member_and_invalid_plan(client):
    # 1. Creating a member with non-existent membership_plan_id returns 400
    bad_plan_res = client.post("/members", json={
        "user_id": 99991,
        "full_name": "Invalid Plan Member",
        "email": "invalidplan99991@gym.com",
        "status": "active",
        "membership_plan_id": 999999,
    })
    assert bad_plan_res.status_code == 400
    assert "plan" in bad_plan_res.json()["detail"].lower()

    # 2. Create a valid member, then test duplicate user_id and duplicate email -> 409
    res = client.post("/members", json={
        "user_id": 99992,
        "full_name": "Unique Member",
        "email": "uniquemember99992@gym.com",
        "status": "active",
        "membership_plan_id": 1,
    })
    assert res.status_code == 201
    member_id = res.json()["id"]

    try:
        dup_uid = client.post("/members", json={
            "user_id": 99992,
            "full_name": "Other Name",
            "email": "other99992@gym.com",
            "status": "active",
            "membership_plan_id": 1,
        })
        assert dup_uid.status_code == 409

        dup_email = client.post("/members", json={
            "user_id": 99993,
            "full_name": "Other Name",
            "email": "uniquemember99992@gym.com",
            "status": "active",
            "membership_plan_id": 1,
        })
        assert dup_email.status_code == 409

        # Duplicate plan name returns 409
        dup_plan = client.post("/membership-plans", json={
            "name": "Goi 1 Thang Co Ban",
            "duration_days": 30,
            "price": 500000.0,
            "is_active": True,
        })
        assert dup_plan.status_code == 409
    finally:
        client.delete(f"/members/{member_id}")
