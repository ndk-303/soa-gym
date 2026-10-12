from typing import Optional
from sqlmodel import Field, SQLModel


class GymClass(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    category: str
    trainer_id: int = Field(foreign_key="user.id")
    is_active: bool = Field(default=True)
