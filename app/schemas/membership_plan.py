from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class MembershipPlanRequest(BaseModel):
    id: Optional[int] = Field(default=None, title="id is not needed")
    name: str = Field(min_length=3, max_length=100)
    duration_days: int = Field(gt=0, lt=366)
    price: float = Field(gt=0, lt=100000000)
    is_active: bool = Field(default=True)

    model_config = ConfigDict(
        json_schema_extra={
            'example': {
                'name': 'Goi 1 Thang Co Ban',
                'duration_days': 30,
                'price': 500000.0,
                'is_active': True,
            }
        }
    )
