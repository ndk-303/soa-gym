from typing import Optional
from sqlmodel import Field, SQLModel


class Member(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    email: str
    status: str = Field(default="active")
    membership_plan_id: Optional[int] = Field(default=None, foreign_key="membershipplan.id")
