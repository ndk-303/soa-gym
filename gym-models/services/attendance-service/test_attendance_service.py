import pytest
from fastapi.testclient import TestClient

from main import app

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_startup_seeds_attendance(client):
    res = client.get("/attendance")
    assert res.status_code == 200
    records = res.json()
    assert len(records) >= 1
    assert records[0]["status"] == "checked_in"

def test_attendance_crud(client):
    new_record = {
        "member_id": 2,
        "status": "checked_in",
        "check_in_time": "2026-10-18 09:00:00",
        "check_out_time": None,
        "notes": "Tap gym chieu"
    }
    # Create
    create_res = client.post("/attendance", json=new_record)
    assert create_res.status_code == 201
    record_id = create_res.json()["id"]

    # Read
    get_res = client.get(f"/attendance/{record_id}")
    assert get_res.status_code == 200
    assert get_res.json()["member_id"] == 2

    # Update
    update_res = client.put(f"/attendance/{record_id}", json={
        "member_id": 2,
        "status": "checked_out",
        "check_in_time": "2026-10-18 09:00:00",
        "check_out_time": "2026-10-18 10:30:00",
        "notes": "Da ve"
    })
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "checked_out"
    assert update_res.json()["check_out_time"] == "2026-10-18 10:30:00"

    # Delete
    del_res = client.delete(f"/attendance/{record_id}")
    assert del_res.status_code == 200
    assert client.get(f"/attendance/{record_id}").status_code == 404
