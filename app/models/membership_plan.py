from typing import Optional
from sqlmodel import Field, SQLModel


class MembershipPlan(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    duration_days: int
    price: float
    is_active: bool = Field(default=True)
