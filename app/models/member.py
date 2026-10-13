from typing import Optional
from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base


class Member(Base):
    __tablename__ = "member"

    id: Mapped[Optional[int]] = mapped_column(primary_key=True, autoincrement=True, default=None)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("user.id"))
    email: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="active")
    membership_plan_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("membershipplan.id"), nullable=True, default=None)
