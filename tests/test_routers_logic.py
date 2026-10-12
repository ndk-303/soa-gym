import pytest
from httpx import ASGITransport, AsyncClient
from fastapi import FastAPI
from app.routers.users import router as users_router
from app.routers.membership_plans import router as plans_router
from app.routers.members import router as members_router
from app.routers.gym_classes import router as classes_router
from app.routers.class_slots import router as slots_router
from app.routers.bookings import router as bookings_router
from app.routers.invoices import router as invoices_router
from app.routers.payments import router as payments_router
from app.routers.attendance import router as attendance_router
from app.database import db

router_app = FastAPI()
router_app.include_router(users_router, prefix="/users")
router_app.include_router(plans_router, prefix="/membership_plans")
router_app.include_router(members_router, prefix="/members")
router_app.include_router(classes_router, prefix="/gym_classes")
router_app.include_router(slots_router, prefix="/class_slots")
router_app.include_router(bookings_router, prefix="/bookings")
router_app.include_router(invoices_router, prefix="/invoices")
router_app.include_router(payments_router, prefix="/payments")
router_app.include_router(attendance_router, prefix="/attendance")


@pytest.fixture(autouse=True)
def setup_db():
    db.reset_database()


@pytest.mark.asyncio
async def test_users_router():
    async with AsyncClient(transport=ASGITransport(app=router_app), base_url="http://test") as client:
        res = await client.get("/users")
        assert res.status_code == 200
        assert len(res.json()) >= 4

        res_404 = await client.get("/users/9999")
        assert res_404.status_code == 404


@pytest.mark.asyncio
async def test_member_creation_in_memory_validation():
    async with AsyncClient(transport=ASGITransport(app=router_app), base_url="http://test") as client:
        # Invalid user_id
        res_bad_user = await client.post("/members/create_member", json={
            "user_id": 9999,
            "email": "invalid@gym.com",
            "status": "active"
        })
        assert res_bad_user.status_code == 400
        assert "User with id 9999 does not exist" in res_bad_user.json()["detail"]

        # Invalid plan_id
        res_bad_plan = await client.post("/members/create_member", json={
            "user_id": 1,
            "email": "invalid_plan@gym.com",
            "status": "active",
            "membership_plan_id": 9999
        })
        assert res_bad_plan.status_code == 400
        assert "Membership plan 9999 does not exist" in res_bad_plan.json()["detail"]

        # Valid creation
        res_ok = await client.post("/members/create_member", json={
            "user_id": 1,
            "email": "valid_mem@gym.com",
            "status": "active",
            "membership_plan_id": 1
        })
        assert res_ok.status_code == 200
        assert res_ok.json()["email"] == "valid_mem@gym.com"


@pytest.mark.asyncio
async def test_booking_slot_capacity_and_waitlist_in_memory():
    async with AsyncClient(transport=ASGITransport(app=router_app), base_url="http://test") as client:
        # Inactive member
        res_inactive = await client.post("/bookings/create_booking", json={
            "member_id": 3,
            "slot_id": 1
        })
        assert res_inactive.status_code == 400
        assert "not active" in res_inactive.json()["detail"].lower()

        # Slot 1 has current=5, max=15 -> confirms and increments
        slot_before = db.find_slot_by_id(1)
        count_before = slot_before.current_bookings

        res_ok = await client.post("/bookings/create_booking", json={
            "member_id": 1,
            "slot_id": 1
        })
        assert res_ok.status_code == 200
        assert res_ok.json()["status"] == "confirmed"
        assert slot_before.current_bookings == count_before + 1

        # Slot 3 has current=20, max=20 -> auto waitlist
        res_wait = await client.post("/bookings/create_booking", json={
            "member_id": 1,
            "slot_id": 3
        })
        assert res_wait.status_code == 200
        assert res_wait.json()["status"] == "waitlisted"
        assert res_wait.json()["waitlist_position"] == 2


@pytest.mark.asyncio
async def test_payment_settles_invoice_in_memory():
    async with AsyncClient(transport=ASGITransport(app=router_app), base_url="http://test") as client:
        # Invoice 2 is pending (amount=1,350,000, amount_paid=0.0)
        res_pay = await client.post("/payments/create_payment", json={
            "invoice_id": 2,
            "amount": 1350000.0,
            "payment_method": "credit_card",
            "notes": "Full in-memory payment"
        })
        assert res_pay.status_code == 200

        inv = db.find_invoice_by_id(2)
        assert inv.amount_paid == 1350000.0
        assert inv.status == "paid"

        # Paying already-paid invoice rejected with 400
        res_already_paid = await client.post("/payments/create_payment", json={
            "invoice_id": 2,
            "amount": 1000.0,
            "payment_method": "cash"
        })
        assert res_already_paid.status_code == 400
        assert "already fully paid" in res_already_paid.json()["detail"].lower()
