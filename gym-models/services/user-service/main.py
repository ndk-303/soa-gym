import sys
import os
import threading
from typing import Annotated
from fastapi import FastAPI, HTTPException, Depends
from starlette import status
from sqlalchemy import text
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from fastapi.middleware.cors import CORSMiddleware

# Ensure local imports work when run as script or module
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from datetime import datetime, timedelta, timezone
import jwt
from pwdlib import PasswordHash
import models
from models import User
from schemas import User_Request, Login_Request, User_Role_Update
from database import engine, SessionLocal, get_db
from config import settings

SECRET_KEY = settings.JWT_SECRET_KEY
ALGORITHM = settings.JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_HOURS = settings.ACCESS_TOKEN_EXPIRE_HOURS

pwd_context = PasswordHash.recommended()

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return plain_password == hashed_password

def create_access_token(user: User) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "full_name": user.full_name or "",
        "role": user.role,
        "exp": expire,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

app = FastAPI(title="User Service - Gym SOA", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

models.Base.metadata.create_all(bind=engine)

# Auto-migrate missing full_name column on legacy SQLite databases
with engine.begin() as conn:
    cols = [row[1] for row in conn.execute(text("PRAGMA table_info(users)")).fetchall()]
    if "full_name" not in cols:
        conn.execute(text("ALTER TABLE users ADD COLUMN full_name VARCHAR DEFAULT ''"))

db_dependency = Annotated[Session, Depends(get_db)]

# Concurrency lock for user account mutations
user_lock = threading.RLock()


@app.on_event("startup")
def startup_populate_data():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        if len(users) == 0:
            db.add_all([
                User(email="admin@gym.com", full_name="Admin Quản Trị", role="admin", password=hash_password("password123"), is_active=True),
                User(email="trainer.nam@gym.com", full_name="HLV Nguyễn Văn Nam", role="trainer", password=hash_password("password123"), is_active=True),
                User(email="member.an@gym.com", full_name="Nguyễn Văn An", role="member", password=hash_password("password123"), is_active=True),
            ])
            db.commit()
        else:
            default_names = {
                "admin@gym.com": "Admin Quản Trị",
                "trainer.nam@gym.com": "HLV Nguyễn Văn Nam",
                "member.an@gym.com": "Nguyễn Văn An",
            }
            updated = False
            for u in users:
                if not u.password.startswith("$argon2"):
                    u.password = hash_password(u.password)
                    updated = True
                if not u.full_name:
                    u.full_name = default_names.get(u.email, u.email.split("@")[0])
                    updated = True
            if updated:
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
    if not user or not verify_password(login_req.password, user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")

    token = create_access_token(user)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name or "",
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


def _commit_with_rollback(db: Session, conflict_detail: str = "Email already exists"):
    """Commit the current DB transaction, mapping integrity/SQL errors to HTTP errors."""
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=conflict_detail)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(exc)}",
        )


@app.post("/users", status_code=status.HTTP_201_CREATED)
def create_user(db: db_dependency, user_request: User_Request):
    if not user_request.password or len(user_request.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long.",
        )
    with user_lock:
        existing = db.query(User).filter(User.email == user_request.email).first()
        if existing is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

        user_data = user_request.dict()
        user_data["password"] = hash_password(user_data["password"])
        if not user_data.get("full_name"):
            user_data["full_name"] = user_data["email"].split("@")[0]
        user_model = User(**user_data)
        db.add(user_model)
        _commit_with_rollback(db, "Email already exists")
        db.refresh(user_model)
        return user_model


@app.put("/users/{id}")
def update_user(db: db_dependency, id: int, user_request: User_Request):
    with user_lock:
        user = db.query(User).filter(User.id == id).first()
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")
        if user_request.email and user_request.email != user.email:
            duplicate = (
                db.query(User)
                .filter(User.email == user_request.email, User.id != id)
                .first()
            )
            if duplicate is not None:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")
            user.email = user_request.email
        if user_request.full_name is not None:
            user.full_name = user_request.full_name
        if user_request.role:
            user.role = user_request.role
        if user_request.password and user_request.password.strip():
            if not user_request.password.startswith("$argon2"):
                user.password = hash_password(user_request.password)
            else:
                user.password = user_request.password
        if user_request.is_active is not None:
            user.is_active = user_request.is_active
        db.add(user)
        _commit_with_rollback(db, "Email already exists")
        db.refresh(user)
        return user


@app.patch("/users/{id}/role")
def update_user_role(db: db_dependency, id: int, role_update: User_Role_Update):
    valid_roles = ["admin", "trainer", "member", "user"]
    if role_update.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role '{role_update.role}'. Allowed roles: {valid_roles}",
        )

    with user_lock:
        user = db.query(User).filter(User.id == id).first()
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")

        user.role = role_update.role
        if role_update.full_name is not None and role_update.full_name.strip():
            user.full_name = role_update.full_name.strip()
        db.add(user)
        _commit_with_rollback(db)
        db.refresh(user)

    new_token = create_access_token(user)
    return {
        "message": "User role updated successfully",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name or "",
            "role": user.role,
            "is_active": user.is_active,
        },
        "access_token": new_token,
        "token_type": "bearer",
    }


@app.delete("/users/{id}")
def delete_user(db: db_dependency, id: int):
    with user_lock:
        user = db.query(User).filter(User.id == id).first()
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")
        db.delete(user)
        _commit_with_rollback(db)
        return {"message": "User deleted successfully"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.service_port, reload=settings.ENVIRONMENT == "development")
