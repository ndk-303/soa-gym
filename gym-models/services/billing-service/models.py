from sqlalchemy import Column, Integer, String, Float
from database import Base


class Invoice(Base):
    __tablename__ = 'invoices'
    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(Integer)
    amount = Column(Float)
    amount_paid = Column(Float, default=0.0)
    status = Column(String, default="pending")


class Payment(Base):
    __tablename__ = 'payments'
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer)
    amount = Column(Float)
    payment_method = Column(String, default="cash")
    notes = Column(String, default="")
