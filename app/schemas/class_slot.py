from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class ClassSlotRequest(BaseModel):
    id: Optional[int] = Field(default=None, title="id is not needed")
    class_id: int = Field(gt=0)
    start_time: str = Field(min_length=10, max_length=30)
    max_capacity: int = Field(gt=0, lt=101)
    current_bookings: int = Field(default=0, ge=0)
    is_cancelled: bool = Field(default=False)

    model_config = ConfigDict(
        json_schema_extra={
            'example': {
                'class_id': 1,
                'start_time': '2026-10-12 06:00:00',
                'max_capacity': 15,
                'current_bookings': 0,
                'is_cancelled': False,
            }
        }
    )
