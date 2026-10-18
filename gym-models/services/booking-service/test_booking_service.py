import pytest
from fastapi.testclient import TestClient

from main import app

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_startup_seeds_booking(client):
    res = client.get("/bookings")
    assert res.status_code == 200
    bookings = res.json()
    assert len(bookings) >= 1
    assert bookings[0]["member_id"] == 1
    assert bookings[0]["status"] == "confirmed"

def test_booking_crud(client):
    new_booking = {
        "member_id": 2,
        "slot_id": 1,
        "status": "waitlisted",
        "waitlist_position": 1
    }
    # Create
    create_res = client.post("/bookings", json=new_booking)
    assert create_res.status_code == 201
    booking_id = create_res.json()["id"]

    # Read
    get_res = client.get(f"/bookings/{booking_id}")
    assert get_res.status_code == 200
    assert get_res.json()["status"] == "waitlisted"

    # Update
    update_res = client.put(f"/bookings/{booking_id}", json={
        "member_id": 2,
        "slot_id": 1,
        "status": "confirmed",
        "waitlist_position": None
    })
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "confirmed"
    assert update_res.json()["waitlist_position"] is None

    # Delete
    del_res = client.delete(f"/bookings/{booking_id}")
    assert del_res.status_code == 200
    assert client.get(f"/bookings/{booking_id}").status_code == 404
