from pydantic import BaseModel, Field


class GymClass_Request(BaseModel):
    name: str = Field(min_length=3, max_length=100)
    category: str = Field(min_length=3, max_length=50)
    trainer_id: int = Field(gt=0)
    is_active: bool = True

    class Config:
        json_schema_extra = {
            'example': {
                'name': 'Yoga Binh Minh',
                'category': 'Yoga',
                'trainer_id': 2,
                'is_active': True,
            }
        }


class ClassSlot_Request(BaseModel):
    class_id: int = Field(gt=0)
    start_time: str = Field(min_length=10, max_length=30)
    max_capacity: int = Field(gt=0, lt=101)
    current_bookings: int = Field(default=0, ge=0)
    is_cancelled: bool = False

    class Config:
        json_schema_extra = {
            'example': {
                'class_id': 1,
                'start_time': '2026-10-19 06:00:00',
                'max_capacity': 15,
                'current_bookings': 0,
                'is_cancelled': False,
            }
        }
