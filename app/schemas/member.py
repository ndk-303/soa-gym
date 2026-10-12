from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class MemberRequest(BaseModel):
    id: Optional[int] = Field(default=None, title="id is not needed")
    user_id: int = Field(gt=0)
    email: str = Field(min_length=5, max_length=100)
    status: str = Field(default="active", min_length=4, max_length=20)
    membership_plan_id: Optional[int] = Field(default=None, gt=0)

    model_config = ConfigDict(
        json_schema_extra={
            'example': {
                'user_id': 4,
                'email': 'member.an@gym.com',
                'status': 'active',
                'membership_plan_id': 1,
            }
        }
    )
