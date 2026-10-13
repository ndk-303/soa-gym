from typing import Optional
from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base


class AttendanceRecord(Base):
    __tablename__ = "attendancerecord"

    id: Mapped[Optional[int]] = mapped_column(primary_key=True, autoincrement=True, default=None)
    member_id: Mapped[int] = mapped_column(Integer, ForeignKey("member.id"))
    status: Mapped[str] = mapped_column(String, default="checked_in")
    check_in_time: Mapped[str] = mapped_column(String)
    check_out_time: Mapped[Optional[str]] = mapped_column(String, nullable=True, default=None)
    notes: Mapped[Optional[str]] = mapped_column(String, nullable=True, default=None)
