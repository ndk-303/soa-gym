from fastapi import APIRouter, HTTPException

from app.models.gym_class import GymClass
from app.schemas.gym_class import GymClassRequest
from app.database import db

router = APIRouter()


@router.get("")
@router.get("/")
async def get_all_classes():
    return db.GYM_CLASSES


@router.get("/get_by_category")
async def get_by_category(category: str):
    return [c for c in db.GYM_CLASSES if c.category.casefold() == category.casefold()]


@router.get("/{id}")
async def get_class(id: int):
    gym_class = db.find_class_by_id(id)
    if gym_class:
        return gym_class
    raise HTTPException(status_code=404, detail="Gym class not found")


@router.post("/create_class")
async def create_class(request_class: GymClassRequest):
    new_class = GymClass(
        id=db.get_next_id(db.GYM_CLASSES),
        name=request_class.name,
        category=request_class.category,
        trainer_id=request_class.trainer_id,
        is_active=request_class.is_active,
    )
    db.GYM_CLASSES.append(new_class)
    return new_class


@router.put("/update_class")
async def update_class(request_class: GymClassRequest):
    for i, c in enumerate(db.GYM_CLASSES):
        if c.id == request_class.id:
            updated = GymClass(
                id=request_class.id,
                name=request_class.name,
                category=request_class.category,
                trainer_id=request_class.trainer_id,
                is_active=request_class.is_active,
            )
            db.GYM_CLASSES[i] = updated
            return updated
    raise HTTPException(status_code=404, detail="Gym class not found")


@router.delete("/delete_class/{id}")
async def delete_class(id: int):
    for i, c in enumerate(db.GYM_CLASSES):
        if c.id == id:
            db.GYM_CLASSES.pop(i)
            return {"message": f"Gym class {id} deleted"}
    raise HTTPException(status_code=404, detail="Gym class not found")
