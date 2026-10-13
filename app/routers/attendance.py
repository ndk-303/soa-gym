from typing import List
from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.attendance import AttendanceRecord
from app.schemas.attendance import AttendanceRecordRequest, AttendanceRecordResponse
from app.database.session import get_session

router = APIRouter(tags=["Attendance"])


@router.get("", response_model=List[AttendanceRecordResponse])
def get_all_attendance(session: Session = Depends(get_session)):
    return session.scalars(select(AttendanceRecord)).all()


@router.get("/get_by_status", response_model=List[AttendanceRecordResponse])
def get_attendance_by_status(status: str, session: Session = Depends(get_session)):
    return session.scalars(select(AttendanceRecord).where(AttendanceRecord.status == status.casefold())).all()


@router.get("/{attendance_id}", response_model=AttendanceRecordResponse)
def get_attendance_by_id(attendance_id: int = Path(gt=0), session: Session = Depends(get_session)):
    record = session.get(AttendanceRecord, attendance_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Attendance record with id {attendance_id} not found")
    return record


@router.post("/create_attendance", response_model=AttendanceRecordResponse)
@router.post("/create_record", response_model=AttendanceRecordResponse)
def create_attendance(req: AttendanceRecordRequest, session: Session = Depends(get_session)):
    new_record = AttendanceRecord(**req.model_dump(exclude={"id"}))
    session.add(new_record)
    session.commit()
    session.refresh(new_record)
    return new_record


@router.put("/update_attendance", response_model=AttendanceRecordResponse)
def update_attendance(req: AttendanceRecordRequest, session: Session = Depends(get_session)):
    record = session.get(AttendanceRecord, req.id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Attendance record with id {req.id} not found")
    record.member_id = req.member_id
    record.status = req.status
    record.check_in_time = req.check_in_time
    record.check_out_time = req.check_out_time
    record.notes = req.notes
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


@router.delete("/delete_attendance/{attendance_id}")
def delete_attendance(attendance_id: int = Path(gt=0), session: Session = Depends(get_session)):
    record = session.get(AttendanceRecord, attendance_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Attendance record with id {attendance_id} not found")
    session.delete(record)
    session.commit()
    return {"detail": f"Attendance record {attendance_id} deleted successfully"}
