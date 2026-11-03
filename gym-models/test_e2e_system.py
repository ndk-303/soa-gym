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
    while time.time() - start_time < 20:
        try:
            with httpx.Client(timeout=1.0) as client:
                res = client.get(gateway_url)
                if res.status_code == 200:
                    data = res.json()
                    services_status = data.get("services", {})
                    if len(services_status) == 6 and all(v == "UP" for v in services_status.values()):
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


@pytest.fixture(scope="module")
def admin_headers(run_all_services):
    gateway_url = run_all_services
    with httpx.Client(base_url=gateway_url, timeout=5.0) as client:
        res = client.post("/api/users/login", json={"email": "admin@gym.com", "password": "password123"})
        assert res.status_code == 200
        token = res.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}


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


def test_unauthenticated_requests_rejected(run_all_services):
    base_url = run_all_services
    with httpx.Client(base_url=base_url) as client:
        # Protected proxy routes must return 401 Unauthorized without token
        assert client.get("/users").status_code == 401
        assert client.get("/membership-plans").status_code == 401
        assert client.get("/members").status_code == 401
        assert client.get("/gym-classes").status_code == 401
        assert client.get("/bookings").status_code == 401
        assert client.get("/invoices").status_code == 401
        assert client.get("/payments").status_code == 401
        assert client.get("/attendance").status_code == 401

        # Protected composite routes must return 401 Unauthorized without token
        assert client.get("/api/composite/bookings").status_code == 401
        assert client.get("/api/composite/invoices").status_code == 401
        assert client.get("/api/composite/payments").status_code == 401
        assert client.get("/api/composite/attendance").status_code == 401
        assert client.get("/api/composite/classes").status_code == 401
        assert client.get("/api/composite/members").status_code == 401
        assert client.get("/api/composite/slots").status_code == 401


def test_proxy_crud_users(run_all_services, admin_headers):
    gateway_url = run_all_services
    with httpx.Client(base_url=gateway_url, timeout=5.0) as client:
        # 1. Create a user via /api/users
        new_user = {
            "email": "proxy.user@gym.com",
            "full_name": "Proxy User Name",
            "role": "member",
            "password": "proxypassword",
            "is_active": True,
        }
        create_res = client.post("/api/users", headers=admin_headers, json=new_user)
        assert create_res.status_code == 201
        user_id = create_res.json()["id"]
        assert create_res.json()["email"] == new_user["email"]
        assert create_res.json()["full_name"] == "Proxy User Name"

        # 2. Get user via legacy alias /users/{id}
        get_res = client.get(f"/users/{user_id}", headers=admin_headers)
        assert get_res.status_code == 200
        assert get_res.json()["email"] == new_user["email"]

        # 3. Update user via /api/users/{id}
        update_data = {
            "email": "proxy.updated@gym.com",
            "full_name": "Proxy Updated Name",
            "role": "trainer",
            "password": "newproxypassword",
            "is_active": True,
        }
        update_res = client.put(f"/api/users/{user_id}", headers=admin_headers, json=update_data)
        assert update_res.status_code == 200
        assert update_res.json()["email"] == "proxy.updated@gym.com"
        assert update_res.json()["full_name"] == "Proxy Updated Name"

        # 4. Delete user via /api/users/{id}
        del_res = client.delete(f"/api/users/{user_id}", headers=admin_headers)
        assert del_res.status_code == 200


def test_proxy_membership_plans(run_all_services, admin_headers):
    gateway_url = run_all_services
    with httpx.Client(base_url=gateway_url, timeout=5.0) as client:
        # Get all plans
        r = client.get("/api/membership-plans", headers=admin_headers)
        assert r.status_code == 200
        plans = r.json()
        assert len(plans) >= 3


def test_proxy_gym_classes_and_slots(run_all_services, admin_headers):
    gateway_url = run_all_services
    with httpx.Client(base_url=gateway_url, timeout=5.0) as client:
        # Check classes
        r_classes = client.get("/gym-classes", headers=admin_headers)
        assert r_classes.status_code == 200
        classes = r_classes.json()
        assert len(classes) >= 2

        # Check slots
        r_slots = client.get("/api/class-slots", headers=admin_headers)
        assert r_slots.status_code == 200
        slots = r_slots.json()
        assert len(slots) >= 1


