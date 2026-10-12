from typing import List
from fastapi import APIRouter, Depends, HTTPException, Path
from sqlmodel import Session, select
from app.models.invoice import Invoice
from app.schemas.invoice import InvoiceRequest
from app.database.session import get_session

router = APIRouter(tags=["Invoices"])


@router.get("", response_model=List[Invoice])
def get_all_invoices(session: Session = Depends(get_session)):
    return session.exec(select(Invoice)).all()


@router.get("/get_by_status", response_model=List[Invoice])
def get_invoices_by_status(status: str, session: Session = Depends(get_session)):
    return session.exec(select(Invoice).where(Invoice.status == status.casefold())).all()


@router.get("/{invoice_id}", response_model=Invoice)
def get_invoice_by_id(invoice_id: int = Path(gt=0), session: Session = Depends(get_session)):
    invoice = session.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail=f"Invoice with id {invoice_id} not found")
    return invoice


@router.post("/create_invoice", response_model=Invoice)
def create_invoice(req: InvoiceRequest, session: Session = Depends(get_session)):
    new_invoice = Invoice.model_validate(req)
    session.add(new_invoice)
    session.commit()
    session.refresh(new_invoice)
    return new_invoice


@router.put("/update_invoice", response_model=Invoice)
def update_invoice(req: InvoiceRequest, session: Session = Depends(get_session)):
    invoice = session.get(Invoice, req.id)
    if not invoice:
        raise HTTPException(status_code=404, detail=f"Invoice with id {req.id} not found")
    invoice.member_id = req.member_id
    invoice.amount = req.amount
    invoice.amount_paid = req.amount_paid
    invoice.status = req.status
    session.add(invoice)
    session.commit()
    session.refresh(invoice)
    return invoice


@router.delete("/delete_invoice/{invoice_id}")
def delete_invoice(invoice_id: int = Path(gt=0), session: Session = Depends(get_session)):
    invoice = session.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail=f"Invoice with id {invoice_id} not found")
    session.delete(invoice)
    session.commit()
    return {"detail": f"Invoice {invoice_id} deleted successfully"}
