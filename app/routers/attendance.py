from fastapi import APIRouter, HTTPException

from app.models.attendance import AttendanceRecord
from app.schemas.attendance import AttendanceRecordRequest
from app.database import db

router = APIRouter()


@router.get("")
@router.get("/")
async def get_all_attendance():
    return db.ATTENDANCE_RECORDS


@router.get("/get_by_status")
async def get_by_status(status: str):
    return [a for a in db.ATTENDANCE_RECORDS if a.status.casefold() == status.casefold()]


@router.get("/{id}")
async def get_attendance(id: int):
    record = db.find_attendance_by_id(id)
    if record:
        return record
    raise HTTPException(status_code=404, detail="Attendance record not found")


@router.post("/create_record")
async def create_record(request_record: AttendanceRecordRequest):
    new_record = AttendanceRecord(
        id=db.get_next_id(db.ATTENDANCE_RECORDS),
        member_id=request_record.member_id,
        status=request_record.status,
        check_in_time=request_record.check_in_time,
        check_out_time=request_record.check_out_time,
        notes=request_record.notes,
    )
    db.ATTENDANCE_RECORDS.append(new_record)
    return new_record


@router.put("/update_record")
async def update_record(request_record: AttendanceRecordRequest):
    for i, a in enumerate(db.ATTENDANCE_RECORDS):
        if a.id == request_record.id:
            updated = AttendanceRecord(
                id=request_record.id,
                member_id=request_record.member_id,
                status=request_record.status,
                check_in_time=request_record.check_in_time,
                check_out_time=request_record.check_out_time,
                notes=request_record.notes,
            )
            db.ATTENDANCE_RECORDS[i] = updated
            return updated
    raise HTTPException(status_code=404, detail="Attendance record not found")


@router.delete("/delete_record/{id}")
async def delete_record(id: int):
    for i, a in enumerate(db.ATTENDANCE_RECORDS):
        if a.id == id:
            db.ATTENDANCE_RECORDS.pop(i)
            return {"message": f"Attendance record {id} deleted"}
    raise HTTPException(status_code=404, detail="Attendance record not found")
