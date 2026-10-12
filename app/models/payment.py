from typing import Optional
from sqlmodel import Field, SQLModel


class Payment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    invoice_id: int = Field(foreign_key="invoice.id")
    amount: float
    payment_method: str = Field(default="cash")
    notes: Optional[str] = Field(default=None)
