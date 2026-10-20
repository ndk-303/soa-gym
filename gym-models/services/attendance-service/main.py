import sys
import os
from typing import Annotated
from fastapi import FastAPI, HTTPException, Depends
from starlette import status
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

import models
from models import AttendanceRecord
from schemas import Attendance_Request
from database import engine, SessionLocal, get_db
from config import settings

app = FastAPI(title="Attendance Service - Gym SOA", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

models.Base.metadata.create_all(bind=engine)

db_dependency = Annotated[Session, Depends(get_db)]


@app.on_event("startup")
def startup_populate_data():
    db = SessionLocal()
    try:
        if db.query(AttendanceRecord).count() == 0:
            db.add_all([
                AttendanceRecord(member_id=1, status="checked_in", check_in_time="2026-10-18 08:30:00", notes="Tap buoi sang"),
            ])
            db.commit()
    finally:
        db.close()


@app.get("/health")
async def health():
    return {"status": "UP", "service": "attendance-service"}


@app.get("/attendance")
async def get_all_attendance(db: db_dependency):
    return db.query(AttendanceRecord).all()


@app.get("/attendance/{id}")
async def get_attendance(db: db_dependency, id: int):
    record = db.query(AttendanceRecord).filter(AttendanceRecord.id == id).first()
    if record is None:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    return record


@app.post("/attendance", status_code=status.HTTP_201_CREATED)
async def create_attendance(db: db_dependency, attendance_request: Attendance_Request):
    record_model = AttendanceRecord(**attendance_request.dict())
    db.add(record_model)
    db.commit()
    db.refresh(record_model)
    return record_model


@app.put("/attendance/{id}")
async def update_attendance(db: db_dependency, id: int, attendance_request: Attendance_Request):
    record = db.query(AttendanceRecord).filter(AttendanceRecord.id == id).first()
    if record is None:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    record.member_id = attendance_request.member_id
    record.status = attendance_request.status
    record.check_in_time = attendance_request.check_in_time
    record.check_out_time = attendance_request.check_out_time
    record.notes = attendance_request.notes
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@app.delete("/attendance/{id}")
async def delete_attendance(db: db_dependency, id: int):
    record = db.query(AttendanceRecord).filter(AttendanceRecord.id == id).first()
    if record is None:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    db.delete(record)
    db.commit()
    return {"message": "Attendance record deleted successfully"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.service_port, reload=settings.ENVIRONMENT == "development")
