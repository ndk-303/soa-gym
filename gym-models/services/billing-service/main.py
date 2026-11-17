import sys
import os
import threading
from typing import Annotated
from fastapi import FastAPI, HTTPException, Depends
from starlette import status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from fastapi.middleware.cors import CORSMiddleware

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

import models
from models import Invoice, Payment
from schemas import Invoice_Request, Payment_Request
from database import engine, SessionLocal, get_db
from config import settings

app = FastAPI(title="Billing Service - Gym SOA", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

models.Base.metadata.create_all(bind=engine)

db_dependency = Annotated[Session, Depends(get_db)]

# Concurrency lock for atomic invoice and payment mutations
billing_lock = threading.RLock()


def _commit_with_rollback(db: Session):
    """Commit transaction safely, rolling back on SQLAlchemyError."""
    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(exc)}",
        )


def _recalculate_invoice_in_tx(db: Session, invoice_id: int):
    """Recompute invoice amount_paid and status inside the active transaction."""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if invoice is None:
        return
    payments = db.query(Payment).filter(Payment.invoice_id == invoice_id).all()
    total_paid = round(sum(float(p.amount or 0.0) for p in payments), 2)
    invoice.amount_paid = total_paid
    if invoice.status != "cancelled":
        if invoice.amount_paid >= float(invoice.amount or 0.0):
            invoice.status = "paid"
        elif invoice.amount_paid > 0:
            invoice.status = "partially_paid"
        else:
            invoice.status = "pending"
    db.add(invoice)


@app.on_event("startup")
def startup_populate_data():
    db = SessionLocal()
    try:
        if db.query(Invoice).count() == 0:
            db.add_all([
                Invoice(member_id=1, amount=500000.0, amount_paid=500000.0, status="paid"),
                Invoice(member_id=1, amount=1350000.0, amount_paid=0.0, status="pending"),
            ])
            db.commit()

        if db.query(Payment).count() == 0:
            db.add_all([
                Payment(invoice_id=1, amount=500000.0, payment_method="bank_transfer", notes="Chuyen khoan VietQR"),
            ])
            db.commit()
    finally:
        db.close()


@app.get("/health")
async def health():
    return {"status": "UP", "service": "billing-service"}


# ==================== Invoices Endpoints ====================

@app.get("/invoices")
async def get_all_invoices(db: db_dependency):
    return db.query(Invoice).all()


@app.get("/invoices/{id}")
async def get_invoice(db: db_dependency, id: int):
    invoice = db.query(Invoice).filter(Invoice.id == id).first()
    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@app.post("/invoices", status_code=status.HTTP_201_CREATED)
def create_invoice(db: db_dependency, invoice_request: Invoice_Request):
    with billing_lock:
        if invoice_request.amount_paid > invoice_request.amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="amount_paid cannot exceed invoice amount",
            )
        invoice_model = Invoice(**invoice_request.dict())
        db.add(invoice_model)
        _commit_with_rollback(db)
        db.refresh(invoice_model)
        return invoice_model


@app.put("/invoices/{id}")
def update_invoice(db: db_dependency, id: int, invoice_request: Invoice_Request):
    with billing_lock:
        invoice = db.query(Invoice).filter(Invoice.id == id).first()
        if invoice is None:
            raise HTTPException(status_code=404, detail="Invoice not found")
        if invoice_request.amount_paid > invoice_request.amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="amount_paid cannot exceed invoice amount",
            )
        invoice.member_id = invoice_request.member_id
        invoice.amount = invoice_request.amount
        invoice.amount_paid = invoice_request.amount_paid
        invoice.status = invoice_request.status
        db.add(invoice)
        _commit_with_rollback(db)
        db.refresh(invoice)
        return invoice


@app.delete("/invoices/{id}")
def delete_invoice(db: db_dependency, id: int):
    with billing_lock:
        invoice = db.query(Invoice).filter(Invoice.id == id).first()
        if invoice is None:
            raise HTTPException(status_code=404, detail="Invoice not found")
        db.delete(invoice)
        _commit_with_rollback(db)
        return {"message": "Invoice deleted successfully"}


# ==================== Payments Endpoints ====================

@app.get("/payments")
async def get_all_payments(db: db_dependency):
    return db.query(Payment).all()


@app.get("/payments/{id}")
async def get_payment(db: db_dependency, id: int):
    payment = db.query(Payment).filter(Payment.id == id).first()
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment


@app.post("/payments", status_code=status.HTTP_201_CREATED)
def create_payment(db: db_dependency, payment_request: Payment_Request):
    with billing_lock:
        invoice = db.query(Invoice).filter(Invoice.id == payment_request.invoice_id).first()
        if invoice is None:
            raise HTTPException(status_code=404, detail="Invoice not found")
        if invoice.status == "cancelled":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot record payment for a cancelled invoice",
            )

        payment_model = Payment(**payment_request.dict())
        db.add(payment_model)
        db.flush()
        _recalculate_invoice_in_tx(db, payment_model.invoice_id)
        _commit_with_rollback(db)
        db.refresh(payment_model)
        return payment_model


@app.put("/payments/{id}")
def update_payment(db: db_dependency, id: int, payment_request: Payment_Request):
    with billing_lock:
        payment = db.query(Payment).filter(Payment.id == id).first()
        if payment is None:
            raise HTTPException(status_code=404, detail="Payment not found")

        target_invoice = db.query(Invoice).filter(Invoice.id == payment_request.invoice_id).first()
        if target_invoice is None:
            raise HTTPException(status_code=404, detail="Invoice not found")
        if target_invoice.status == "cancelled":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot assign payment to a cancelled invoice",
            )

        old_invoice_id = payment.invoice_id
        payment.invoice_id = payment_request.invoice_id
        payment.amount = payment_request.amount
        payment.payment_method = payment_request.payment_method
        payment.notes = payment_request.notes
        db.add(payment)
        db.flush()

        _recalculate_invoice_in_tx(db, old_invoice_id)
        if payment.invoice_id != old_invoice_id:
            _recalculate_invoice_in_tx(db, payment.invoice_id)
        _commit_with_rollback(db)
        db.refresh(payment)
        return payment


@app.delete("/payments/{id}")
def delete_payment(db: db_dependency, id: int):
    with billing_lock:
        payment = db.query(Payment).filter(Payment.id == id).first()
        if payment is None:
            raise HTTPException(status_code=404, detail="Payment not found")
        invoice_id = payment.invoice_id
        db.delete(payment)
        db.flush()
        _recalculate_invoice_in_tx(db, invoice_id)
        _commit_with_rollback(db)
        return {"message": "Payment deleted successfully"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.service_port, reload=settings.ENVIRONMENT == "development")
