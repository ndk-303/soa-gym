from sqlalchemy import Column, Integer, String
from database import Base


class AttendanceRecord(Base):
    __tablename__ = 'attendance_records'
    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(Integer)
    status = Column(String, default="checked_in")
    check_in_time = Column(String)
    check_out_time = Column(String, nullable=True)
    notes = Column(String, default="")
