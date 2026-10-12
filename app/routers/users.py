from typing import List
from fastapi import APIRouter, Depends, HTTPException, Path
from sqlmodel import Session, select
from app.models.user import User
from app.schemas.user import UserRequest
from app.database.session import get_session

router = APIRouter(tags=["Users"])


@router.get("", response_model=List[User])
def get_all_users(session: Session = Depends(get_session)):
    return session.exec(select(User)).all()


@router.get("/get_role", response_model=List[User])
def get_users_by_role(role: str, session: Session = Depends(get_session)):
    return session.exec(select(User).where(User.role == role.casefold())).all()


@router.get("/{user_id}", response_model=User)
def get_user_by_id(user_id: int = Path(gt=0), session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail=f"User with id {user_id} not found")
    return user


@router.post("/create_user", response_model=User)
def create_user(req: UserRequest, session: Session = Depends(get_session)):
    new_user = User.model_validate(req)
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    return new_user


@router.put("/update_user", response_model=User)
def update_user(req: UserRequest, session: Session = Depends(get_session)):
    user = session.get(User, req.id)
    if not user:
        raise HTTPException(status_code=404, detail=f"User with id {req.id} not found")
    user.email = req.email
    user.role = req.role
    user.password = req.password
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.delete("/delete_user/{user_id}")
def delete_user(user_id: int = Path(gt=0), session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail=f"User with id {user_id} not found")
    session.delete(user)
    session.commit()
    return {"detail": f"User {user_id} deleted successfully"}
