from typing import Optional
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base


class User(Base):
    __tablename__ = "user"

    id: Mapped[Optional[int]] = mapped_column(primary_key=True, autoincrement=True, default=None)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    role: Mapped[str] = mapped_column(String)
    password: Mapped[str] = mapped_column(String)
