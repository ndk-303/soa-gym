from typing import Optional

from fastapi import FastAPI, Body
from pydantic import BaseModel, Field

app = FastAPI()


class AttendanceRecord:
    id: int
    member_id: int
    status: str
    check_in_time: str
    check_out_time: Optional[str]
    notes: Optional[str]

    def __init__(self, id, member_id, status="checked_in", check_in_time="2026-10-11 08:00:00", check_out_time=None, notes=""):
        self.id = id
        self.member_id = member_id
        self.status = status
        self.check_in_time = check_in_time
        self.check_out_time = check_out_time
        self.notes = notes


class AttendanceRecordRequest(BaseModel):
    id: Optional[int] = Field(default=None, title="id is not needed")
    member_id: int = Field(gt=0)
    status: str = Field(default="checked_in", min_length=5, max_length=20)
    check_in_time: str = Field(min_length=10, max_length=30)
    check_out_time: Optional[str] = Field(default=None)
    notes: Optional[str] = Field(default="", max_length=255)

    class Config:
        json_schema_extra = {
            'example': {
                'member_id': 1,
                'status': 'checked_in',
                'check_in_time': '2026-10-11 08:30:00',
                'check_out_time': None,
                'notes': 'Check-in buoi sang',
            }
        }


ATTENDANCE_RECORDS = [
    AttendanceRecord(1, 1, "checked_in", "2026-10-11 08:30:00", None, "Check-in buoi sang"),
    AttendanceRecord(2, 2, "checked_out", "2026-10-11 06:15:00", "2026-10-11 07:45:00", "Tap buoi sang"),
    AttendanceRecord(3, 1, "checked_out", "2026-10-10 17:00:00", "2026-10-10 18:30:00", "Tap buoi chieu"),
]


@app.get("/")
async def home():
    return {"message": "Attendance Service"}


@app.get("/attendance")
async def get_all_attendance():
    return ATTENDANCE_RECORDS


@app.get("/attendance/get_by_status")
async def get_by_status(status: str):
    attendance_result = []
    for record in ATTENDANCE_RECORDS:
        if record.status.casefold() == status.casefold():
            attendance_result.append(record)
    return attendance_result


@app.get("/attendance/{id}")
async def get_attendance(id: int):
    for record in ATTENDANCE_RECORDS:
        if record.id == id:
            return record


@app.post("/attendance/create_record")
async def create_attendance(request_record: AttendanceRecordRequest):
    new_record = AttendanceRecord(**request_record.dict())
    ATTENDANCE_RECORDS.append(find_record_id(new_record))


def find_record_id(record: AttendanceRecord):
    record.id = 1 if len(ATTENDANCE_RECORDS) == 0 else ATTENDANCE_RECORDS[-1].id + 1
    return record


@app.put("/attendance/update_record")
async def update_attendance(record: AttendanceRecordRequest):
    for i in range(len(ATTENDANCE_RECORDS)):
        if ATTENDANCE_RECORDS[i].id == record.id:
            ATTENDANCE_RECORDS[i] = record


@app.delete("/attendance/delete_record/{id}")
async def delete_attendance(id: int):
    for i in range(len(ATTENDANCE_RECORDS)):
        if ATTENDANCE_RECORDS[i].id == id:
            ATTENDANCE_RECORDS.pop(i)
            break
