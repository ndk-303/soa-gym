import pytest
from fastapi.testclient import TestClient
import httpx
from unittest.mock import AsyncMock, patch

from main import app, match_service_url

client = TestClient(app)

def test_route_matching():
    # Verify standard routes match correctly
    assert match_service_url("/api/users") == ("http://127.0.0.1:8001", "/users")
    assert match_service_url("/users") == ("http://127.0.0.1:8001", "/users")
    assert match_service_url("/users/1") == ("http://127.0.0.1:8001", "/users/1")
    assert match_service_url("/users/") == ("http://127.0.0.1:8001", "/users/")

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
    response = client.get("/api/users")
    # Assuming port 8001 is offline during this isolated unit test
    assert response.status_code == 503
    assert "unavailable" in response.json()["detail"].lower()
