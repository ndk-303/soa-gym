import sys
import time
import subprocess
import httpx

GATEWAY_URL = "http://127.0.0.1:8000"

SERVICES = [
    ("gateway", "gateway:app", 8000),
    ("users", "users:app", 8001),
    ("membership_plans", "membership_plans:app", 8002),
    ("members", "members:app", 8003),
    ("gym_classes", "gym_classes:app", 8004),
    ("class_slots", "class_slots:app", 8005),
    ("bookings", "bookings:app", 8006),
    ("invoices", "invoices:app", 8007),
    ("payments", "payments:app", 8008),
    ("attendance", "attendance:app", 8009),
]


def is_gateway_running():
    try:
        r = httpx.get(f"{GATEWAY_URL}/", timeout=1.0)
        return r.status_code == 200
    except Exception:
        return False


def main():
    spawned_processes = []
    own_servers = False

    if not is_gateway_running():
        print("[*] Starting all 10 microservices for testing...")
        own_servers = True
        for name, app_target, port in SERVICES:
            cmd = [
                sys.executable,
                "-m",
                "uvicorn",
                app_target,
                "--port",
                str(port),
                "--log-level",
                "warning",
            ]
            spawned_processes.append(subprocess.Popen(cmd))

        print("[*] Waiting for API Gateway and microservices to become ready...")
        ready = False
        start_wait = time.time()
        while time.time() - start_wait < 15.0:
            if is_gateway_running():
                try:
                    hr = httpx.get(f"{GATEWAY_URL}/health", timeout=1.0)
                    if hr.status_code == 200 and hr.json().get("status") == "healthy":
                        ready = True
                        break
                except Exception:
                    pass
            time.sleep(0.5)

        if not ready:
            raise RuntimeError("Timed out waiting for microservices to start.")
        print(f"[*] All services ready after {time.time() - start_wait:.1f}s.")
    else:
        print("[*] Gateway is already running. Proceeding with tests against live system.")

    try:
        print("\n=== Running End-to-End System Integration Tests ===")

        # Test 1: Health Check
        print("\n[1] Testing Gateway Health Check (GET /health)...")
        r = httpx.get(f"{GATEWAY_URL}/health", timeout=5.0)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        health_data = r.json()
        assert health_data["status"] == "healthy", f"System not healthy: {health_data}"
        assert len(health_data["services"]) == 9
        print("    -> PASS: All 9 services report UP and healthy.")

        # Test 2: Reverse Proxy Forwarding
        print("\n[2] Testing Reverse Proxy routing (GET /api/users/users)...")
        r = httpx.get(f"{GATEWAY_URL}/api/users/users", timeout=3.0)
        assert r.status_code == 200, f"Proxy failed: {r.status_code}"
        assert len(r.json()) >= 4
        print(f"    -> PASS: Reverse proxy successfully returned {len(r.json())} users.")

        # Test 3: Member Creation Validation (Non-existent user)
        print("\n[3] Testing Member validation with invalid user_id (POST /api/members/member/create_member)...")
        r = httpx.post(f"{GATEWAY_URL}/api/members/member/create_member", json={
            "user_id": 9999,
            "email": "invalid@gym.com",
            "status": "active"
        }, timeout=3.0)
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
        assert "does not exist" in r.json()["detail"]
        print("    -> PASS: Non-existent user rejected with 400 Bad Request.")

        # Test 4: Member Creation Validation (Valid user and plan)
        print("\n[4] Testing Member creation with valid relations...")
        r = httpx.post(f"{GATEWAY_URL}/api/members/member/create_member", json={
            "user_id": 1,
            "email": "new.member@gym.com",
            "status": "active",
            "membership_plan_id": 1
        }, timeout=3.0)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        new_member = r.json()
        new_member_id = new_member["id"]
        print(f"    -> PASS: Created Member id={new_member_id} with valid user and plan.")

        # Test 5: Booking Validation (Inactive member rejected)
        print("\n[5] Testing Booking with inactive member (POST /api/bookings/booking/create_booking)...")
        r = httpx.post(f"{GATEWAY_URL}/api/bookings/booking/create_booking", json={
            "member_id": 3,  # member 3 is inactive in seed data
            "slot_id": 1
        }, timeout=3.0)
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
        assert "not active" in r.json()["detail"].lower()
        print("    -> PASS: Inactive member rejected from booking.")

        # Test 6: Booking Creation & Slot increment
        print("\n[6] Testing Booking creation & slot booking increment...")
        slot_before = httpx.get(f"{GATEWAY_URL}/api/class_slots/class_slots/1").json()
        bookings_before = slot_before["current_bookings"]

        r = httpx.post(f"{GATEWAY_URL}/api/bookings/booking/create_booking", json={
            "member_id": new_member_id,
            "slot_id": 1
        }, timeout=3.0)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        booking = r.json()
        assert booking["status"] == "confirmed"

        slot_after = httpx.get(f"{GATEWAY_URL}/api/class_slots/class_slots/1").json()
        assert slot_after["current_bookings"] == bookings_before + 1
        print(f"    -> PASS: Booking confirmed and slot bookings increased from {bookings_before} to {slot_after['current_bookings']}.")

        # Test 6b: Booking auto-waitlisting on full slot (slot_id=3: current=20, max=20)
        print("\n[6b] Testing Booking auto-waitlisting on full slot (slot_id=3)...")
        r_wait = httpx.post(f"{GATEWAY_URL}/api/bookings/booking/create_booking", json={
            "member_id": new_member_id,
            "slot_id": 3
        }, timeout=3.0)
        assert r_wait.status_code == 200
        assert r_wait.json()["status"] == "waitlisted"
        assert r_wait.json()["waitlist_position"] is not None
        print(f"    -> PASS: Full slot booking auto-waitlisted at position {r_wait.json()['waitlist_position']}.")

        # Test 7: Payment Application & Invoice Settlement
        print("\n[7] Testing Payment creation & Invoice status update (POST /api/payments/payment/create_payment)...")
        # Invoice 2 initial: amount=1350000, amount_paid=0.0, status='pending'
        inv_before = httpx.get(f"{GATEWAY_URL}/api/invoices/invoices/2").json()
        assert inv_before["status"] == "pending"

        r = httpx.post(f"{GATEWAY_URL}/api/payments/payment/create_payment", json={
            "invoice_id": 2,
            "amount": 1350000.0,
            "payment_method": "bank_transfer",
            "notes": "Full e2e settlement"
        }, timeout=3.0)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

        inv_after = httpx.get(f"{GATEWAY_URL}/api/invoices/invoices/2").json()
        assert inv_after["amount_paid"] == 1350000.0
        assert inv_after["status"] == "paid"
        print(f"    -> PASS: Payment created, Invoice 2 updated to amount_paid=1,350,000 and status='paid'.")

        # Test 7b: Reject payment on already-paid invoice
        print("\n[7b] Testing rejection of payment on already-paid invoice...")
        r_paid = httpx.post(f"{GATEWAY_URL}/api/payments/payment/create_payment", json={
            "invoice_id": 2,
            "amount": 1000.0,
            "payment_method": "cash"
        }, timeout=3.0)
        assert r_paid.status_code == 400
        assert "already fully paid" in r_paid.json()["detail"].lower()
        print("    -> PASS: Payment on already-paid invoice rejected with 400 Bad Request.")

        print("\n==================================================")
        print("ALL 7 END-TO-END TESTS PASSED SUCCESSFULLY!")
        print("==================================================")

    finally:
        if own_servers:
            print("[*] Cleaning up spawned processes...")
            for p in spawned_processes:
                p.terminate()
                try:
                    p.wait(timeout=2)
                except subprocess.TimeoutExpired:
                    p.kill()
            print("[*] Cleanup finished.")


if __name__ == "__main__":
    main()
