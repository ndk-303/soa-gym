from typing import List
from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.payment import Payment
from app.models.invoice import Invoice
from app.schemas.payment import PaymentRequest, PaymentResponse
from app.database.session import get_session

router = APIRouter(tags=["Payments"])


@router.get("", response_model=List[PaymentResponse])
def get_all_payments(session: Session = Depends(get_session)):
    return session.scalars(select(Payment)).all()


@router.get("/get_by_method", response_model=List[PaymentResponse])
def get_payments_by_method(method: str, session: Session = Depends(get_session)):
    return session.scalars(select(Payment)).where(Payment.payment_method == method.casefold()).all()


@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment_by_id(payment_id: int = Path(gt=0), session: Session = Depends(get_session)):
    payment = session.get(Payment, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail=f"Payment with id {payment_id} not found")
    return payment


@router.post("/create_payment", response_model=PaymentResponse)
def create_payment(req: PaymentRequest, session: Session = Depends(get_session)):
    invoice = session.get(Invoice, req.invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail=f"Invoice with id {req.invoice_id} not found")

    if invoice.status.casefold() == "paid":
        raise HTTPException(status_code=400, detail="Invoice is already fully paid")

    new_payment = Payment(**req.model_dump(exclude={"id"}))
    session.add(new_payment)

    invoice.amount_paid += req.amount
    if invoice.amount_paid >= invoice.amount:
        invoice.status = "paid"
    elif invoice.amount_paid > 0:
        invoice.status = "partial"
    session.add(invoice)

    session.commit()
    session.refresh(new_payment)
    return new_payment


@router.put("/update_payment", response_model=PaymentResponse)
def update_payment(req: PaymentRequest, session: Session = Depends(get_session)):
    payment = session.get(Payment, req.id)
    if not payment:
        raise HTTPException(status_code=404, detail=f"Payment with id {req.id} not found")

    invoice = session.get(Invoice, req.invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail=f"Invoice with id {req.invoice_id} not found")

    payment.invoice_id = req.invoice_id
    payment.amount = req.amount
    payment.payment_method = req.payment_method
    payment.notes = req.notes
    session.add(payment)
    session.commit()
    session.refresh(payment)
    return payment


@router.delete("/delete_payment/{payment_id}")
def delete_payment(payment_id: int = Path(gt=0), session: Session = Depends(get_session)):
    payment = session.get(Payment, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail=f"Payment with id {payment_id} not found")
    session.delete(payment)
    session.commit()
    return {"detail": f"Payment {payment_id} deleted successfully"}
