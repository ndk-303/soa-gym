from pydantic import BaseModel, Field

class User_Request(BaseModel):
    email: str = Field(min_length=5, max_length=100)
    role: str = Field(min_length=4, max_length=10)
    password: str = Field(min_length=6, max_length=50)
    is_active: bool = True

    class Config:
        json_schema_extra = {
            'example': {
                'email': 'admin@gym.com',
                'role': 'admin',
                'password': 'password123',
                'is_active': True,
            }
        }


class Login_Request(BaseModel):
    email: str
    password: str

