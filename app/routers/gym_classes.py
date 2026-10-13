from typing import List
from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.gym_class import GymClass
from app.schemas.gym_class import GymClassRequest, GymClassResponse
from app.database.session import get_session

router = APIRouter(tags=["Gym Classes"])


@router.get("", response_model=List[GymClassResponse])
def get_all_classes(session: Session = Depends(get_session)):
    return session.scalars(select(GymClass)).all()


@router.get("/get_by_category", response_model=List[GymClassResponse])
def get_classes_by_category(category: str, session: Session = Depends(get_session)):
    return session.scalars(select(GymClass).where(GymClass.category == category.casefold())).all()


@router.get("/{class_id}", response_model=GymClassResponse)
def get_class_by_id(class_id: int = Path(gt=0), session: Session = Depends(get_session)):
    gym_class = session.get(GymClass, class_id)
    if not gym_class:
        raise HTTPException(status_code=404, detail=f"Gym class with id {class_id} not found")
    return gym_class


@router.post("/create_class", response_model=GymClassResponse)
def create_class(req: GymClassRequest, session: Session = Depends(get_session)):
    new_class = GymClass(**req.model_dump(exclude={"id"}))
    session.add(new_class)
    session.commit()
    session.refresh(new_class)
    return new_class


@router.put("/update_class", response_model=GymClassResponse)
def update_class(req: GymClassRequest, session: Session = Depends(get_session)):
    gym_class = session.get(GymClass, req.id)
    if not gym_class:
        raise HTTPException(status_code=404, detail=f"Gym class with id {req.id} not found")
    gym_class.name = req.name
    gym_class.category = req.category
    gym_class.trainer_id = req.trainer_id
    gym_class.is_active = req.is_active
    session.add(gym_class)
    session.commit()
    session.refresh(gym_class)
    return gym_class


@router.delete("/delete_class/{class_id}")
def delete_class(class_id: int = Path(gt=0), session: Session = Depends(get_session)):
    gym_class = session.get(GymClass, class_id)
    if not gym_class:
        raise HTTPException(status_code=404, detail=f"Gym class with id {class_id} not found")
    session.delete(gym_class)
    session.commit()
    return {"detail": f"Gym class {class_id} deleted successfully"}
