import pytest
from httpx import ASGITransport, AsyncClient
from unittest.mock import patch, AsyncMock
from fastapi import HTTPException
from payments import app as payments_app


@pytest.mark.asyncio
async def test_payments_404_on_missing_id():
    async with AsyncClient(transport=ASGITransport(app=payments_app), base_url="http://test") as client:
        res = await client.get("/payments/9999")
        assert res.status_code == 404
        assert "not found" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_payment_rejects_missing_invoice():
    async with AsyncClient(transport=ASGITransport(app=payments_app), base_url="http://test") as client:
        with patch("payments.fetch_invoice", side_effect=HTTPException(status_code=404, detail="Invoice 9999 not found")):
            res = await client.post("/payment/create_payment", json={
                "invoice_id": 9999,
                "amount": 500000.0,
                "payment_method": "cash"
            })
            assert res.status_code == 404


@pytest.mark.asyncio
async def test_payment_rejects_already_paid_invoice():
    async with AsyncClient(transport=ASGITransport(app=payments_app), base_url="http://test") as client:
        with patch("payments.fetch_invoice", return_value={"id": 1, "status": "paid"}):
            res = await client.post("/payment/create_payment", json={
                "invoice_id": 1,
                "amount": 500000.0,
                "payment_method": "cash",
                "notes": "Test payment"
            })
            assert res.status_code == 400
            assert "Invoice is already fully paid" in res.json()["detail"]


@pytest.mark.asyncio
async def test_payment_calls_apply_payment():
    async with AsyncClient(transport=ASGITransport(app=payments_app), base_url="http://test") as client:
        with patch("payments.fetch_invoice", return_value={"id": 2, "status": "pending"}), \
             patch("payments.apply_invoice_payment", new_callable=AsyncMock) as mock_apply:
            res = await client.post("/payment/create_payment", json={
                "invoice_id": 2,
                "amount": 1350000.0,
                "payment_method": "bank_transfer",
                "notes": "Full payment"
            })
            assert res.status_code == 200
            assert res.json()["amount"] == 1350000.0
            mock_apply.assert_awaited_once_with(2, 1350000.0)
