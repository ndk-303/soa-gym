from concurrent.futures import ThreadPoolExecutor
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient

from database import SessionLocal
from main import app
from models import AttendanceRecord


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def _cleanup_member_attendance(member_ids):
    db = SessionLocal()
    try:
        db.query(AttendanceRecord).filter(AttendanceRecord.member_id.in_(member_ids)).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()


def _mock_member_response(status_code=200, member_status="active", plan_id=1):
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = {"id": 888, "status": member_status, "membership_plan_id": plan_id}
    return resp


def test_startup_seeds_attendance(client):
    res = client.get("/attendance")
    assert res.status_code == 200
    records = res.json()
    assert len(records) >= 1


def test_attendance_checkin_checkout_and_double_checkin_409(client):
    test_member_id = 8881
    _cleanup_member_attendance([test_member_id])

    try:
        with patch("httpx.get", return_value=_mock_member_response(200, "active", 1)):
            # 1. First check-in succeeds
            res1 = client.post("/attendance", json={
                "member_id": test_member_id,
                "status": "checked_in",
                "check_in_time": "2026-11-17 09:00:00",
                "check_out_time": None,
                "notes": "Morning workout",
            })
            assert res1.status_code == 201
            rec1_id = res1.json()["id"]
            assert res1.json()["status"] == "checked_in"

            # 2. Second check-in while already checked_in -> 409 Conflict
            res_dup = client.post("/attendance", json={
                "member_id": test_member_id,
                "status": "checked_in",
                "check_in_time": "2026-11-17 09:05:00",
                "check_out_time": None,
                "notes": "Double check-in",
            })
            assert res_dup.status_code == 409

            # 3. Check-out via PUT -> 200 OK
            res_out = client.put(f"/attendance/{rec1_id}", json={
                "member_id": test_member_id,
                "status": "checked_out",
                "check_in_time": "2026-11-17 09:00:00",
                "check_out_time": "2026-11-17 10:00:00",
                "notes": "Morning workout",
            })
            assert res_out.status_code == 200
            assert res_out.json()["status"] == "checked_out"

            # 4. After check-out, new check-in succeeds -> 201 Created
            res2 = client.post("/attendance", json={
                "member_id": test_member_id,
                "status": "checked_in",
                "check_in_time": "2026-11-17 17:00:00",
                "check_out_time": None,
                "notes": "Evening session",
            })
            assert res2.status_code == 201
    finally:
        _cleanup_member_attendance([test_member_id])


def test_concurrent_double_checkin_allows_only_one(client):
    test_member_id = 8882
    _cleanup_member_attendance([test_member_id])

    try:
        with patch("httpx.get", return_value=_mock_member_response(200, "active", 1)):
            def attempt_checkin(_):
                return client.post("/attendance", json={
                    "member_id": test_member_id,
                    "status": "checked_in",
                    "check_in_time": "2026-11-17 11:00:00",
                    "check_out_time": None,
                    "notes": "Concurrent click",
                }).status_code

            with ThreadPoolExecutor(max_workers=4) as pool:
                codes = list(pool.map(attempt_checkin, range(4)))

            assert codes.count(201) == 1
            assert codes.count(409) == 3
    finally:
        _cleanup_member_attendance([test_member_id])


def test_attendance_membership_service_validation(client):
    test_member_id = 8883
    _cleanup_member_attendance([test_member_id])

    try:
        # Inactive member -> 403
        with patch("httpx.get", return_value=_mock_member_response(200, "suspended", 1)):
            res_inactive = client.post("/attendance", json={
                "member_id": test_member_id,
                "status": "checked_in",
                "check_in_time": "2026-11-17 12:00:00",
                "check_out_time": None,
                "notes": "",
            })
            assert res_inactive.status_code == 403

        # Member without plan -> 403
        with patch("httpx.get", return_value=_mock_member_response(200, "active", None)):
            res_no_plan = client.post("/attendance", json={
                "member_id": test_member_id,
                "status": "checked_in",
                "check_in_time": "2026-11-17 12:00:00",
                "check_out_time": None,
                "notes": "",
            })
            assert res_no_plan.status_code == 403

        # Non-existent member -> 404
        with patch("httpx.get", return_value=_mock_member_response(404)):
            res_missing = client.post("/attendance", json={
                "member_id": test_member_id,
                "status": "checked_in",
                "check_in_time": "2026-11-17 12:00:00",
                "check_out_time": None,
                "notes": "",
            })
            assert res_missing.status_code == 404
    finally:
        _cleanup_member_attendance([test_member_id])
