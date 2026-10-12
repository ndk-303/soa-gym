import pytest
from httpx import ASGITransport, AsyncClient
from users import app as users_app
from membership_plans import app as plans_app
from class_slots import app as slots_app
from invoices import app as invoices_app


@pytest.mark.asyncio
async def test_users_404_on_missing_id():
    async with AsyncClient(transport=ASGITransport(app=users_app), base_url="http://test") as client:
        res = await client.get("/users/9999")
        assert res.status_code == 404
        assert "not found" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_membership_plans_404_on_missing_id():
    async with AsyncClient(transport=ASGITransport(app=plans_app), base_url="http://test") as client:
        res = await client.get("/membership_plans/9999")
        assert res.status_code == 404
        assert "not found" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_class_slots_404_on_missing_id():
    async with AsyncClient(transport=ASGITransport(app=slots_app), base_url="http://test") as client:
        res = await client.get("/class_slots/9999")
        assert res.status_code == 404
        assert "not found" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_class_slots_increment_booking():
    async with AsyncClient(transport=ASGITransport(app=slots_app), base_url="http://test") as client:
        # First check initial current_bookings of slot 1
        initial_res = await client.get("/class_slots/1")
        assert initial_res.status_code == 200
        initial_bookings = initial_res.json()["current_bookings"]

        res = await client.post("/class_slots/1/increment_booking")
        assert res.status_code == 200
        assert res.json()["current_bookings"] == initial_bookings + 1


@pytest.mark.asyncio
async def test_invoices_404_on_missing_id():
    async with AsyncClient(transport=ASGITransport(app=invoices_app), base_url="http://test") as client:
        res = await client.get("/invoices/9999")
        assert res.status_code == 404
        assert "not found" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_invoices_apply_payment():
    async with AsyncClient(transport=ASGITransport(app=invoices_app), base_url="http://test") as client:
        # Invoice 2: amount=1350000.0, amount_paid=0.0, status="pending"
        res = await client.post("/invoices/2/apply_payment?paid_amount=1350000.0")
        assert res.status_code == 200
        data = res.json()
        assert data["amount_paid"] == 1350000.0
        assert data["status"] == "paid"
