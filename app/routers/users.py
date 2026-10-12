from fastapi import APIRouter, HTTPException

from app.models.user import User
from app.schemas.user import UserRequest
from app.database import db

router = APIRouter()


@router.get("")
@router.get("/")
async def get_all_users():
    return db.USERS


@router.get("/get_role")
async def get_by_role(role: str):
    return [u for u in db.USERS if u.role.casefold() == role.casefold()]


@router.get("/{id}")
async def get_user(id: int):
    user = db.find_user_by_id(id)
    if user:
        return user
    raise HTTPException(status_code=404, detail="User not found")


@router.post("/create_user")
async def create_user(request_user: UserRequest):
    new_user = User(
        id=db.get_next_id(db.USERS),
        email=request_user.email,
        role=request_user.role,
        password=request_user.password,
    )
    db.USERS.append(new_user)
    return new_user


@router.put("/update_user")
async def update_user(request_user: UserRequest):
    for i, u in enumerate(db.USERS):
        if u.id == request_user.id:
            updated = User(
                id=request_user.id,
                email=request_user.email,
                role=request_user.role,
                password=request_user.password,
            )
            db.USERS[i] = updated
            return updated
    raise HTTPException(status_code=404, detail="User not found")


@router.delete("/delete_user/{id}")
async def delete_user(id: int):
    for i, u in enumerate(db.USERS):
        if u.id == id:
            db.USERS.pop(i)
            return {"message": f"User {id} deleted"}
    raise HTTPException(status_code=404, detail="User not found")