def test_proxy_bookings(run_all_services, admin_headers):
    gateway_url = run_all_services
    with httpx.Client(base_url=gateway_url, timeout=5.0) as client:
        r = client.get("/bookings", headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


def test_proxy_billing_invoices_and_payments(run_all_services, admin_headers):
    gateway_url = run_all_services
    with httpx.Client(base_url=gateway_url, timeout=5.0) as client:
        r_inv = client.get("/api/invoices", headers=admin_headers)
        assert r_inv.status_code == 200
        assert isinstance(r_inv.json(), list)

        r_pay = client.get("/payments", headers=admin_headers)
        assert r_pay.status_code == 200
        assert isinstance(r_pay.json(), list)


def test_proxy_attendance(run_all_services, admin_headers):
    gateway_url = run_all_services
    with httpx.Client(base_url=gateway_url, timeout=5.0) as client:
        r = client.get("/attendance", headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


def test_composite_endpoints_through_gateway(run_all_services, admin_headers):
    gateway_url = run_all_services
    with httpx.Client(base_url=gateway_url, timeout=5.0) as client:
        client.headers.update(admin_headers)

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
        assert "full_name" in data_admin["user"]

        # Member login via /api/auth/login alias
        res_member = client.post("/api/auth/login", json={"email": "member.an@gym.com", "password": "password123"})
        assert res_member.status_code == 200
        data_member = res_member.json()
        assert "access_token" in data_member
        assert data_member["user"]["role"] == "member"
        assert "full_name" in data_member["user"]

        # Invalid login
        res_invalid = client.post("/api/users/login", json={"email": "admin@gym.com", "password": "wrong"})
        assert res_invalid.status_code == 401


def test_user_role_upgrade_to_member_through_gateway(run_all_services, admin_headers):
    gateway_url = run_all_services
    import uuid

    unique_email = f"e2e.user.{uuid.uuid4().hex[:8]}@gym.com"
    with httpx.Client(base_url=gateway_url, timeout=5.0) as client:
        # 1. Admin creates a user with role 'user' and full_name
        create_res = client.post(
            "/api/users",
            headers=admin_headers,
            json={
                "email": unique_email,
                "full_name": "E2E Regular User",
                "role": "user",
                "password": "password123",
                "is_active": True,
            },
        )
        assert create_res.status_code == 201
        user_id = create_res.json()["id"]
        assert create_res.json()["role"] == "user"
        assert create_res.json()["full_name"] == "E2E Regular User"

        # 2. Login as the new user
        login_res = client.post(
            "/api/users/login",
            json={"email": unique_email, "password": "password123"},
        )
        assert login_res.status_code == 200
        user_token = login_res.json()["access_token"]
        assert login_res.json()["user"]["full_name"] == "E2E Regular User"
        user_headers = {"Authorization": f"Bearer {user_token}"}

        # 3. Verify role and full_name in /api/auth/me
        me_res = client.get("/api/auth/me", headers=user_headers)
        assert me_res.status_code == 200
        assert me_res.json()["role"] == "user"
        assert me_res.json()["full_name"] == "E2E Regular User"

        # 4. User upgrades role to 'member' upon membership plan registration
        upgrade_res = client.patch(
            f"/api/users/{user_id}/role",
            headers=user_headers,
            json={"role": "member", "full_name": "E2E Member User"},
        )
        assert upgrade_res.status_code == 200
        assert upgrade_res.json()["user"]["role"] == "member"
        assert upgrade_res.json()["user"]["full_name"] == "E2E Member User"
        new_token = upgrade_res.json()["access_token"]
        new_headers = {"Authorization": f"Bearer {new_token}"}

        # 5. Verify /api/auth/me now reflects role 'member' and updated full_name
        me_updated = client.get("/api/auth/me", headers=new_headers)
        assert me_updated.status_code == 200
        assert me_updated.json()["role"] == "member"
        assert me_updated.json()["full_name"] == "E2E Member User"

        # 6. Verify database record via /api/users/{id}
        db_user = client.get(f"/api/users/{user_id}", headers=admin_headers)
        assert db_user.status_code == 200
        assert db_user.json()["role"] == "member"
        assert db_user.json()["full_name"] == "E2E Member User"

        # 7. Cleanup
        client.delete(f"/api/users/{user_id}", headers=admin_headers)
