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


def test_duplicate_booking_409_and_waitlist_fifo_promotion(client):
    from unittest.mock import patch
    from sqlalchemy.exc import SQLAlchemyError

    created_ids = []
    try:
        # 1. Create first confirmed booking on slot 999
        with patch("main.sync_increment_slot", return_value="confirmed"):
            r1 = client.post("/bookings", json={"member_id": 901, "slot_id": 999, "status": "confirmed"})
            assert r1.status_code == 201
            b1_id = r1.json()["id"]
            created_ids.append(b1_id)
            assert r1.json()["status"] == "confirmed"

            # 2. Duplicate booking for same member + slot -> 409 Conflict
            r_dup = client.post("/bookings", json={"member_id": 901, "slot_id": 999, "status": "confirmed"})
            assert r_dup.status_code == 409

        # 3. Slot is full -> next confirmed bookings automatically become waitlisted FIFO (pos 1, pos 2)
        with patch("main.sync_increment_slot", return_value="waitlisted"):
            r2 = client.post("/bookings", json={"member_id": 902, "slot_id": 999, "status": "confirmed"})
            assert r2.status_code == 201
            b2_id = r2.json()["id"]
            created_ids.append(b2_id)
            assert r2.json()["status"] == "waitlisted"
            assert r2.json()["waitlist_position"] == 1

            r3 = client.post("/bookings", json={"member_id": 903, "slot_id": 999, "status": "confirmed"})
            assert r3.status_code == 201
            b3_id = r3.json()["id"]
            created_ids.append(b3_id)
            assert r3.json()["status"] == "waitlisted"
            assert r3.json()["waitlist_position"] == 2

        # 4. Delete b1 (confirmed) -> decrements slot and promotes b2 (FIFO #1) to confirmed
        with patch("main.sync_decrement_slot") as mock_dec, patch("main.sync_increment_slot", return_value="confirmed") as mock_inc:
            del_r1 = client.delete(f"/bookings/{b1_id}")
            assert del_r1.status_code == 200
            created_ids.remove(b1_id)
            mock_dec.assert_called_once_with(999)
            mock_inc.assert_called_once_with(999)

        b2_after = client.get(f"/bookings/{b2_id}").json()
        assert b2_after["status"] == "confirmed"
        assert b2_after["waitlist_position"] is None

        b3_after = client.get(f"/bookings/{b3_id}").json()
        assert b3_after["status"] == "waitlisted"

        # 5. Saga compensating transaction: if DB commit fails after slot increment, sync_decrement_slot runs
        with patch("main.sync_increment_slot", return_value="confirmed"), \
             patch("main.sync_decrement_slot") as mock_comp_dec, \
             patch("sqlalchemy.orm.Session.commit", side_effect=SQLAlchemyError("simulated commit failure")):
            r_fail = client.post("/bookings", json={"member_id": 904, "slot_id": 999, "status": "confirmed"})
            assert r_fail.status_code == 500
            mock_comp_dec.assert_called_once_with(999)
    finally:
        with patch("main.sync_decrement_slot"), patch("main.sync_increment_slot", return_value="waitlisted"):
            for bid in list(created_ids):
                client.delete(f"/bookings/{bid}")
