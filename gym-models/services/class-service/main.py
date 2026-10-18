import sys
import os
from typing import Annotated
from fastapi import FastAPI, HTTPException, Depends
from starlette import status
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

import models
from models import GymClass, ClassSlot
from schemas import GymClass_Request, ClassSlot_Request
from database import engine, SessionLocal, get_db

app = FastAPI(title="Class Service - Gym SOA", version="1.0.0")

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
        if db.query(GymClass).count() == 0:
            db.add_all([
                GymClass(name="Yoga Binh Minh", category="Yoga", trainer_id=2, is_active=True),
                GymClass(name="Boxing Doi Khang", category="Boxing", trainer_id=2, is_active=True),
            ])
            db.commit()

        if db.query(ClassSlot).count() == 0:
            db.add_all([
                ClassSlot(class_id=1, start_time="2026-10-19 06:00:00", max_capacity=15, current_bookings=1, is_cancelled=False),
            ])
            db.commit()
    finally:
        db.close()


@app.get("/health")
async def health():
    return {"status": "UP", "service": "class-service"}


# ==================== Gym Classes Endpoints ====================

@app.get("/gym-classes")
@app.get("/gym-classes/")
async def get_all_classes(db: db_dependency):
    return db.query(GymClass).all()


@app.get("/gym-classes/{id}")
@app.get("/gym-classes/{id}/")
async def get_class(db: db_dependency, id: int):
    gym_class = db.query(GymClass).filter(GymClass.id == id).first()
    if gym_class is None:
        raise HTTPException(status_code=404, detail="Gym Class not found")
    return gym_class


@app.post("/gym-classes", status_code=status.HTTP_201_CREATED)
@app.post("/gym-classes/", status_code=status.HTTP_201_CREATED)
async def create_class(db: db_dependency, class_request: GymClass_Request):
    class_model = GymClass(**class_request.dict())
    db.add(class_model)
    db.commit()
    db.refresh(class_model)
    return class_model


@app.put("/gym-classes/{id}")
@app.put("/gym-classes/{id}/")
async def update_class(db: db_dependency, id: int, class_request: GymClass_Request):
    gym_class = db.query(GymClass).filter(GymClass.id == id).first()
    if gym_class is None:
        raise HTTPException(status_code=404, detail="Gym Class not found")
    gym_class.name = class_request.name
    gym_class.category = class_request.category
    gym_class.trainer_id = class_request.trainer_id
    gym_class.is_active = class_request.is_active
    db.add(gym_class)
    db.commit()
    db.refresh(gym_class)
    return gym_class


@app.delete("/gym-classes/{id}")
@app.delete("/gym-classes/{id}/")
async def delete_class(db: db_dependency, id: int):
    gym_class = db.query(GymClass).filter(GymClass.id == id).first()
    if gym_class is None:
        raise HTTPException(status_code=404, detail="Gym Class not found")
    db.delete(gym_class)
    db.commit()
    return {"message": "Gym Class deleted successfully"}


# ==================== Class Slots Endpoints ====================

@app.get("/class-slots")
@app.get("/class-slots/")
async def get_all_slots(db: db_dependency):
    return db.query(ClassSlot).all()


@app.get("/class-slots/{id}")
@app.get("/class-slots/{id}/")
async def get_slot(db: db_dependency, id: int):
    slot = db.query(ClassSlot).filter(ClassSlot.id == id).first()
    if slot is None:
        raise HTTPException(status_code=404, detail="Class Slot not found")
    return slot


@app.post("/class-slots", status_code=status.HTTP_201_CREATED)
@app.post("/class-slots/", status_code=status.HTTP_201_CREATED)
async def create_slot(db: db_dependency, slot_request: ClassSlot_Request):
    slot_model = ClassSlot(**slot_request.dict())
    db.add(slot_model)
    db.commit()
    db.refresh(slot_model)
    return slot_model


@app.put("/class-slots/{id}")
@app.put("/class-slots/{id}/")
async def update_slot(db: db_dependency, id: int, slot_request: ClassSlot_Request):
    slot = db.query(ClassSlot).filter(ClassSlot.id == id).first()
    if slot is None:
        raise HTTPException(status_code=404, detail="Class Slot not found")
    slot.class_id = slot_request.class_id
    slot.start_time = slot_request.start_time
    slot.max_capacity = slot_request.max_capacity
    slot.current_bookings = slot_request.current_bookings
    slot.is_cancelled = slot_request.is_cancelled
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return slot


@app.delete("/class-slots/{id}")
@app.delete("/class-slots/{id}/")
async def delete_slot(db: db_dependency, id: int):
    slot = db.query(ClassSlot).filter(ClassSlot.id == id).first()
    if slot is None:
        raise HTTPException(status_code=404, detail="Class Slot not found")
    db.delete(slot)
    db.commit()
    return {"message": "Class Slot deleted successfully"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8003, reload=True)
