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
        p = subprocess.Popen(cmd, cwd=cwd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
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
