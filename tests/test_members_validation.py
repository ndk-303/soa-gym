import pytest
from httpx import ASGITransport, AsyncClient
from unittest.mock import patch
from members import app as members_app


@pytest.mark.asyncio
async def test_members_404_on_missing_id():
    async with AsyncClient(transport=ASGITransport(app=members_app), base_url="http://test") as client:
        res = await client.get("/members/9999")
        assert res.status_code == 404
        assert "not found" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_create_member_rejects_missing_user():
    async with AsyncClient(transport=ASGITransport(app=members_app), base_url="http://test") as client:
        with patch("members.check_user_exists", return_value=False):
            res = await client.post("/member/create_member", json={
                "user_id": 9999,
                "email": "test@gym.com",
                "status": "active"
            })
            assert res.status_code == 400
            assert "User with id 9999 does not exist" in res.json()["detail"]


@pytest.mark.asyncio
async def test_create_member_rejects_missing_plan():
    async with AsyncClient(transport=ASGITransport(app=members_app), base_url="http://test") as client:
        with patch("members.check_user_exists", return_value=True), \
             patch("members.check_plan_exists", return_value=False):
            res = await client.post("/member/create_member", json={
                "user_id": 1,
                "email": "valid@gym.com",
                "status": "active",
                "membership_plan_id": 999
            })
            assert res.status_code == 400
            assert "Membership plan 999 does not exist" in res.json()["detail"]


@pytest.mark.asyncio
async def test_create_member_success_with_valid_relations():
    async with AsyncClient(transport=ASGITransport(app=members_app), base_url="http://test") as client:
        with patch("members.check_user_exists", return_value=True), \
             patch("members.check_plan_exists", return_value=True):
            res = await client.post("/member/create_member", json={
                "user_id": 1,
                "email": "valid_success@gym.com",
                "status": "active",
                "membership_plan_id": 1
            })
            assert res.status_code == 200
            assert res.json()["email"] == "valid_success@gym.com"


@pytest.mark.asyncio
async def test_create_member_503_on_downstream_outage():
    import httpx
    async with AsyncClient(transport=ASGITransport(app=members_app), base_url="http://test") as client:
        with patch("httpx.AsyncClient.get", side_effect=httpx.ConnectError("Connection refused")):
            res = await client.post("/member/create_member", json={
                "user_id": 1,
                "email": "outage@gym.com",
                "status": "active"
            })
            assert res.status_code == 503
            assert "unavailable" in res.json()["detail"].lower()
