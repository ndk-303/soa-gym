from typing import Optional
from sqlalchemy import String, Integer, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base


class ClassSlot(Base):
    __tablename__ = "classslot"

    id: Mapped[Optional[int]] = mapped_column(primary_key=True, autoincrement=True, default=None)
    class_id: Mapped[int] = mapped_column(Integer, ForeignKey("gymclass.id"))
    start_time: Mapped[str] = mapped_column(String)
    max_capacity: Mapped[int] = mapped_column(Integer, default=20)
    current_bookings: Mapped[int] = mapped_column(Integer, default=0)
    is_cancelled: Mapped[bool] = mapped_column(Boolean, default=False)
