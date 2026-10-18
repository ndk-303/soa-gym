from database import Base
from sqlalchemy import Column, Integer, String, Boolean, Float


class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    role = Column(String)
    password = Column(String)
    is_active = Column(Boolean, default=True)


class MembershipPlan(Base):
    __tablename__ = 'membership_plans'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    duration_days = Column(Integer)
    price = Column(Float)
    is_active = Column(Boolean, default=True)


class Member(Base):
    __tablename__ = 'members'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, unique=True, index=True)
    full_name = Column(String)
    email = Column(String, unique=True, index=True)
    status = Column(String, default="active")
    membership_plan_id = Column(Integer, nullable=True)


class GymClass(Base):
    __tablename__ = 'gym_classes'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    category = Column(String)
    trainer_id = Column(Integer)
    is_active = Column(Boolean, default=True)


class ClassSlot(Base):
    __tablename__ = 'class_slots'
    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer)
    start_time = Column(String)
    max_capacity = Column(Integer, default=20)
    current_bookings = Column(Integer, default=0)
    is_cancelled = Column(Boolean, default=False)


class Booking(Base):
    __tablename__ = 'bookings'
    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(Integer)
    slot_id = Column(Integer)
    status = Column(String, default="confirmed")
    waitlist_position = Column(Integer, nullable=True)


class Invoice(Base):
    __tablename__ = 'invoices'
    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(Integer)
    amount = Column(Float)
    amount_paid = Column(Float, default=0.0)
    status = Column(String, default="pending")


class Payment(Base):
    __tablename__ = 'payments'
    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer)
    amount = Column(Float)
    payment_method = Column(String, default="cash")
    notes = Column(String, default="")


class AttendanceRecord(Base):
    __tablename__ = 'attendance_records'
    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(Integer)
    status = Column(String, default="checked_in")
    check_in_time = Column(String)
    check_out_time = Column(String, nullable=True)
    notes = Column(String, default="")
