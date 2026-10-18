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
from models import Booking
from schemas import Booking_Request
from database import engine, SessionLocal, get_db

app = FastAPI(title="Booking Service - Gym SOA", version="1.0.0")

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
        if db.query(Booking).count() == 0:
            db.add_all([
                Booking(member_id=1, slot_id=1, status="confirmed", waitlist_position=None),
            ])
            db.commit()
    finally:
        db.close()


@app.get("/health")
async def health():
    return {"status": "UP", "service": "booking-service"}


@app.get("/bookings")
@app.get("/bookings/")
async def get_all_bookings(db: db_dependency):
    return db.query(Booking).all()


@app.get("/bookings/{id}")
@app.get("/bookings/{id}/")
async def get_booking(db: db_dependency, id: int):
    booking = db.query(Booking).filter(Booking.id == id).first()
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


@app.post("/bookings", status_code=status.HTTP_201_CREATED)
@app.post("/bookings/", status_code=status.HTTP_201_CREATED)
async def create_booking(db: db_dependency, booking_request: Booking_Request):
    booking_model = Booking(**booking_request.dict())
    db.add(booking_model)
    db.commit()
    db.refresh(booking_model)
    return booking_model


@app.put("/bookings/{id}")
@app.put("/bookings/{id}/")
async def update_booking(db: db_dependency, id: int, booking_request: Booking_Request):
    booking = db.query(Booking).filter(Booking.id == id).first()
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    booking.member_id = booking_request.member_id
    booking.slot_id = booking_request.slot_id
    booking.status = booking_request.status
    booking.waitlist_position = booking_request.waitlist_position
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


@app.delete("/bookings/{id}")
@app.delete("/bookings/{id}/")
async def delete_booking(db: db_dependency, id: int):
    booking = db.query(Booking).filter(Booking.id == id).first()
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    db.delete(booking)
    db.commit()
    return {"message": "Booking deleted successfully"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8004, reload=True)
