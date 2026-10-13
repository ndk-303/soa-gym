from typing import Optional
from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base


class Booking(Base):
    __tablename__ = "booking"

    id: Mapped[Optional[int]] = mapped_column(primary_key=True, autoincrement=True, default=None)
    member_id: Mapped[int] = mapped_column(Integer, ForeignKey("member.id"))
    slot_id: Mapped[int] = mapped_column(Integer, ForeignKey("classslot.id"))
    status: Mapped[str] = mapped_column(String, default="confirmed")
    waitlist_position: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=None)
