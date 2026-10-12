from typing import Optional, Dict, Any

import httpx
from fastapi import FastAPI, Body, HTTPException
from pydantic import BaseModel, Field

app = FastAPI()

INVOICE_SERVICE_URL = "http://127.0.0.1:8007"


async def fetch_invoice(invoice_id: int) -> Dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            res = await client.get(f"{INVOICE_SERVICE_URL}/invoices/{invoice_id}")
            if res.status_code == 404:
                raise HTTPException(status_code=404, detail=f"Invoice {invoice_id} not found")
            res.raise_for_status()
            return res.json()
    except HTTPException:
        raise
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="Invoice service is unavailable")


async def apply_invoice_payment(invoice_id: int, amount: float) -> Dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            res = await client.post(f"{INVOICE_SERVICE_URL}/invoices/{invoice_id}/apply_payment?paid_amount={amount}")
            res.raise_for_status()
            return res.json()
    except HTTPException:
        raise
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="Invoice service is unavailable")


class Payment:
    id: int
    invoice_id: int
    amount: float
    payment_method: str
    notes: Optional[str]

    def __init__(self, id, invoice_id, amount, payment_method="cash", notes=""):
        self.id = id
        self.invoice_id = invoice_id
        self.amount = amount
        self.payment_method = payment_method
        self.notes = notes


class PaymentRequest(BaseModel):
    id: Optional[int] = Field(default=None, title="id is not needed")
    invoice_id: int = Field(gt=0)
    amount: float = Field(gt=0, lt=100000000)
    payment_method: str = Field(min_length=3, max_length=30)
    notes: Optional[str] = Field(default="", max_length=255)

    class Config:
        json_schema_extra = {
            'example': {
                'invoice_id': 1,
                'amount': 500000.0,
                'payment_method': 'bank_transfer',
                'notes': 'Chuyen khoan VietQR',
            }
        }


PAYMENTS = [
    Payment(1, 1, 500000.0, "bank_transfer", "Chuyen khoan VietQR"),
    Payment(2, 3, 1000000.0, "cash", "Tien mat tai quay"),
    Payment(3, 2, 1350000.0, "credit_card", "Quet the POS"),
]


@app.get("/")
async def home():
    return {"message": "Payment Service"}


@app.get("/payments")
async def get_all_payments():
    return PAYMENTS


@app.get("/payments/get_by_method")
async def get_by_method(method: str):
    payments_result = []
    for payment in PAYMENTS:
        if payment.payment_method.casefold() == method.casefold():
            payments_result.append(payment)
    return payments_result


@app.get("/payments/{id}")
async def get_payment(id: int):
    for payment in PAYMENTS:
        if payment.id == id:
            return payment
    raise HTTPException(status_code=404, detail="Payment not found")


@app.post("/payment/create_payment")
async def create_payment(request_payment: PaymentRequest):
    invoice = await fetch_invoice(request_payment.invoice_id)
    if invoice.get("status", "").casefold() == "paid":
        raise HTTPException(status_code=400, detail="Invoice is already fully paid")

    await apply_invoice_payment(request_payment.invoice_id, request_payment.amount)

    new_payment = Payment(**request_payment.dict())
    new_payment = find_payment_id(new_payment)
    PAYMENTS.append(new_payment)
    return new_payment


def find_payment_id(payment: Payment):
    payment.id = 1 if len(PAYMENTS) == 0 else PAYMENTS[-1].id + 1
    return payment


@app.put("/payment/update_payment")
async def update_payment(payment: PaymentRequest):
    for i in range(len(PAYMENTS)):
        if PAYMENTS[i].id == payment.id:
            PAYMENTS[i] = payment


@app.delete("/payments/delete_payment/{id}")
async def delete_payment(id: int):
    for i in range(len(PAYMENTS)):
        if PAYMENTS[i].id == id:
            PAYMENTS.pop(i)
            break
