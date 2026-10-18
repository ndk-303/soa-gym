from typing import Optional
from pydantic import BaseModel, Field


class Booking_Request(BaseModel):
    member_id: int = Field(gt=0)
    slot_id: int = Field(gt=0)
    status: str = Field(default="confirmed", min_length=4, max_length=20)
    waitlist_position: Optional[int] = Field(default=None, ge=1)

    class Config:
        json_schema_extra = {
            'example': {
                'member_id': 1,
                'slot_id': 1,
                'status': 'confirmed',
                'waitlist_position': None,
            }
        }
