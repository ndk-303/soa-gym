from typing import Optional
from sqlalchemy import String, Integer, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base


class Payment(Base):
    __tablename__ = "payment"

    id: Mapped[Optional[int]] = mapped_column(primary_key=True, autoincrement=True, default=None)
    invoice_id: Mapped[int] = mapped_column(Integer, ForeignKey("invoice.id"))
    amount: Mapped[float] = mapped_column(Float)
    payment_method: Mapped[str] = mapped_column(String, default="cash")
    notes: Mapped[Optional[str]] = mapped_column(String, nullable=True, default=None)
