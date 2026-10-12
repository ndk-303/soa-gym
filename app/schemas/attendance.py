from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class AttendanceRecordRequest(BaseModel):
    id: Optional[int] = Field(default=None, title="id is not needed")
    member_id: int = Field(gt=0)
    status: str = Field(default="checked_in", min_length=5, max_length=20)
    check_in_time: str = Field(min_length=10, max_length=30)
    check_out_time: Optional[str] = Field(default=None)
    notes: Optional[str] = Field(default="", max_length=255)

    model_config = ConfigDict(
        json_schema_extra={
            'example': {
                'member_id': 1,
                'status': 'checked_in',
                'check_in_time': '2026-10-11 08:30:00',
                'check_out_time': None,
                'notes': 'Check-in buoi sang',
            }
        }
    )
