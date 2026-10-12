import pytest
from httpx import AsyncClient
from sqlmodel import Session
from app.models.class_slot import ClassSlot
from app.models.invoice import Invoice


@pytest.mark.asyncio
async def test_users_router(client: AsyncClient):
    res = await client.get("/users")
    assert res.status_code == 200
    assert len(res.json()) == 6

    res_404 = await client.get("/users/9999")
    assert res_404.status_code == 404


@pytest.mark.asyncio
async def test_member_creation_in_memory_validation(client: AsyncClient):
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
async def test_booking_slot_capacity_and_waitlist_in_memory(client: AsyncClient, session: Session):
    # Inactive member 3
    res_inactive = await client.post("/bookings/create_booking", json={
        "member_id": 3,
        "slot_id": 1
    })
    assert res_inactive.status_code == 400
    assert "not active" in res_inactive.json()["detail"].lower()

    # Slot 1 has current=5, max=15 -> confirms and increments
    res_ok = await client.post("/bookings/create_booking", json={
        "member_id": 1,
        "slot_id": 1
    })
    assert res_ok.status_code == 200
    assert res_ok.json()["status"] == "confirmed"

    session.expire_all()
    slot1 = session.get(ClassSlot, 1)
    assert slot1.current_bookings == 6

    # Slot 3 has current=20, max=20 -> auto waitlist
    res_wait = await client.post("/bookings/create_booking", json={
        "member_id": 1,
        "slot_id": 3
    })
    assert res_wait.status_code == 200
    assert res_wait.json()["status"] == "waitlisted"
    assert res_wait.json()["waitlist_position"] == 2

    # Slot 4 is cancelled -> rejected with 400
    res_cancelled = await client.post("/bookings/create_booking", json={
        "member_id": 1,
        "slot_id": 4
    })
    assert res_cancelled.status_code == 400
    assert "cancelled" in res_cancelled.json()["detail"].lower()


@pytest.mark.asyncio
async def test_payment_settles_invoice_in_memory(client: AsyncClient, session: Session):
    # Invoice 2 is pending (amount=1,350,000, amount_paid=0.0)
    res_pay = await client.post("/payments/create_payment", json={
        "invoice_id": 2,
        "amount": 1350000.0,
        "payment_method": "credit_card",
        "notes": "Full payment"
    })
    assert res_pay.status_code == 200

    session.expire_all()
    inv = session.get(Invoice, 2)
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
