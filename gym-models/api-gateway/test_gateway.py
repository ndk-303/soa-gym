import os
import sys
import pytest
from fastapi.testclient import TestClient
import httpx
from unittest.mock import AsyncMock, patch

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from main import app, match_service_url

client = TestClient(app)

def test_route_matching():
    # Verify standard routes match correctly
    assert match_service_url("/api/users") == ("http://127.0.0.1:8001", "/users")
    assert match_service_url("/users") == ("http://127.0.0.1:8001", "/users")
    assert match_service_url("/users/1") == ("http://127.0.0.1:8001", "/users/1")
    assert match_service_url("/users/") == ("http://127.0.0.1:8001", "/users")

    # Membership routes
    assert match_service_url("/api/membership-plans") == ("http://127.0.0.1:8002", "/membership-plans")
    assert match_service_url("/membership-plans") == ("http://127.0.0.1:8002", "/membership-plans")
    assert match_service_url("/api/members") == ("http://127.0.0.1:8002", "/members")
    assert match_service_url("/members") == ("http://127.0.0.1:8002", "/members")

    # Class routes
    assert match_service_url("/api/gym-classes") == ("http://127.0.0.1:8003", "/gym-classes")
    assert match_service_url("/gym-classes") == ("http://127.0.0.1:8003", "/gym-classes")
    assert match_service_url("/api/class-slots") == ("http://127.0.0.1:8003", "/class-slots")
    assert match_service_url("/class-slots") == ("http://127.0.0.1:8003", "/class-slots")

    # Booking routes
    assert match_service_url("/api/bookings") == ("http://127.0.0.1:8004", "/bookings")
    assert match_service_url("/bookings") == ("http://127.0.0.1:8004", "/bookings")

    # Billing routes
    assert match_service_url("/api/invoices") == ("http://127.0.0.1:8005", "/invoices")
    assert match_service_url("/invoices") == ("http://127.0.0.1:8005", "/invoices")
    assert match_service_url("/api/payments") == ("http://127.0.0.1:8005", "/payments")
    assert match_service_url("/payments") == ("http://127.0.0.1:8005", "/payments")

    # Attendance routes
    assert match_service_url("/api/attendances") == ("http://127.0.0.1:8006", "/attendance")
    assert match_service_url("/attendance") == ("http://127.0.0.1:8006", "/attendance")
    assert match_service_url("/attendance/1") == ("http://127.0.0.1:8006", "/attendance/1")

def test_unreachable_service_returns_503():
    # If a service is offline, proxy should return 503
    with patch("httpx.AsyncClient.request", side_effect=httpx.ConnectError("Connection refused")):
        response = client.get("/api/users")
        assert response.status_code == 503
        assert "unavailable" in response.json()["detail"].lower()


def test_composite_bookings_endpoint():
    mock_bookings = [{"id": 1, "member_id": 10, "slot_id": 20, "status": "confirmed"}]
    mock_members = [{"id": 10, "full_name": "Tran Van B", "email": "b@gym.com"}]
    mock_slots = [{"id": 20, "class_id": 30, "start_time": "2026-10-20 08:00:00", "max_capacity": 20, "current_bookings": 1}]
    mock_classes = [{"id": 30, "name": "Pilates Core", "category": "Pilates"}]

    async def mock_fetch_json(client, url):
        if "bookings" in url:
            return mock_bookings
        elif "members" in url:
            return mock_members
        elif "class-slots" in url:
            return mock_slots
        elif "gym-classes" in url:
            return mock_classes
        return None

    with patch("main.fetch_json", side_effect=mock_fetch_json):
        res = client.get("/api/composite/bookings")
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 1
        assert data[0]["id"] == 1
        assert data[0]["member"]["full_name"] == "Tran Van B"
        assert data[0]["slot"]["start_time"] == "2026-10-20 08:00:00"
        assert data[0]["slot"]["class"]["name"] == "Pilates Core"


