from fastapi import APIRouter, HTTPException

from app.models.invoice import Invoice
from app.schemas.invoice import InvoiceRequest
from app.database import db

router = APIRouter()


@router.get("")
@router.get("/")
async def get_all_invoices():
    return db.INVOICES


@router.get("/get_by_status")
async def get_by_status(status: str):
    return [inv for inv in db.INVOICES if inv.status.casefold() == status.casefold()]


@router.get("/{id}")
async def get_invoice(id: int):
    inv = db.find_invoice_by_id(id)
    if inv:
        return inv
    raise HTTPException(status_code=404, detail="Invoice not found")


@router.post("/create_invoice")
async def create_invoice(request_invoice: InvoiceRequest):
    new_invoice = Invoice(
        id=db.get_next_id(db.INVOICES),
        member_id=request_invoice.member_id,
        amount=request_invoice.amount,
        amount_paid=request_invoice.amount_paid,
        status=request_invoice.status,
    )
    db.INVOICES.append(new_invoice)
    return new_invoice


@router.post("/{id}/apply_payment")
async def apply_payment(id: int, paid_amount: float):
    inv = db.find_invoice_by_id(id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    inv.amount_paid += paid_amount
    if inv.amount_paid >= inv.amount:
        inv.status = "paid"
    return inv


@router.put("/update_invoice")
async def update_invoice(request_invoice: InvoiceRequest):
    for i, inv in enumerate(db.INVOICES):
        if inv.id == request_invoice.id:
            updated = Invoice(
                id=request_invoice.id,
                member_id=request_invoice.member_id,
                amount=request_invoice.amount,
                amount_paid=request_invoice.amount_paid,
                status=request_invoice.status,
            )
            db.INVOICES[i] = updated
            return updated
    raise HTTPException(status_code=404, detail="Invoice not found")


@router.delete("/delete_invoice/{id}")
async def delete_invoice(id: int):
    for i, inv in enumerate(db.INVOICES):
        if inv.id == id:
            db.INVOICES.pop(i)
            return {"message": f"Invoice {id} deleted"}
    raise HTTPException(status_code=404, detail="Invoice not found")
