from typing import Optional
from sqlalchemy import String, Integer, Float, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base


class MembershipPlan(Base):
    __tablename__ = "membershipplan"

    id: Mapped[Optional[int]] = mapped_column(primary_key=True, autoincrement=True, default=None)
    name: Mapped[str] = mapped_column(String)
    duration_days: Mapped[int] = mapped_column(Integer)
    price: Mapped[float] = mapped_column(Float)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
