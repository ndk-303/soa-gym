from fastapi import APIRouter, HTTPException

from app.models.payment import Payment
from app.schemas.payment import PaymentRequest
from app.database import db

router = APIRouter()


@router.get("")
@router.get("/")
async def get_all_payments():
    return db.PAYMENTS


@router.get("/get_by_method")
async def get_by_method(method: str):
    return [p for p in db.PAYMENTS if p.payment_method.casefold() == method.casefold()]


@router.get("/{id}")
async def get_payment(id: int):
    payment = db.find_payment_by_id(id)
    if payment:
        return payment
    raise HTTPException(status_code=404, detail="Payment not found")


@router.post("/create_payment")
async def create_payment(request_payment: PaymentRequest):
    invoice = db.find_invoice_by_id(request_payment.invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if invoice.status.casefold() == "paid":
        raise HTTPException(status_code=400, detail="Invoice is already fully paid")

    invoice.amount_paid += request_payment.amount
    if invoice.amount_paid >= invoice.amount:
        invoice.status = "paid"

    new_payment = Payment(
        id=db.get_next_id(db.PAYMENTS),
        invoice_id=request_payment.invoice_id,
        amount=request_payment.amount,
        payment_method=request_payment.payment_method,
        notes=request_payment.notes,
    )
    db.PAYMENTS.append(new_payment)
    return new_payment


@router.put("/update_payment")
async def update_payment(request_payment: PaymentRequest):
    for i, p in enumerate(db.PAYMENTS):
        if p.id == request_payment.id:
            updated = Payment(
                id=request_payment.id,
                invoice_id=request_payment.invoice_id,
                amount=request_payment.amount,
                payment_method=request_payment.payment_method,
                notes=request_payment.notes,
            )
            db.PAYMENTS[i] = updated
            return updated
    raise HTTPException(status_code=404, detail="Payment not found")


@router.delete("/delete_payment/{id}")
async def delete_payment(id: int):
    for i, p in enumerate(db.PAYMENTS):
        if p.id == id:
            db.PAYMENTS.pop(i)
            return {"message": f"Payment {id} deleted"}
    raise HTTPException(status_code=404, detail="Payment not found")
