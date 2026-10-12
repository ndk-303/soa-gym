from typing import List
from fastapi import APIRouter, Depends, HTTPException, Path
from sqlmodel import Session, select
from app.models.booking import Booking
from app.models.member import Member
from app.models.class_slot import ClassSlot
from app.schemas.booking import BookingRequest
from app.database.session import get_session

router = APIRouter(tags=["Bookings"])


@router.get("", response_model=List[Booking])
def get_all_bookings(session: Session = Depends(get_session)):
    return session.exec(select(Booking)).all()


@router.get("/get_by_status", response_model=List[Booking])
def get_bookings_by_status(status: str, session: Session = Depends(get_session)):
    return session.exec(select(Booking).where(Booking.status == status.casefold())).all()


@router.get("/{booking_id}", response_model=Booking)
def get_booking_by_id(booking_id: int = Path(gt=0), session: Session = Depends(get_session)):
    booking = session.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail=f"Booking with id {booking_id} not found")
    return booking


@router.post("/create_booking", response_model=Booking)
def create_booking(req: BookingRequest, session: Session = Depends(get_session)):
    member = session.get(Member, req.member_id)
    if not member or member.status.casefold() != "active":
        raise HTTPException(status_code=400, detail="Member is not active or does not exist")

    slot = session.get(ClassSlot, req.slot_id)
    if not slot:
        raise HTTPException(status_code=404, detail=f"Class slot with id {req.slot_id} not found")

    if slot.is_cancelled:
        raise HTTPException(status_code=400, detail=f"Class slot {req.slot_id} is cancelled")

    if slot.current_bookings < slot.max_capacity:
        booking_status = "confirmed"
        waitlist_pos = None
        slot.current_bookings += 1
        session.add(slot)
    else:
        booking_status = "waitlisted"
        existing_waitlist = session.exec(
            select(Booking).where(Booking.slot_id == slot.id, Booking.status == "waitlisted")
        ).all()
        waitlist_pos = len(existing_waitlist) + 1

    new_booking = Booking(
        member_id=req.member_id,
        slot_id=req.slot_id,
        status=booking_status,
        waitlist_position=waitlist_pos,
    )
    session.add(new_booking)
    session.commit()
    session.refresh(new_booking)
    return new_booking


@router.put("/update_booking", response_model=Booking)
def update_booking(req: BookingRequest, session: Session = Depends(get_session)):
    booking = session.get(Booking, req.id)
    if not booking:
        raise HTTPException(status_code=404, detail=f"Booking with id {req.id} not found")

    member = session.get(Member, req.member_id)
    if not member:
        raise HTTPException(status_code=400, detail=f"Member with id {req.member_id} does not exist")

    slot = session.get(ClassSlot, req.slot_id)
    if not slot:
        raise HTTPException(status_code=404, detail=f"Class slot with id {req.slot_id} not found")

    booking.member_id = req.member_id
    booking.slot_id = req.slot_id
    booking.status = req.status
    booking.waitlist_position = req.waitlist_position
    session.add(booking)
    session.commit()
    session.refresh(booking)
    return booking


@router.delete("/delete_booking/{booking_id}")
def delete_booking(booking_id: int = Path(gt=0), session: Session = Depends(get_session)):
    booking = session.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail=f"Booking with id {booking_id} not found")
    session.delete(booking)
    session.commit()
    return {"detail": f"Booking {booking_id} deleted successfully"}
