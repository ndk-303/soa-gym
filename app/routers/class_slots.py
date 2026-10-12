from fastapi import APIRouter, HTTPException

from app.models.class_slot import ClassSlot
from app.schemas.class_slot import ClassSlotRequest
from app.database import db

router = APIRouter()


@router.get("")
@router.get("/")
async def get_all_slots():
    return db.CLASS_SLOTS


@router.get("/get_by_class")
async def get_by_class(class_id: int):
    return [s for s in db.CLASS_SLOTS if s.class_id == class_id]


@router.get("/{id}")
async def get_slot(id: int):
    slot = db.find_slot_by_id(id)
    if slot:
        return slot
    raise HTTPException(status_code=404, detail="Class slot not found")


@router.post("/create_slot")
async def create_slot(request_slot: ClassSlotRequest):
    new_slot = ClassSlot(
        id=db.get_next_id(db.CLASS_SLOTS),
        class_id=request_slot.class_id,
        start_time=request_slot.start_time,
        max_capacity=request_slot.max_capacity,
        current_bookings=request_slot.current_bookings,
        is_cancelled=request_slot.is_cancelled,
    )
    db.CLASS_SLOTS.append(new_slot)
    return new_slot


@router.post("/{id}/increment_booking")
async def increment_booking(id: int):
    slot = db.find_slot_by_id(id)
    if not slot:
        raise HTTPException(status_code=404, detail="Class slot not found")
    slot.current_bookings += 1
    return slot


@router.put("/update_slot")
async def update_slot(request_slot: ClassSlotRequest):
    for i, s in enumerate(db.CLASS_SLOTS):
        if s.id == request_slot.id:
            updated = ClassSlot(
                id=request_slot.id,
                class_id=request_slot.class_id,
                start_time=request_slot.start_time,
                max_capacity=request_slot.max_capacity,
                current_bookings=request_slot.current_bookings,
                is_cancelled=request_slot.is_cancelled,
            )
            db.CLASS_SLOTS[i] = updated
            return updated
    raise HTTPException(status_code=404, detail="Class slot not found")


@router.delete("/delete_slot/{id}")
async def delete_slot(id: int):
    for i, s in enumerate(db.CLASS_SLOTS):
        if s.id == id:
            db.CLASS_SLOTS.pop(i)
            return {"message": f"Class slot {id} deleted"}
    raise HTTPException(status_code=404, detail="Class slot not found")
