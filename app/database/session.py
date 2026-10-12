import os
from typing import Generator
from sqlmodel import SQLModel, Session, create_engine

# Import all models to ensure SQLModel.metadata registers them all
from app.models.user import User
from app.models.membership_plan import MembershipPlan
from app.models.member import Member
from app.models.gym_class import GymClass
from app.models.class_slot import ClassSlot
from app.models.booking import Booking
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.attendance import AttendanceRecord

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///gym.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
