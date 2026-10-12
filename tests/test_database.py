import pytest
from sqlmodel import SQLModel, create_engine, Session, select
from sqlalchemy.pool import StaticPool
from app.database.session import create_db_and_tables, get_session, engine
from app.database.seed import seed_database
from app.models.user import User
from app.models.membership_plan import MembershipPlan
from app.models.member import Member
from app.models.gym_class import GymClass
from app.models.class_slot import ClassSlot
from app.models.booking import Booking
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.attendance import AttendanceRecord


def test_session_and_seed_database():
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(test_engine)
    with Session(test_engine) as session:
        seed_database(session)

        users = session.exec(select(User)).all()
        assert len(users) == 6
        assert session.get(User, 1).email == "admin@gym.com"

        plans = session.exec(select(MembershipPlan)).all()
        assert len(plans) == 4

        members = session.exec(select(Member)).all()
        assert len(members) == 3

        classes = session.exec(select(GymClass)).all()
        assert len(classes) == 4

        slots = session.exec(select(ClassSlot)).all()
        assert len(slots) == 4

        bookings = session.exec(select(Booking)).all()
        assert len(bookings) == 4

        invoices = session.exec(select(Invoice)).all()
        assert len(invoices) == 4

        payments = session.exec(select(Payment)).all()
        assert len(payments) == 3

        records = session.exec(select(AttendanceRecord)).all()
        assert len(records) == 3

        # Second seeding should be idempotent (no duplicates added)
        seed_database(session)
        assert len(session.exec(select(User)).all()) == 6


def test_get_session_yield():
    gen = get_session()
    sess = next(gen)
    assert isinstance(sess, Session)
    try:
        next(gen)
    except StopIteration:
        pass
