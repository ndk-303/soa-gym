from typing import Optional
from sqlmodel import Field, SQLModel


class ClassSlot(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    class_id: int = Field(foreign_key="gymclass.id")
    start_time: str
    max_capacity: int = Field(default=20)
    current_bookings: int = Field(default=0)
    is_cancelled: bool = Field(default=False)
