from fastapi import APIRouter, HTTPException

from app.models.booking import Booking
from app.schemas.booking import BookingRequest
from app.database import db

router = APIRouter()


@router.get("")
@router.get("/")
async def get_all_bookings():
    return db.BOOKINGS


@router.get("/get_by_status")
async def get_by_status(status: str):
    return [b for b in db.BOOKINGS if b.status.casefold() == status.casefold()]


@router.get("/{id}")
async def get_booking(id: int):
    booking = db.find_booking_by_id(id)
    if booking:
        return booking
    raise HTTPException(status_code=404, detail="Booking not found")


@router.post("/create_booking")
async def create_booking(request_booking: BookingRequest):
    member = db.find_member_by_id(request_booking.member_id)
    if not member or member.status.casefold() != "active":
        raise HTTPException(status_code=400, detail="Member is not active or does not exist")

    slot = db.find_slot_by_id(request_booking.slot_id)
    if not slot:
        raise HTTPException(status_code=404, detail="Class slot not found")

    if slot.is_cancelled:
        raise HTTPException(status_code=400, detail="Class slot has been cancelled")

    if slot.current_bookings < slot.max_capacity:
        status = "confirmed"
        waitlist_position = None
        slot.current_bookings += 1
    else:
        status = "waitlisted"
        existing_waitlists = sum(
            1 for b in db.BOOKINGS if b.slot_id == request_booking.slot_id and b.status == "waitlisted"
        )
        waitlist_position = existing_waitlists + 1

    new_booking = Booking(
        id=db.get_next_id(db.BOOKINGS),
        member_id=request_booking.member_id,
        slot_id=request_booking.slot_id,
        status=status,
        waitlist_position=waitlist_position,
    )
    db.BOOKINGS.append(new_booking)
    return new_booking


@router.put("/update_booking")
async def update_booking(request_booking: BookingRequest):
    for i, b in enumerate(db.BOOKINGS):
        if b.id == request_booking.id:
            updated = Booking(
                id=request_booking.id,
                member_id=request_booking.member_id,
                slot_id=request_booking.slot_id,
                status=request_booking.status,
                waitlist_position=request_booking.waitlist_position,
            )
            db.BOOKINGS[i] = updated
            return updated
    raise HTTPException(status_code=404, detail="Booking not found")


@router.delete("/delete_booking/{id}")
async def delete_booking(id: int):
    for i, b in enumerate(db.BOOKINGS):
        if b.id == id:
            db.BOOKINGS.pop(i)
            return {"message": f"Booking {id} deleted"}
    raise HTTPException(status_code=404, detail="Booking not found")
