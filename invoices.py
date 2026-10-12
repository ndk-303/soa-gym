from typing import Optional

from fastapi import FastAPI, Body, HTTPException
from pydantic import BaseModel, Field

app = FastAPI()


class Invoice:
    id: int
    member_id: int
    amount: float
    amount_paid: float
    status: str

    def __init__(self, id, member_id, amount, amount_paid=0.0, status="pending"):
        self.id = id
        self.member_id = member_id
        self.amount = amount
        self.amount_paid = amount_paid
        self.status = status


class InvoiceRequest(BaseModel):
    id: Optional[int] = Field(default=None, title="id is not needed")
    member_id: int = Field(gt=0)
    amount: float = Field(gt=0, lt=100000000)
    amount_paid: float = Field(default=0.0, ge=0)
    status: str = Field(default="pending", min_length=4, max_length=20)

    class Config:
        json_schema_extra = {
            'example': {
                'member_id': 1,
                'amount': 1350000.0,
                'amount_paid': 0.0,
                'status': 'pending',
            }
        }


INVOICES = [
    Invoice(1, 1, 500000.0, 500000.0, "paid"),
    Invoice(2, 2, 1350000.0, 0.0, "pending"),
    Invoice(3, 3, 2500000.0, 1000000.0, "pending"),
    Invoice(4, 4, 4800000.0, 0.0, "cancelled"),
]


@app.get("/")
async def home():
    return {"message": "Invoice Service"}


@app.get("/invoices")
async def get_all_invoices():
    return INVOICES


@app.get("/invoices/get_by_status")
async def get_by_status(status: str):
    invoices_result = []
    for invoice in INVOICES:
        if invoice.status.casefold() == status.casefold():
            invoices_result.append(invoice)
    return invoices_result


@app.get("/invoices/{id}")
async def get_invoice(id: int):
    for invoice in INVOICES:
        if invoice.id == id:
            return invoice
    raise HTTPException(status_code=404, detail="Invoice not found")


@app.post("/invoices/{id}/apply_payment")
async def apply_payment(id: int, paid_amount: float):
    for invoice in INVOICES:
        if invoice.id == id:
            invoice.amount_paid += paid_amount
            if invoice.amount_paid >= invoice.amount:
                invoice.status = "paid"
            return invoice
    raise HTTPException(status_code=404, detail="Invoice not found")


@app.post("/invoice/create_invoice")
async def create_invoice(request_invoice: InvoiceRequest):
    new_invoice = Invoice(**request_invoice.dict())
    INVOICES.append(find_invoice_id(new_invoice))


def find_invoice_id(invoice: Invoice):
    invoice.id = 1 if len(INVOICES) == 0 else INVOICES[-1].id + 1
    return invoice


@app.put("/invoice/update_invoice")
async def update_invoice(invoice: InvoiceRequest):
    for i in range(len(INVOICES)):
        if INVOICES[i].id == invoice.id:
            INVOICES[i] = invoice


@app.delete("/invoices/delete_invoice/{id}")
async def delete_invoice(id: int):
    for i in range(len(INVOICES)):
        if INVOICES[i].id == id:
            INVOICES.pop(i)
            break
