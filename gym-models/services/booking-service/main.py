import sys
import os
import threading
from typing import Annotated
import httpx
from fastapi import FastAPI, HTTPException, Depends
from starlette import status
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from fastapi.middleware.cors import CORSMiddleware

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

import models
from models import Booking
from schemas import Booking_Request
from database import engine, SessionLocal, get_db
from config import settings

app = FastAPI(title="Booking Service - Gym SOA", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

models.Base.metadata.create_all(bind=engine)

db_dependency = Annotated[Session, Depends(get_db)]

# Concurrency lock to prevent race conditions during booking and waitlist promotion
booking_lock = threading.RLock()


def sync_increment_slot(slot_id: int) -> str:
    """Ask class-service to atomically increment current_bookings. Returns 'confirmed' or 'waitlisted'."""
    url = f"{settings.CLASS_SERVICE_URL}/class-slots/{slot_id}/increment-bookings"
    try:
        resp = httpx.patch(url, timeout=3.0)
    except (httpx.ConnectError, httpx.ConnectTimeout):
        # Fallback when class-service is offline (e.g. isolated unit test)
        return "confirmed"

    if resp.status_code == 200:
        return "confirmed"
    if resp.status_code == 409:
        return "waitlisted"
    if resp.status_code == 404:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ca tập không tồn tại")
    if resp.status_code == 400:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ca tập đã bị hủy")
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=f"Class service error ({resp.status_code})",
    )


def sync_decrement_slot(slot_id: int) -> None:
    """Compensating / cancellation call to decrement current_bookings in class-service."""
    url = f"{settings.CLASS_SERVICE_URL}/class-slots/{slot_id}/decrement-bookings"
    try:
        httpx.patch(url, timeout=3.0)
    except httpx.HTTPError:
        pass


def _next_waitlist_position(db: Session, slot_id: int) -> int:
    max_pos = (
        db.query(func.max(Booking.waitlist_position))
        .filter(
            Booking.slot_id == slot_id,
            Booking.status.in_(["waitlist", "waitlisted"]),
        )
        .scalar()
    )
    return (max_pos or 0) + 1


def _commit_booking_tx(db: Session, compensate_slot_id: int = None) -> None:
    """Commit booking transaction, running compensating decrement on class-service if DB commit fails."""
    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        if compensate_slot_id is not None:
            sync_decrement_slot(compensate_slot_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(exc)}",
        )


def _promote_first_waitlisted(db: Session, slot_id: int) -> None:
    """Promote the oldest waitlisted booking for slot_id to confirmed (FIFO)."""
    next_booking = (
        db.query(Booking)
        .filter(
            Booking.slot_id == slot_id,
            Booking.status.in_(["waitlist", "waitlisted"]),
        )
        .order_by(Booking.waitlist_position.asc(), Booking.id.asc())
        .first()
    )
    if next_booking is None:
        return

    try:
        result = sync_increment_slot(slot_id)
    except HTTPException:
        return

    if result == "confirmed":
        next_booking.status = "confirmed"
        next_booking.waitlist_position = None
        db.add(next_booking)
        _commit_booking_tx(db, compensate_slot_id=slot_id)


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
async def get_all_bookings(db: db_dependency):
    return db.query(Booking).all()


@app.get("/bookings/{id}")
async def get_booking(db: db_dependency, id: int):
    booking = db.query(Booking).filter(Booking.id == id).first()
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


@app.post("/bookings", status_code=status.HTTP_201_CREATED)
def create_booking(db: db_dependency, booking_request: Booking_Request):
    with booking_lock:
        if booking_request.status != "cancelled":
            duplicate = (
                db.query(Booking)
                .filter(
                    Booking.member_id == booking_request.member_id,
                    Booking.slot_id == booking_request.slot_id,
                    Booking.status != "cancelled",
                )
                .first()
            )
            if duplicate is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Hội viên đã đặt chỗ trong ca tập này",
                )

        target_status = booking_request.status
        waitlist_pos = booking_request.waitlist_position
        incremented = False

        if target_status == "confirmed":
            sync_result = sync_increment_slot(booking_request.slot_id)
            if sync_result == "waitlisted":
                target_status = "waitlisted"
                waitlist_pos = _next_waitlist_position(db, booking_request.slot_id)
            else:
                incremented = True
                waitlist_pos = None
        elif target_status in ("waitlist", "waitlisted") and waitlist_pos is None:
            waitlist_pos = _next_waitlist_position(db, booking_request.slot_id)

        booking_model = Booking(
            member_id=booking_request.member_id,
            slot_id=booking_request.slot_id,
            status=target_status,
            waitlist_position=waitlist_pos,
        )
        db.add(booking_model)
        _commit_booking_tx(db, compensate_slot_id=booking_request.slot_id if incremented else None)
        db.refresh(booking_model)
        return booking_model


@app.put("/bookings/{id}")
def update_booking(db: db_dependency, id: int, booking_request: Booking_Request):
    with booking_lock:
        booking = db.query(Booking).filter(Booking.id == id).first()
        if booking is None:
            raise HTTPException(status_code=404, detail="Booking not found")

        if booking_request.status != "cancelled":
            duplicate = (
                db.query(Booking)
                .filter(
                    Booking.id != id,
                    Booking.member_id == booking_request.member_id,
                    Booking.slot_id == booking_request.slot_id,
                    Booking.status != "cancelled",
                )
                .first()
            )
            if duplicate is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Hội viên đã đặt chỗ trong ca tập này",
                )

        old_status = booking.status
        old_slot_id = booking.slot_id
        target_status = booking_request.status
        waitlist_pos = booking_request.waitlist_position
        incremented_slot_id = None

        need_increment = (
            target_status == "confirmed"
            and (old_status != "confirmed" or old_slot_id != booking_request.slot_id)
        )
        if need_increment:
            sync_result = sync_increment_slot(booking_request.slot_id)
            if sync_result == "waitlisted":
                target_status = "waitlisted"
                waitlist_pos = _next_waitlist_position(db, booking_request.slot_id)
            else:
                incremented_slot_id = booking_request.slot_id
                waitlist_pos = None
        elif target_status in ("waitlist", "waitlisted") and waitlist_pos is None:
            waitlist_pos = _next_waitlist_position(db, booking_request.slot_id)

        booking.member_id = booking_request.member_id
        booking.slot_id = booking_request.slot_id
        booking.status = target_status
        booking.waitlist_position = waitlist_pos
        db.add(booking)
        _commit_booking_tx(db, compensate_slot_id=incremented_slot_id)
        db.refresh(booking)

        released_old_slot = (
            old_status == "confirmed"
            and (target_status != "confirmed" or old_slot_id != booking_request.slot_id)
        )
        if released_old_slot:
            sync_decrement_slot(old_slot_id)
            _promote_first_waitlisted(db, old_slot_id)
            db.refresh(booking)

        return booking


@app.delete("/bookings/{id}")
def delete_booking(db: db_dependency, id: int):
    with booking_lock:
        booking = db.query(Booking).filter(Booking.id == id).first()
        if booking is None:
            raise HTTPException(status_code=404, detail="Booking not found")
        slot_id = booking.slot_id
        was_confirmed = booking.status == "confirmed"

        db.delete(booking)
        _commit_booking_tx(db)

        if was_confirmed:
            sync_decrement_slot(slot_id)
            _promote_first_waitlisted(db, slot_id)

        return {"message": "Booking deleted successfully"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.service_port, reload=settings.ENVIRONMENT == "development")
