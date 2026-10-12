import pytest
from httpx import ASGITransport, AsyncClient
from unittest.mock import patch, AsyncMock
from bookings import app as bookings_app


@pytest.mark.asyncio
async def test_bookings_404_on_missing_id():
    async with AsyncClient(transport=ASGITransport(app=bookings_app), base_url="http://test") as client:
        res = await client.get("/bookings/9999")
        assert res.status_code == 404
        assert "not found" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_booking_rejects_inactive_member():
    async with AsyncClient(transport=ASGITransport(app=bookings_app), base_url="http://test") as client:
        with patch("bookings.fetch_member", return_value={"id": 3, "status": "inactive"}):
            res = await client.post("/booking/create_booking", json={
                "member_id": 3,
                "slot_id": 1
            })
            assert res.status_code == 400
            assert "Member is not active" in res.json()["detail"]


@pytest.mark.asyncio
async def test_booking_rejects_cancelled_slot():
    async with AsyncClient(transport=ASGITransport(app=bookings_app), base_url="http://test") as client:
        with patch("bookings.fetch_member", return_value={"id": 1, "status": "active"}), \
             patch("bookings.fetch_slot", return_value={"id": 4, "current_bookings": 0, "max_capacity": 20, "is_cancelled": True}):
            res = await client.post("/booking/create_booking", json={
                "member_id": 1,
                "slot_id": 4
            })
            assert res.status_code == 400
            assert "Class slot has been cancelled" in res.json()["detail"]


@pytest.mark.asyncio
async def test_booking_increments_slot_when_open():
    async with AsyncClient(transport=ASGITransport(app=bookings_app), base_url="http://test") as client:
        with patch("bookings.fetch_member", return_value={"id": 1, "status": "active"}), \
             patch("bookings.fetch_slot", return_value={"id": 1, "current_bookings": 5, "max_capacity": 15, "is_cancelled": False}), \
             patch("bookings.increment_slot_booking", new_callable=AsyncMock) as mock_inc:
            res = await client.post("/booking/create_booking", json={
                "member_id": 1,
                "slot_id": 1
            })
            assert res.status_code == 200
            assert res.json()["status"] == "confirmed"
            assert res.json()["waitlist_position"] is None
            mock_inc.assert_awaited_once_with(1)


@pytest.mark.asyncio
async def test_booking_auto_waitlists_when_slot_full():
    async with AsyncClient(transport=ASGITransport(app=bookings_app), base_url="http://test") as client:
        with patch("bookings.fetch_member", return_value={"id": 1, "status": "active"}), \
             patch("bookings.fetch_slot", return_value={"id": 3, "current_bookings": 20, "max_capacity": 20, "is_cancelled": False}):
            res = await client.post("/booking/create_booking", json={
                "member_id": 1,
                "slot_id": 3
            })
            assert res.status_code == 200
            assert res.json()["status"] == "waitlisted"
            assert res.json()["waitlist_position"] is not None
