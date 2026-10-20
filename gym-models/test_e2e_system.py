import os
import sys
import time
import subprocess
import pytest
import httpx

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

SERVICES = [
    ("user-service", 8001, os.path.join(BASE_DIR, "services", "user-service")),
    ("membership-service", 8002, os.path.join(BASE_DIR, "services", "membership-service")),
    ("class-service", 8003, os.path.join(BASE_DIR, "services", "class-service")),
    ("booking-service", 8004, os.path.join(BASE_DIR, "services", "booking-service")),
    ("billing-service", 8005, os.path.join(BASE_DIR, "services", "billing-service")),
    ("attendance-service", 8006, os.path.join(BASE_DIR, "services", "attendance-service")),
    ("api-gateway", 8000, os.path.join(BASE_DIR, "api-gateway")),
]

@pytest.fixture(scope="module")
def run_all_services():
    processes = []
    py_exec = sys.executable

    for name, port, cwd in SERVICES:
        cmd = [py_exec, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", str(port)]
        p = subprocess.Popen(cmd, cwd=cwd, env=os.environ.copy(), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        processes.append(p)

    # Wait for gateway and all services to become healthy
    gateway_url = "http://127.0.0.1:8000/health"
    ready = False
    start_time = time.time()
    while time.time() - start_time < 15:
        try:
            with httpx.Client(timeout=1.0) as client:
                res = client.get(gateway_url)
                if res.status_code == 200:
                    data = res.json()
                    services_status = data.get("services", {})
                    if all(v == "UP" for v in services_status.values()):
                        ready = True
                        break
        except Exception:
            pass
        time.sleep(0.5)

    if not ready:
        for p in processes:
            p.terminate()
        pytest.fail("Services did not start up and reach healthy state within timeout.")

    yield "http://127.0.0.1:8000"

    # Teardown
    for p in processes:
        if p.poll() is None:
            p.terminate()
    time.sleep(1)
    for p in processes:
        if p.poll() is None:
            p.kill()

def test_gateway_health(run_all_services):
    base_url = run_all_services
    with httpx.Client(base_url=base_url) as client:
        r = client.get("/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "UP"
        assert len(data["services"]) == 6
        for name, status_val in data["services"].items():
            assert status_val == "UP"

def test_legacy_frontend_compatibility(run_all_services):
    base_url = run_all_services
    with httpx.Client(base_url=base_url) as client:
        # Frontend calls routes with trailing slashes directly without /api/
        assert client.get("/users/").status_code == 200
        assert client.get("/membership-plans/").status_code == 200
        assert client.get("/members/").status_code == 200
        assert client.get("/gym-classes/").status_code == 200
        assert client.get("/class-slots/").status_code == 200
        assert client.get("/bookings/").status_code == 200
        assert client.get("/invoices/").status_code == 200
        assert client.get("/payments/").status_code == 200
        assert client.get("/attendance/").status_code == 200

def test_standardized_api_routes(run_all_services):
    base_url = run_all_services
    with httpx.Client(base_url=base_url) as client:
        # Standardized endpoints under /api/...
        assert client.get("/api/users").status_code == 200
        assert client.get("/api/membership-plans").status_code == 200
        assert client.get("/api/members").status_code == 200
        assert client.get("/api/gym-classes").status_code == 200
        assert client.get("/api/class-slots").status_code == 200
        assert client.get("/api/bookings").status_code == 200
        assert client.get("/api/invoices").status_code == 200
        assert client.get("/api/payments").status_code == 200
        assert client.get("/api/attendances").status_code == 200

def test_crud_through_gateway(run_all_services):
    base_url = run_all_services
    with httpx.Client(base_url=base_url) as client:
        # Create a user via standardized route
        user_data = {
            "email": "e2e.test@gym.com",
            "role": "member",
            "password": "password123",
            "is_active": True
        }
        res_post = client.post("/api/users", json=user_data)
        assert res_post.status_code == 201
        created_user = res_post.json()
        u_id = created_user["id"]

        # Read back via legacy route to prove cross-compatibility
        res_get = client.get(f"/users/{u_id}")
        assert res_get.status_code == 200
        assert res_get.json()["email"] == "e2e.test@gym.com"

        # Update via standardized route
        res_put = client.put(f"/api/users/{u_id}", json={
            "email": "e2e.updated@gym.com",
            "role": "trainer",
            "password": "password123",
            "is_active": True
        })
        assert res_put.status_code == 200
        assert res_put.json()["email"] == "e2e.updated@gym.com"

        # Delete
        res_del = client.delete(f"/users/{u_id}")
        assert res_del.status_code == 200


def test_composite_aggregation_routes(run_all_services):
    base_url = run_all_services
    with httpx.Client(base_url=base_url) as client:
        # Check all 7 composite routes return 200 OK and populated objects
        r_bookings = client.get("/api/composite/bookings")
        assert r_bookings.status_code == 200
        bookings = r_bookings.json()
        assert isinstance(bookings, list)
        if len(bookings) > 0:
            assert "member" in bookings[0]
            assert "slot" in bookings[0]

        r_invoices = client.get("/api/composite/invoices")
        assert r_invoices.status_code == 200
        invoices = r_invoices.json()
        assert isinstance(invoices, list)
        if len(invoices) > 0:
            assert "member" in invoices[0]

        r_payments = client.get("/api/composite/payments")
        assert r_payments.status_code == 200
        payments = r_payments.json()
        assert isinstance(payments, list)
        if len(payments) > 0:
            assert "invoice" in payments[0]

        r_attendance = client.get("/api/composite/attendance")
        assert r_attendance.status_code == 200
        attendance = r_attendance.json()
        assert isinstance(attendance, list)
        if len(attendance) > 0:
            assert "member" in attendance[0]

        r_classes = client.get("/api/composite/classes")
        assert r_classes.status_code == 200
        classes = r_classes.json()
        assert isinstance(classes, list)
        if len(classes) > 0:
            assert "trainer" in classes[0]

        r_members = client.get("/api/composite/members")
        assert r_members.status_code == 200
        members = r_members.json()
        assert isinstance(members, list)
        if len(members) > 0:
            assert "user" in members[0]

        r_slots = client.get("/api/composite/slots")
        assert r_slots.status_code == 200
        slots = r_slots.json()
        assert isinstance(slots, list)
        if len(slots) > 0:
            assert "class" in slots[0]


def test_auth_login_through_gateway(run_all_services):
    gateway_url = run_all_services
    with httpx.Client(base_url=gateway_url, timeout=5.0) as client:
        # Admin login via /api/users/login
        res_admin = client.post("/api/users/login", json={"email": "admin@gym.com", "password": "password123"})
        assert res_admin.status_code == 200
        data_admin = res_admin.json()
        assert "access_token" in data_admin
        assert data_admin["token_type"] == "bearer"
        assert data_admin["user"]["email"] == "admin@gym.com"
        assert data_admin["user"]["role"] == "admin"

        # Member login via /api/auth/login alias
        res_member = client.post("/api/auth/login", json={"email": "member.an@gym.com", "password": "password123"})
        assert res_member.status_code == 200
        data_member = res_member.json()
        assert "access_token" in data_member
        assert data_member["user"]["role"] == "member"

        # Invalid login
        res_invalid = client.post("/api/users/login", json={"email": "admin@gym.com", "password": "wrong"})
        assert res_invalid.status_code == 401


