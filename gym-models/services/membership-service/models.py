from sqlalchemy import Column, Integer, String, Boolean, Float
from database import Base


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
