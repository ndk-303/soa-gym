from typing import List
from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.class_slot import ClassSlot
from app.schemas.class_slot import ClassSlotRequest, ClassSlotResponse
from app.database.session import get_session

router = APIRouter(tags=["Class Slots"])


@router.get("", response_model=List[ClassSlotResponse])
def get_all_slots(session: Session = Depends(get_session)):
    return session.scalars(select(ClassSlot)).all()


@router.get("/get_by_class", response_model=List[ClassSlotResponse])
def get_slots_by_class(class_id: int, session: Session = Depends(get_session)):
    return session.scalars(select(ClassSlot).where(ClassSlot.class_id == class_id)).all()


@router.get("/{slot_id}", response_model=ClassSlotResponse)
def get_slot_by_id(slot_id: int = Path(gt=0), session: Session = Depends(get_session)):
    slot = session.get(ClassSlot, slot_id)
    if not slot:
        raise HTTPException(status_code=404, detail=f"Class slot with id {slot_id} not found")
    return slot


@router.post("/create_slot", response_model=ClassSlotResponse)
def create_slot(req: ClassSlotRequest, session: Session = Depends(get_session)):
    new_slot = ClassSlot(**req.model_dump(exclude={"id"}))
    session.add(new_slot)
    session.commit()
    session.refresh(new_slot)
    return new_slot


@router.put("/update_slot", response_model=ClassSlotResponse)
def update_slot(req: ClassSlotRequest, session: Session = Depends(get_session)):
    slot = session.get(ClassSlot, req.id)
    if not slot:
        raise HTTPException(status_code=404, detail=f"Class slot with id {req.id} not found")
    slot.class_id = req.class_id
    slot.start_time = req.start_time
    slot.max_capacity = req.max_capacity
    slot.current_bookings = req.current_bookings
    slot.is_cancelled = req.is_cancelled
    session.add(slot)
    session.commit()
    session.refresh(slot)
    return slot


@router.delete("/delete_slot/{slot_id}")
def delete_slot(slot_id: int = Path(gt=0), session: Session = Depends(get_session)):
    slot = session.get(ClassSlot, slot_id)
    if not slot:
        raise HTTPException(status_code=404, detail=f"Class slot with id {slot_id} not found")
    session.delete(slot)
    session.commit()
    return {"detail": f"Class slot {slot_id} deleted successfully"}
