from sqlalchemy import Column, Integer, String
from database import Base


class Booking(Base):
    __tablename__ = 'bookings'
    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(Integer)
    slot_id = Column(Integer)
    status = Column(String, default="confirmed")
    waitlist_position = Column(Integer, nullable=True)
