import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_main_app_root(client: AsyncClient):
    res = await client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert "Gym Management System" in data["message"]
    assert "docs" in data


@pytest.mark.asyncio
async def test_all_routers_mounted(client: AsyncClient):
    # Check all 9 prefix paths are reachable
    res_users = await client.get("/users")
    assert res_users.status_code == 200

    res_plans = await client.get("/membership_plans")
    assert res_plans.status_code == 200

    res_members = await client.get("/members")
    assert res_members.status_code == 200

    res_classes = await client.get("/gym_classes")
    assert res_classes.status_code == 200

    res_slots = await client.get("/class_slots")
    assert res_slots.status_code == 200

    res_bookings = await client.get("/bookings")
    assert res_bookings.status_code == 200

    res_invoices = await client.get("/invoices")
    assert res_invoices.status_code == 200

    res_payments = await client.get("/payments")
    assert res_payments.status_code == 200

    res_attendance = await client.get("/attendance")
    assert res_attendance.status_code == 200