def test_composite_invoices_endpoint():
    mock_invoices = [{"id": 1, "member_id": 10, "amount": 500000.0, "amount_paid": 500000.0, "status": "paid"}]
    mock_members = [{"id": 10, "full_name": "Tran Van B", "email": "b@gym.com"}]

    async def mock_fetch_json(client, url):
        if "invoices" in url:
            return mock_invoices
        elif "members" in url:
            return mock_members
        return None

    with patch("main.fetch_json", side_effect=mock_fetch_json):
        res = client.get("/api/composite/invoices")
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 1
        assert data[0]["id"] == 1
        assert data[0]["member"]["full_name"] == "Tran Van B"


def test_composite_payments_endpoint():
    mock_payments = [{"id": 1, "invoice_id": 5, "amount": 500000.0, "payment_method": "cash"}]
    mock_invoices = [{"id": 5, "member_id": 10, "amount": 500000.0}]
    mock_members = [{"id": 10, "full_name": "Tran Van B", "email": "b@gym.com"}]

    async def mock_fetch_json(client, url):
        if "payments" in url:
            return mock_payments
        elif "invoices" in url:
            return mock_invoices
        elif "members" in url:
            return mock_members
        return None

    with patch("main.fetch_json", side_effect=mock_fetch_json):
        res = client.get("/api/composite/payments")
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 1
        assert data[0]["id"] == 1
        assert data[0]["invoice"]["id"] == 5
        assert data[0]["member"]["full_name"] == "Tran Van B"


def test_composite_attendance_endpoint():
    mock_attendance = [{"id": 1, "member_id": 10, "status": "checked_in", "check_in_time": "2026-10-19 09:00:00"}]
    mock_members = [{"id": 10, "full_name": "Tran Van B", "email": "b@gym.com"}]

    async def mock_fetch_json(client, url):
        if "attendance" in url:
            return mock_attendance
        elif "members" in url:
            return mock_members
        return None

    with patch("main.fetch_json", side_effect=mock_fetch_json):
        res = client.get("/api/composite/attendance")
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 1
        assert data[0]["id"] == 1
        assert data[0]["member"]["full_name"] == "Tran Van B"


def test_composite_classes_endpoint():
    mock_classes = [{"id": 1, "name": "Yoga Sang", "trainer_id": 2}]
    mock_users = [{"id": 2, "email": "trainer.nam@gym.com", "role": "trainer"}]

    async def mock_fetch_json(client, url):
        if "gym-classes" in url:
            return mock_classes
        elif "users" in url:
            return mock_users
        return None

    with patch("main.fetch_json", side_effect=mock_fetch_json):
        res = client.get("/api/composite/classes")
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 1
        assert data[0]["name"] == "Yoga Sang"
        assert data[0]["trainer"]["email"] == "trainer.nam@gym.com"


def test_composite_members_endpoint():
    mock_members = [{"id": 1, "user_id": 3, "full_name": "Nguyen Van An", "membership_plan_id": 1}]
    mock_users = [{"id": 3, "email": "member.an@gym.com", "role": "member"}]
    mock_plans = [{"id": 1, "name": "Goi 1 Thang Co Ban", "price": 500000.0}]

    async def mock_fetch_json(client, url):
        if "membership-plans" in url:
            return mock_plans
        elif "members" in url:
            return mock_members
        elif "users" in url:
            return mock_users
        return None

    with patch("main.fetch_json", side_effect=mock_fetch_json):
        res = client.get("/api/composite/members")
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 1
        assert data[0]["user"]["email"] == "member.an@gym.com"
        assert data[0]["membership_plan"]["name"] == "Goi 1 Thang Co Ban"


def test_composite_slots_endpoint():
    mock_slots = [{"id": 1, "class_id": 2, "start_time": "2026-10-19 06:00:00"}]
    mock_classes = [{"id": 2, "name": "Boxing Doi Khang", "category": "Boxing"}]

    async def mock_fetch_json(client, url):
        if "class-slots" in url:
            return mock_slots
        elif "gym-classes" in url:
            return mock_classes
        return None

    with patch("main.fetch_json", side_effect=mock_fetch_json):
        res = client.get("/api/composite/slots")
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 1
        assert data[0]["class"]["name"] == "Boxing Doi Khang"

