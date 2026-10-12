from typing import Optional

from fastapi import FastAPI, Body, HTTPException
from pydantic import BaseModel, Field

app = FastAPI()


class User:
    id: int
    email: str
    role: str
    password: str

    def __init__(self, id, email, role, password):
        self.id = id
        self.email = email
        self.role = role
        self.password = password


class UserRequest(BaseModel):
    id: Optional[int] = Field(default=None, title="id is not needed")
    email: str = Field(min_length=5, max_length=100)
    role: str = Field(min_length=4, max_length=10)
    password: str = Field(min_length=6, max_length=50)

    class Config:
        json_schema_extra = {
            'example': {
                'email': 'admin@gym.com',
                'role': 'admin',
                'password': 'password123',
            }
        }


USERS = [
    User(1, "admin@gym.com", "admin", "admin123"),
    User(2, "trainer.nam@gym.com", "trainer", "trainer123"),
    User(3, "trainer.hoa@gym.com", "trainer", "trainer123"),
    User(4, "member.an@gym.com", "member", "member123"),
]


@app.get("/")
async def home():
    return {"message": "User Management Service"}


@app.get("/users")
async def get_all_users():
    return USERS


@app.get("/users/get_role")
async def get_by_role(role: str):
    role_result = []
    for user in USERS:
        if user.role.casefold() == role.casefold():
            role_result.append(user)
    return role_result


@app.get("/users/{id}")
async def get_user(id: int):
    for user in USERS:
        if user.id == id:
            return user
    raise HTTPException(status_code=404, detail="User not found")


@app.post("/user/create_user")
async def create_user(request_user: UserRequest):
    new_user = User(**request_user.dict())
    USERS.append(find_user_id(new_user))


def find_user_id(user: User):
    user.id = 1 if len(USERS) == 0 else USERS[-1].id + 1
    return user


@app.put("/user/update_user")
async def update_user(user: UserRequest):
    for i in range(len(USERS)):
        if USERS[i].id == user.id:
            USERS[i] = user


@app.delete("/users/delete_user/{id}")
async def delete_user(id: int):
    for i in range(len(USERS)):
        if USERS[i].id == id:
            USERS.pop(i)
            break
