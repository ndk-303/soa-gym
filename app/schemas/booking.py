from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class BookingRequest(BaseModel):
    id: Optional[int] = Field(default=None, title="id is not needed")
    member_id: int = Field(gt=0)
    slot_id: int = Field(gt=0)
    status: str = Field(default="confirmed", min_length=4, max_length=20)
    waitlist_position: Optional[int] = Field(default=None, ge=1)

    model_config = ConfigDict(
        json_schema_extra={
            'example': {
                'member_id': 1,
                'slot_id': 1,
                'status': 'confirmed',
                'waitlist_position': None,
            }
        }
    )
