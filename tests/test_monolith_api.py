import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.database import db


@pytest.fixture(autouse=True)
def setup_db():
    db.reset_database()


@pytest.mark.asyncio
async def test_full_api_monolith_lifecycle():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Root
        res_root = await client.get("/")
        assert res_root.status_code == 200
        assert res_root.json()["docs"] == "/docs"

        # 2. Users CRUD
        res_users = await client.get("/users")
        assert res_users.status_code == 200
        assert len(res_users.json()) == 6

        res_user_role = await client.get("/users/get_role?role=trainer")
        assert res_user_role.status_code == 200
        assert len(res_user_role.json()) == 2

        res_new_user = await client.post("/users/create_user", json={
            "email": "newbie@gym.com",
            "role": "member",
            "password": "newpassword123"
        })
        assert res_new_user.status_code == 200
        new_user_id = res_new_user.json()["id"]
        assert new_user_id == 7

        # 3. Plans CRUD
        res_plans = await client.get("/membership_plans")
        assert res_plans.status_code == 200
        assert len(res_plans.json()) == 4

        res_plan_dur = await client.get("/membership_plans/get_by_duration?duration_days=30")
        assert res_plan_dur.status_code == 200
        assert len(res_plan_dur.json()) == 1

        # 4. Members Workflow & Validation
        # Missing user
        res_bad_user = await client.post("/members/create_member", json={
            "user_id": 9999,
            "email": "ghost@gym.com",
            "status": "active"
        })
        assert res_bad_user.status_code == 400
        assert "User with id 9999 does not exist" in res_bad_user.json()["detail"]

        # Missing plan
        res_bad_plan = await client.post("/members/create_member", json={
            "user_id": new_user_id,
            "email": "ghost@gym.com",
            "status": "active",
            "membership_plan_id": 9999
        })
        assert res_bad_plan.status_code == 400
        assert "Membership plan 9999 does not exist" in res_bad_plan.json()["detail"]

        # Valid member
        res_new_mem = await client.post("/members/create_member", json={
            "user_id": new_user_id,
            "email": "newbie@gym.com",
            "status": "active",
            "membership_plan_id": 1
        })
        assert res_new_mem.status_code == 200
        new_mem_id = res_new_mem.json()["id"]

        # 5. Gym Classes & Slots
        res_classes = await client.get("/gym_classes")
        assert res_classes.status_code == 200
        assert len(res_classes.json()) == 4

        res_slots = await client.get("/class_slots")
        assert res_slots.status_code == 200
        assert len(res_slots.json()) == 4

        # 6. Bookings Workflow & Capacity
        # Inactive member 3 rejected
        res_book_inactive = await client.post("/bookings/create_booking", json={
            "member_id": 3,
            "slot_id": 1
        })
        assert res_book_inactive.status_code == 400
        assert "not active" in res_book_inactive.json()["detail"].lower()

        # Slot 1: open capacity (5/15) -> confirms & increments
        res_book_ok = await client.post("/bookings/create_booking", json={
            "member_id": new_mem_id,
            "slot_id": 1
        })
        assert res_book_ok.status_code == 200
        assert res_book_ok.json()["status"] == "confirmed"

        slot1 = db.find_slot_by_id(1)
        assert slot1.current_bookings == 6

        # Slot 3: full capacity (20/20) -> auto waitlisted
        res_book_wait = await client.post("/bookings/create_booking", json={
            "member_id": new_mem_id,
            "slot_id": 3
        })
        assert res_book_wait.status_code == 200
        assert res_book_wait.json()["status"] == "waitlisted"
        assert res_book_wait.json()["waitlist_position"] == 2

        # Slot 4: cancelled slot -> rejected with 400
        res_book_cancelled = await client.post("/bookings/create_booking", json={
            "member_id": new_mem_id,
            "slot_id": 4
        })
        assert res_book_cancelled.status_code == 400
        assert "cancelled" in res_book_cancelled.json()["detail"].lower()

        # 7. Invoices & Payments Workflow
        # Invoice 2 pending (1,350,000, paid=0.0)
        res_inv2 = await client.get("/invoices/2")
        assert res_inv2.status_code == 200
        assert res_inv2.json()["status"] == "pending"

        # Pay invoice 2
        res_pay = await client.post("/payments/create_payment", json={
            "invoice_id": 2,
            "amount": 1350000.0,
            "payment_method": "credit_card",
            "notes": "Full settlement"
        })
        assert res_pay.status_code == 200
        assert res_pay.json()["amount"] == 1350000.0

        res_inv2_after = await client.get("/invoices/2")
        assert res_inv2_after.json()["amount_paid"] == 1350000.0
        assert res_inv2_after.json()["status"] == "paid"

        # Paying already-paid invoice rejected
        res_pay_already = await client.post("/payments/create_payment", json={
            "invoice_id": 2,
            "amount": 500.0,
            "payment_method": "cash"
        })
        assert res_pay_already.status_code == 400
        assert "already fully paid" in res_pay_already.json()["detail"].lower()

        # 8. Attendance CRUD
        res_att = await client.get("/attendance")
        assert res_att.status_code == 200
        assert len(res_att.json()) == 3

        res_new_att = await client.post("/attendance/create_record", json={
            "member_id": new_mem_id,
            "status": "checked_in",
            "check_in_time": "2026-10-12 09:00:00",
            "notes": "Check in tap luyen"
        })
        assert res_new_att.status_code == 200
        assert res_new_att.json()["status"] == "checked_in"

        # 9. 404 Not Found tests across endpoints
        for prefix in ["users", "membership_plans", "members", "gym_classes", "class_slots", "bookings", "invoices", "payments", "attendance"]:
            res_404 = await client.get(f"/{prefix}/9999")
            assert res_404.status_code == 404
