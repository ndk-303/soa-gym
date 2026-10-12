from typing import Optional
from sqlmodel import Field, SQLModel


class AttendanceRecord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    member_id: int = Field(foreign_key="member.id")
    status: str = Field(default="checked_in")
    check_in_time: str
    check_out_time: Optional[str] = Field(default=None)
    notes: Optional[str] = Field(default=None)
