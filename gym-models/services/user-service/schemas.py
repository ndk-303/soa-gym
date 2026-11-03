from typing import Optional
from pydantic import BaseModel, Field

class User_Request(BaseModel):
    email: str = Field(min_length=5, max_length=100)
    full_name: Optional[str] = Field(default="", max_length=100)
    role: str = Field(default="user", min_length=4, max_length=10)
    password: Optional[str] = Field(default=None, max_length=50)
    is_active: bool = True

    class Config:
        json_schema_extra = {
            'example': {
                'email': 'admin@gym.com',
                'full_name': 'Admin Quản Trị',
                'role': 'admin',
                'password': 'password123',
                'is_active': True,
            }
        }


class User_Role_Update(BaseModel):
    role: str = Field(min_length=4, max_length=10)
    full_name: Optional[str] = None


class Login_Request(BaseModel):
    email: str
    password: str
