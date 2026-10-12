import pytest
from httpx import ASGITransport, AsyncClient, Response, RequestError
from unittest.mock import patch, AsyncMock
from gateway import app as gateway_app


@pytest.mark.asyncio
async def test_gateway_root():
    async with AsyncClient(transport=ASGITransport(app=gateway_app), base_url="http://test") as client:
        res = await client.get("/")
        assert res.status_code == 200
        data = res.json()
        assert "Gym API Gateway" in data["message"]
        assert "services" in data
        assert "users" in data["services"]


@pytest.mark.asyncio
async def test_gateway_unknown_service():
    async with AsyncClient(transport=ASGITransport(app=gateway_app), base_url="http://test") as client:
        res = await client.get("/api/unknown_service/some/path")
        assert res.status_code == 404
        assert "unknown service" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_gateway_health_healthy():
    async with AsyncClient(transport=ASGITransport(app=gateway_app), base_url="http://test") as client:
        with patch("gateway.check_service_health", return_value={"name": "users", "status": "UP", "url": "http://127.0.0.1:8001"}):
            res = await client.get("/health")
            assert res.status_code == 200
            data = res.json()
            assert data["status"] == "healthy"
            assert "services" in data


@pytest.mark.asyncio
async def test_gateway_proxy_forward_success():
    async with AsyncClient(transport=ASGITransport(app=gateway_app), base_url="http://test") as client:
        mock_resp = Response(status_code=200, json=[{"id": 1, "email": "admin@gym.com"}])
        with patch("gateway.send_proxy_request", new_callable=AsyncMock, return_value=mock_resp):
            res = await client.get("/api/users/users")
            assert res.status_code == 200
            assert res.json()[0]["email"] == "admin@gym.com"


@pytest.mark.asyncio
async def test_gateway_proxy_service_unavailable():
    async with AsyncClient(transport=ASGITransport(app=gateway_app), base_url="http://test") as client:
        with patch("gateway.send_proxy_request", side_effect=RequestError("Connection refused")):
            res = await client.get("/api/users/users")
            assert res.status_code == 503
            assert "unavailable" in res.json()["detail"].lower()
