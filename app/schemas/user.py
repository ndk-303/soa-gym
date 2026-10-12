from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class UserRequest(BaseModel):
    id: Optional[int] = Field(default=None, title="id is not needed")
    email: str = Field(min_length=5, max_length=100)
    role: str = Field(min_length=4, max_length=10)
    password: str = Field(min_length=6, max_length=50)

    model_config = ConfigDict(
        json_schema_extra={
            'example': {
                'email': 'admin@gym.com',
                'role': 'admin',
                'password': 'password123',
            }
        }
    )
