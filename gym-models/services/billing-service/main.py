import sys
import os
from typing import Annotated
from fastapi import FastAPI, HTTPException, Depends
from starlette import status
from sqlalchemy.orm import Session
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
async def create_invoice(db: db_dependency, invoice_request: Invoice_Request):
    invoice_model = Invoice(**invoice_request.dict())
    db.add(invoice_model)
    db.commit()
    db.refresh(invoice_model)
    return invoice_model


@app.put("/invoices/{id}")
async def update_invoice(db: db_dependency, id: int, invoice_request: Invoice_Request):
    invoice = db.query(Invoice).filter(Invoice.id == id).first()
    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    invoice.member_id = invoice_request.member_id
    invoice.amount = invoice_request.amount
    invoice.amount_paid = invoice_request.amount_paid
    invoice.status = invoice_request.status
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return invoice


@app.delete("/invoices/{id}")
async def delete_invoice(db: db_dependency, id: int):
    invoice = db.query(Invoice).filter(Invoice.id == id).first()
    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    db.delete(invoice)
    db.commit()
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
async def create_payment(db: db_dependency, payment_request: Payment_Request):
    payment_model = Payment(**payment_request.dict())
    db.add(payment_model)
    db.commit()
    db.refresh(payment_model)
    return payment_model


@app.put("/payments/{id}")
async def update_payment(db: db_dependency, id: int, payment_request: Payment_Request):
    payment = db.query(Payment).filter(Payment.id == id).first()
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    payment.invoice_id = payment_request.invoice_id
    payment.amount = payment_request.amount
    payment.payment_method = payment_request.payment_method
    payment.notes = payment_request.notes
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


@app.delete("/payments/{id}")
async def delete_payment(db: db_dependency, id: int):
    payment = db.query(Payment).filter(Payment.id == id).first()
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    db.delete(payment)
    db.commit()
    return {"message": "Payment deleted successfully"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.service_port, reload=settings.ENVIRONMENT == "development")
