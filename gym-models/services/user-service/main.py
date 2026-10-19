import sys
import os
from typing import Annotated
from fastapi import FastAPI, HTTPException, Depends
from starlette import status
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware

# Ensure local imports work when run as script or module
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from datetime import datetime, timedelta, timezone
import jwt
import models
from models import User
from schemas import User_Request, Login_Request
from database import engine, SessionLocal, get_db

SECRET_KEY = "gym_soa_jwt_secret_key_super_secure_32bytes_min"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

app = FastAPI(title="User Service - Gym SOA", version="1.0.0")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

models.Base.metadata.create_all(bind=engine)

db_dependency = Annotated[Session, Depends(get_db)]


@app.on_event("startup")
def startup_populate_data():
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            db.add_all([
                User(email="admin@gym.com", role="admin", password="password123", is_active=True),
                User(email="trainer.nam@gym.com", role="trainer", password="password123", is_active=True),
                User(email="member.an@gym.com", role="member", password="password123", is_active=True),
            ])
            db.commit()
    finally:
        db.close()


@app.get("/health")
async def health():
    return {"status": "UP", "service": "user-service"}


@app.get("/users")
async def get_all_users(db: db_dependency):
    return db.query(User).all()


@app.post("/users/login")
async def login(login_req: Login_Request, db: db_dependency):
    user = db.query(User).filter(User.email == login_req.email).first()
    if not user or user.password != login_req.password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")

    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "exp": expire,
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
        }
    }


@app.get("/users/{id}")

async def get_user(db: db_dependency, id: int):
    user = db.query(User).filter(User.id == id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.post("/users", status_code=status.HTTP_201_CREATED)
async def create_user(db: db_dependency, user_request: User_Request):
    user_model = User(**user_request.dict())
    db.add(user_model)
    db.commit()
    db.refresh(user_model)
    return user_model


@app.put("/users/{id}")
async def update_user(db: db_dependency, id: int, user_request: User_Request):
    user = db.query(User).filter(User.id == id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user.email = user_request.email
    user.role = user_request.role
    user.password = user_request.password
    user.is_active = user_request.is_active
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.delete("/users/{id}")
async def delete_user(db: db_dependency, id: int):
    user = db.query(User).filter(User.id == id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
