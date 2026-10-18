from sqlalchemy import Column, Integer, String, Boolean
from database import Base


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
