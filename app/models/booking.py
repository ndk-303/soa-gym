from typing import Optional
from sqlmodel import Field, SQLModel


class Booking(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    member_id: int = Field(foreign_key="member.id")
    slot_id: int = Field(foreign_key="classslot.id")
    status: str = Field(default="confirmed")
    waitlist_position: Optional[int] = Field(default=None)
