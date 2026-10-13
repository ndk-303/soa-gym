from typing import Optional
from sqlalchemy import String, Integer, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base


class GymClass(Base):
    __tablename__ = "gymclass"

    id: Mapped[Optional[int]] = mapped_column(primary_key=True, autoincrement=True, default=None)
    name: Mapped[str] = mapped_column(String)
    category: Mapped[str] = mapped_column(String)
    trainer_id: Mapped[int] = mapped_column(Integer, ForeignKey("user.id"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
