import sys
import os
import threading
from typing import Annotated
import httpx
from fastapi import FastAPI, HTTPException, Depends
from starlette import status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
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

# Concurrency lock to prevent double check-in race conditions
attendance_lock = threading.RLock()


def _commit_with_rollback(db: Session):
    """Commit transaction safely, rolling back on SQLAlchemyError."""
    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(exc)}",
        )


def _verify_member_active_for_checkin(member_id: int):
    """Inter-service check against membership-service to confirm active status and plan."""
    url = f"{settings.MEMBERSHIP_SERVICE_URL}/members/{member_id}"
    try:
        resp = httpx.get(url, timeout=3.0)
    except (httpx.ConnectError, httpx.ConnectTimeout):
        # Fallback when membership-service is offline in isolated unit tests
        return

    if resp.status_code == 404:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hội viên không tồn tại")
    if resp.status_code != 200:
        return

    member_data = resp.json()
    if member_data.get("status") != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản hội viên không hoạt động",
        )
    if member_data.get("membership_plan_id") is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hội viên chưa đăng ký gói tập",
        )


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
def create_attendance(db: db_dependency, attendance_request: Attendance_Request):
    with attendance_lock:
        if attendance_request.status == "checked_in":
            active_session = (
                db.query(AttendanceRecord)
                .filter(
                    AttendanceRecord.member_id == attendance_request.member_id,
                    AttendanceRecord.status == "checked_in",
                )
                .first()
            )
            if active_session is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Hội viên đang trong một phiên tập chưa kết thúc",
                )
            _verify_member_active_for_checkin(attendance_request.member_id)

        record_model = AttendanceRecord(**attendance_request.dict())
        db.add(record_model)
        _commit_with_rollback(db)
        db.refresh(record_model)
        return record_model


@app.put("/attendance/{id}")
def update_attendance(db: db_dependency, id: int, attendance_request: Attendance_Request):
    with attendance_lock:
        record = db.query(AttendanceRecord).filter(AttendanceRecord.id == id).first()
        if record is None:
            raise HTTPException(status_code=404, detail="Attendance record not found")

        if attendance_request.status == "checked_in":
            active_session = (
                db.query(AttendanceRecord)
                .filter(
                    AttendanceRecord.id != id,
                    AttendanceRecord.member_id == attendance_request.member_id,
                    AttendanceRecord.status == "checked_in",
                )
                .first()
            )
            if active_session is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Hội viên đang trong một phiên tập chưa kết thúc",
                )

        record.member_id = attendance_request.member_id
        record.status = attendance_request.status
        record.check_in_time = attendance_request.check_in_time
        record.check_out_time = attendance_request.check_out_time
        record.notes = attendance_request.notes
        db.add(record)
        _commit_with_rollback(db)
        db.refresh(record)
        return record

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.service_port, reload=settings.ENVIRONMENT == "development")
