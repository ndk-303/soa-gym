from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class GymClassRequest(BaseModel):
    id: Optional[int] = Field(default=None, title="id is not needed")
    name: str = Field(min_length=3, max_length=100)
    category: str = Field(min_length=3, max_length=50)
    trainer_id: int = Field(gt=0)
    is_active: bool = Field(default=True)

    model_config = ConfigDict(
        json_schema_extra={
            'example': {
                'name': 'Yoga Binh Minh',
                'category': 'Yoga',
                'trainer_id': 2,
                'is_active': True,
            }
        }
    )
