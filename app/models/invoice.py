from typing import Optional
from sqlmodel import Field, SQLModel


class Invoice(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    member_id: int = Field(foreign_key="member.id")
    amount: float
    amount_paid: float = Field(default=0.0)
    status: str = Field(default="pending")
