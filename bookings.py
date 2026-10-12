from typing import Optional

from fastapi import FastAPI, Body
from pydantic import BaseModel, Field

app = FastAPI()


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


@app.post("/booking/create_booking")
async def create_booking(request_booking: BookingRequest):
    new_booking = Booking(**request_booking.dict())
    BOOKINGS.append(find_booking_id(new_booking))


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
