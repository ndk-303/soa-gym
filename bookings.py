from typing import Optional, Dict, Any

import httpx
from fastapi import FastAPI, Body, HTTPException
from pydantic import BaseModel, Field

app = FastAPI()

MEMBER_SERVICE_URL = "http://127.0.0.1:8003"
SLOT_SERVICE_URL = "http://127.0.0.1:8005"


async def fetch_member(member_id: int) -> Dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            res = await client.get(f"{MEMBER_SERVICE_URL}/members/{member_id}")
            if res.status_code == 404:
                raise HTTPException(status_code=404, detail=f"Member {member_id} not found")
            res.raise_for_status()
            return res.json()
    except HTTPException:
        raise
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="Member service is unavailable")


async def fetch_slot(slot_id: int) -> Dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            res = await client.get(f"{SLOT_SERVICE_URL}/class_slots/{slot_id}")
            if res.status_code == 404:
                raise HTTPException(status_code=404, detail=f"Class slot {slot_id} not found")
            res.raise_for_status()
            return res.json()
    except HTTPException:
        raise
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="Class slot service is unavailable")


async def increment_slot_booking(slot_id: int) -> Dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            res = await client.post(f"{SLOT_SERVICE_URL}/class_slots/{slot_id}/increment_booking")
            res.raise_for_status()
            return res.json()
    except HTTPException:
        raise
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="Class slot service is unavailable")


class Booking:
    id: int
    member_id: int
    slot_id: int
    status: str
    waitlist_position: Optional[int]

    def __init__(self, id, member_id, slot_id, status="confirmed", waitlist_position=None):
        self.id = id
        self.member_id = member_id
        self.slot_id = slot_id
        self.status = status
        self.waitlist_position = waitlist_position


class BookingRequest(BaseModel):
    id: Optional[int] = Field(default=None, title="id is not needed")
    member_id: int = Field(gt=0)
    slot_id: int = Field(gt=0)
    status: str = Field(default="confirmed", min_length=4, max_length=20)
    waitlist_position: Optional[int] = Field(default=None, ge=1)

    class Config:
        json_schema_extra = {
            'example': {
                'member_id': 1,
                'slot_id': 1,
                'status': 'confirmed',
                'waitlist_position': None,
            }
        }


BOOKINGS = [
    Booking(1, 1, 1, "confirmed", None),
    Booking(2, 2, 1, "confirmed", None),
    Booking(3, 3, 3, "waitlisted", 1),
    Booking(4, 1, 2, "cancelled", None),
]


@app.get("/")
async def home():
    return {"message": "Booking Service"}


@app.get("/bookings")
async def get_all_bookings():
    return BOOKINGS


@app.get("/bookings/get_by_status")
async def get_by_status(status: str):
    bookings_result = []
    for booking in BOOKINGS:
        if booking.status.casefold() == status.casefold():
            bookings_result.append(booking)
    return bookings_result


@app.get("/bookings/{id}")
async def get_booking(id: int):
    for booking in BOOKINGS:
        if booking.id == id:
            return booking
    raise HTTPException(status_code=404, detail="Booking not found")


@app.post("/booking/create_booking")
async def create_booking(request_booking: BookingRequest):
    member = await fetch_member(request_booking.member_id)
    if member.get("status", "").casefold() != "active":
        raise HTTPException(status_code=400, detail="Member is not active")

    slot = await fetch_slot(request_booking.slot_id)
    if slot.get("is_cancelled"):
        raise HTTPException(status_code=400, detail="Class slot has been cancelled")

    max_capacity = slot.get("max_capacity", 20)
    current_bookings = slot.get("current_bookings", 0)

    if current_bookings < max_capacity:
        status = "confirmed"
        waitlist_position = None
        await increment_slot_booking(request_booking.slot_id)
    else:
        status = "waitlisted"
        existing_waitlists = sum(1 for b in BOOKINGS if b.slot_id == request_booking.slot_id and b.status == "waitlisted")
        waitlist_position = existing_waitlists + 1

    booking_data = request_booking.dict()
    booking_data["status"] = status
    booking_data["waitlist_position"] = waitlist_position

    new_booking = Booking(**booking_data)
    new_booking = find_booking_id(new_booking)
    BOOKINGS.append(new_booking)
    return new_booking


def find_booking_id(booking: Booking):
    booking.id = 1 if len(BOOKINGS) == 0 else BOOKINGS[-1].id + 1
    return booking


@app.put("/booking/update_booking")
async def update_booking(booking: BookingRequest):
    for i in range(len(BOOKINGS)):
        if BOOKINGS[i].id == booking.id:
            BOOKINGS[i] = booking


@app.delete("/bookings/delete_booking/{id}")
async def delete_booking(id: int):
    for i in range(len(BOOKINGS)):
        if BOOKINGS[i].id == id:
            BOOKINGS.pop(i)
            break
