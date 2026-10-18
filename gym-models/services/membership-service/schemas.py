from typing import Optional
from pydantic import BaseModel, Field


class MembershipPlan_Request(BaseModel):
    name: str = Field(min_length=3, max_length=100)
    duration_days: int = Field(gt=0, lt=366)
    price: float = Field(gt=0, lt=100000000)
    is_active: bool = True

    class Config:
        json_schema_extra = {
            'example': {
                'name': 'Goi 1 Thang Co Ban',
                'duration_days': 30,
                'price': 500000.0,
                'is_active': True,
            }
        }


class Member_Request(BaseModel):
    user_id: int = Field(gt=0)
    full_name: str = Field(min_length=3, max_length=100)
    email: str = Field(min_length=5, max_length=100)
    status: str = Field(default="active", min_length=4, max_length=20)
    membership_plan_id: Optional[int] = Field(default=None, gt=0)

    class Config:
        json_schema_extra = {
            'example': {
                'user_id': 3,
                'full_name': 'Nguyen Van An',
                'email': 'an.nguyen@gym.com',
                'status': 'active',
                'membership_plan_id': 1,
            }
        }
