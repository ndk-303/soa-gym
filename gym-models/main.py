from typing import Annotated, Optional, List
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, Field
from starlette import status
from sqlalchemy.orm import Session

import models
from models import (
    User,
    MembershipPlan,
    Member,
    GymClass,
    ClassSlot,
    Booking,
    Invoice,
    Payment,
    AttendanceRecord,
)
from database import engine, SessionLocal

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Gym Management System - Midterm (SOA)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

models.Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]



class User_Request(BaseModel):
    email: str = Field(min_length=5, max_length=100)
    role: str = Field(min_length=4, max_length=10)
    password: str = Field(min_length=6, max_length=50)
    is_active: bool = True

    class Config:
        json_schema_extra = {
            'example': {
                'email': 'admin@gym.com',
                'role': 'admin',
                'password': 'password123',
                'is_active': True,
            }
        }


class MembershipPlan_Request(BaseModel):
    name: str = Field(min_length=3, max_length=100)
    duration_days: int = Field(gt=0, lt=366)
    price: float = Field(gt=0, lt=100000000)
    is_active: bool = True

    class Config:
        json_schema_extra = {
            'example': {
                'name': 'Goi 1 Thang Co Ban',
                'duration_days': 30,
                'price': 500000.0,
                'is_active': True,
            }
        }


class Member_Request(BaseModel):
    user_id: int = Field(gt=0)
    full_name: str = Field(min_length=3, max_length=100)
    email: str = Field(min_length=5, max_length=100)
    status: str = Field(default="active", min_length=4, max_length=20)
    membership_plan_id: Optional[int] = Field(default=None, gt=0)

    class Config:
        json_schema_extra = {
            'example': {
                'user_id': 3,
                'full_name': 'Nguyen Van An',
                'email': 'an.nguyen@gym.com',
                'status': 'active',
                'membership_plan_id': 1,
            }
        }


class GymClass_Request(BaseModel):
    name: str = Field(min_length=3, max_length=100)
    category: str = Field(min_length=3, max_length=50)
    trainer_id: int = Field(gt=0)
    is_active: bool = True

    class Config:
        json_schema_extra = {
            'example': {
                'name': 'Yoga Binh Minh',
                'category': 'Yoga',
                'trainer_id': 2,
                'is_active': True,
            }
        }


class ClassSlot_Request(BaseModel):
    class_id: int = Field(gt=0)
    start_time: str = Field(min_length=10, max_length=30)
    max_capacity: int = Field(gt=0, lt=101)
    current_bookings: int = Field(default=0, ge=0)
    is_cancelled: bool = False

    class Config:
        json_schema_extra = {
            'example': {
                'class_id': 1,
                'start_time': '2026-10-19 06:00:00',
                'max_capacity': 15,
                'current_bookings': 0,
                'is_cancelled': False,
            }
        }


class Booking_Request(BaseModel):
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


class Invoice_Request(BaseModel):
    member_id: int = Field(gt=0)
    amount: float = Field(gt=0, lt=100000000)
    amount_paid: float = Field(default=0.0, ge=0)
    status: str = Field(default="pending", min_length=4, max_length=20)

    class Config:
        json_schema_extra = {
            'example': {
                'member_id': 1,
                'amount': 1350000.0,
                'amount_paid': 0.0,
                'status': 'pending',
            }
        }


class Payment_Request(BaseModel):
    invoice_id: int = Field(gt=0)
    amount: float = Field(gt=0, lt=100000000)
    payment_method: str = Field(min_length=3, max_length=30)
    notes: Optional[str] = Field(default="", max_length=255)

    class Config:
        json_schema_extra = {
            'example': {
                'invoice_id': 1,
                'amount': 500000.0,
                'payment_method': 'bank_transfer',
                'notes': 'Chuyen khoan VietQR',
            }
        }


class Attendance_Request(BaseModel):
    member_id: int = Field(gt=0)
    status: str = Field(default="checked_in", min_length=5, max_length=20)
    check_in_time: str = Field(min_length=10, max_length=30)
    check_out_time: Optional[str] = None
    notes: Optional[str] = Field(default="", max_length=255)

    class Config:
        json_schema_extra = {
            'example': {
                'member_id': 1,
                'status': 'checked_in',
                'check_in_time': '2026-10-18 08:30:00',
                'check_out_time': None,
                'notes': 'Check-in buoi sang',
            }
        }


@app.on_event("startup")
def startup_populate_data():
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            db.add_all([
                User(email="admin@gym.com", role="admin", password="password123", is_active=True),
                User(email="trainer.nam@gym.com", role="trainer", password="password123", is_active=True),
                User(email="member.an@gym.com", role="member", password="password123", is_active=True),
            ])
            db.commit()

        if db.query(MembershipPlan).count() == 0:
            db.add_all([
                MembershipPlan(name="Goi 1 Thang Co Ban", duration_days=30, price=500000.0, is_active=True),
                MembershipPlan(name="Goi 3 Thang VIP", duration_days=90, price=1350000.0, is_active=True),
                MembershipPlan(name="Goi 1 Nam Platinum", duration_days=365, price=4800000.0, is_active=True),
            ])
            db.commit()

        if db.query(Member).count() == 0:
            db.add_all([
                Member(user_id=3, full_name="Nguyen Van An", email="member.an@gym.com", status="active", membership_plan_id=1),
            ])
            db.commit()

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

        if db.query(Booking).count() == 0:
            db.add_all([
                Booking(member_id=1, slot_id=1, status="confirmed", waitlist_position=None),
            ])
            db.commit()

        if db.query(Invoice).count() == 0:
            db.add_all([
                Invoice(member_id=1, amount=500000.0, amount_paid=500000.0, status="paid"),
                Invoice(member_id=1, amount=1350000.0, amount_paid=0.0, status="pending"),
            ])
            db.commit()

        if db.query(Payment).count() == 0:
            db.add_all([
                Payment(invoice_id=1, amount=500000.0, payment_method="bank_transfer", notes="Chuyen khoan VietQR"),
            ])
            db.commit()

        if db.query(AttendanceRecord).count() == 0:
            db.add_all([
                AttendanceRecord(member_id=1, status="checked_in", check_in_time="2026-10-18 08:30:00", notes="Tap buoi sang"),
            ])
            db.commit()
    finally:
        db.close()


@app.get("/")
async def home():
    return {"message": "He Thong Quan Ly Gym (FastAPI + SQLite Database)"}



@app.get("/users")
async def get_all_users(db: db_dependency):
    return db.query(User).all()

@app.get("/users/{id}")
async def get_user(db: db_dependency, id: int):
    user = db.query(User).filter(User.id == id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.post("/users", status_code=status.HTTP_201_CREATED)
async def create_user(db: db_dependency, user_request: User_Request):
    user_model = User(**user_request.dict())
    db.add(user_model)
    db.commit()
    db.refresh(user_model)
    return user_model

@app.put("/users/{id}")
async def update_user(db: db_dependency, id: int, user_request: User_Request):
    user = db.query(User).filter(User.id == id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user.email = user_request.email
    user.role = user_request.role
    user.password = user_request.password
    user.is_active = user_request.is_active
    db.add(user)
    db.commit()
    return user

@app.delete("/users/{id}")
async def delete_user(db: db_dependency, id: int):
    user = db.query(User).filter(User.id == id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}



@app.get("/membership-plans")
async def get_all_plans(db: db_dependency):
    return db.query(MembershipPlan).all()

@app.get("/membership-plans/{id}")
async def get_plan(db: db_dependency, id: int):
    plan = db.query(MembershipPlan).filter(MembershipPlan.id == id).first()
    if plan is None:
        raise HTTPException(status_code=404, detail="Membership Plan not found")
    return plan

@app.post("/membership-plans", status_code=status.HTTP_201_CREATED)
async def create_plan(db: db_dependency, plan_request: MembershipPlan_Request):
    plan_model = MembershipPlan(**plan_request.dict())
    db.add(plan_model)
    db.commit()
    db.refresh(plan_model)
    return plan_model

@app.put("/membership-plans/{id}")
async def update_plan(db: db_dependency, id: int, plan_request: MembershipPlan_Request):
    plan = db.query(MembershipPlan).filter(MembershipPlan.id == id).first()
    if plan is None:
        raise HTTPException(status_code=404, detail="Membership Plan not found")
    plan.name = plan_request.name
    plan.duration_days = plan_request.duration_days
    plan.price = plan_request.price
    plan.is_active = plan_request.is_active
    db.add(plan)
    db.commit()
    return plan

@app.delete("/membership-plans/{id}")
async def delete_plan(db: db_dependency, id: int):
    plan = db.query(MembershipPlan).filter(MembershipPlan.id == id).first()
    if plan is None:
        raise HTTPException(status_code=404, detail="Membership Plan not found")
    db.delete(plan)
    db.commit()
    return {"message": "Membership Plan deleted successfully"}



@app.get("/members")
async def get_all_members(db: db_dependency):
    return db.query(Member).all()

@app.get("/members/{id}")
async def get_member(db: db_dependency, id: int):
    member = db.query(Member).filter(Member.id == id).first()
    if member is None:
        raise HTTPException(status_code=404, detail="Member not found")
    return member

@app.post("/members", status_code=status.HTTP_201_CREATED)
async def create_member(db: db_dependency, member_request: Member_Request):
    member_model = Member(**member_request.dict())
    db.add(member_model)
    db.commit()
    db.refresh(member_model)
    return member_model

@app.put("/members/{id}")
async def update_member(db: db_dependency, id: int, member_request: Member_Request):
    member = db.query(Member).filter(Member.id == id).first()
    if member is None:
        raise HTTPException(status_code=404, detail="Member not found")
    member.user_id = member_request.user_id
    member.full_name = member_request.full_name
    member.email = member_request.email
    member.status = member_request.status
    member.membership_plan_id = member_request.membership_plan_id
    db.add(member)
    db.commit()
    return member

@app.delete("/members/{id}")
async def delete_member(db: db_dependency, id: int):
    member = db.query(Member).filter(Member.id == id).first()
    if member is None:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(member)
    db.commit()
    return {"message": "Member deleted successfully"}



@app.get("/gym-classes")
async def get_all_classes(db: db_dependency):
    return db.query(GymClass).all()

@app.get("/gym-classes/{id}")
async def get_class(db: db_dependency, id: int):
    gym_class = db.query(GymClass).filter(GymClass.id == id).first()
    if gym_class is None:
        raise HTTPException(status_code=404, detail="Gym Class not found")
    return gym_class

@app.post("/gym-classes", status_code=status.HTTP_201_CREATED)
async def create_class(db: db_dependency, class_request: GymClass_Request):
    class_model = GymClass(**class_request.dict())
    db.add(class_model)
    db.commit()
    db.refresh(class_model)
    return class_model

@app.put("/gym-classes/{id}")
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
    return gym_class

@app.delete("/gym-classes/{id}")
async def delete_class(db: db_dependency, id: int):
    gym_class = db.query(GymClass).filter(GymClass.id == id).first()
    if gym_class is None:
        raise HTTPException(status_code=404, detail="Gym Class not found")
    db.delete(gym_class)
    db.commit()
    return {"message": "Gym Class deleted successfully"}



@app.get("/class-slots")
async def get_all_slots(db: db_dependency):
    return db.query(ClassSlot).all()

@app.get("/class-slots/{id}")
async def get_slot(db: db_dependency, id: int):
    slot = db.query(ClassSlot).filter(ClassSlot.id == id).first()
    if slot is None:
        raise HTTPException(status_code=404, detail="Class Slot not found")
    return slot

@app.post("/class-slots", status_code=status.HTTP_201_CREATED)
async def create_slot(db: db_dependency, slot_request: ClassSlot_Request):
    slot_model = ClassSlot(**slot_request.dict())
    db.add(slot_model)
    db.commit()
    db.refresh(slot_model)
    return slot_model

@app.put("/class-slots/{id}")
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
    return slot

@app.delete("/class-slots/{id}")
async def delete_slot(db: db_dependency, id: int):
    slot = db.query(ClassSlot).filter(ClassSlot.id == id).first()
    if slot is None:
        raise HTTPException(status_code=404, detail="Class Slot not found")
    db.delete(slot)
    db.commit()
    return {"message": "Class Slot deleted successfully"}



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
async def create_booking(db: db_dependency, booking_request: Booking_Request):
    booking_model = Booking(**booking_request.dict())
    db.add(booking_model)
    db.commit()
    db.refresh(booking_model)
    return booking_model

@app.put("/bookings/{id}")
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
    return booking

@app.delete("/bookings/{id}")
async def delete_booking(db: db_dependency, id: int):
    booking = db.query(Booking).filter(Booking.id == id).first()
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    db.delete(booking)
    db.commit()
    return {"message": "Booking deleted successfully"}



@app.get("/invoices")
async def get_all_invoices(db: db_dependency):
    return db.query(Invoice).all()

@app.get("/invoices/{id}")
async def get_invoice(db: db_dependency, id: int):
    invoice = db.query(Invoice).filter(Invoice.id == id).first()
    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

@app.post("/invoices", status_code=status.HTTP_201_CREATED)
async def create_invoice(db: db_dependency, invoice_request: Invoice_Request):
    invoice_model = Invoice(**invoice_request.dict())
    db.add(invoice_model)
    db.commit()
    db.refresh(invoice_model)
    return invoice_model

@app.put("/invoices/{id}")
async def update_invoice(db: db_dependency, id: int, invoice_request: Invoice_Request):
    invoice = db.query(Invoice).filter(Invoice.id == id).first()
    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    invoice.member_id = invoice_request.member_id
    invoice.amount = invoice_request.amount
    invoice.amount_paid = invoice_request.amount_paid
    invoice.status = invoice_request.status
    db.add(invoice)
    db.commit()
    return invoice

@app.delete("/invoices/{id}")
async def delete_invoice(db: db_dependency, id: int):
    invoice = db.query(Invoice).filter(Invoice.id == id).first()
    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    db.delete(invoice)
    db.commit()
    return {"message": "Invoice deleted successfully"}



@app.get("/payments")
async def get_all_payments(db: db_dependency):
    return db.query(Payment).all()

@app.get("/payments/{id}")
async def get_payment(db: db_dependency, id: int):
    payment = db.query(Payment).filter(Payment.id == id).first()
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment

@app.post("/payments", status_code=status.HTTP_201_CREATED)
async def create_payment(db: db_dependency, payment_request: Payment_Request):
    payment_model = Payment(**payment_request.dict())
    db.add(payment_model)
    db.commit()
    db.refresh(payment_model)
    return payment_model

@app.put("/payments/{id}")
async def update_payment(db: db_dependency, id: int, payment_request: Payment_Request):
    payment = db.query(Payment).filter(Payment.id == id).first()
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    payment.invoice_id = payment_request.invoice_id
    payment.amount = payment_request.amount
    payment.payment_method = payment_request.payment_method
    payment.notes = payment_request.notes
    db.add(payment)
    db.commit()
    return payment

@app.delete("/payments/{id}")
async def delete_payment(db: db_dependency, id: int):
    payment = db.query(Payment).filter(Payment.id == id).first()
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    db.delete(payment)
    db.commit()
    return {"message": "Payment deleted successfully"}



@app.get("/attendance")
async def get_all_attendance(db: db_dependency):
    return db.query(AttendanceRecord).all()

@app.get("/attendance/{id}")
async def get_attendance(db: db_dependency, id: int):
    record = db.query(AttendanceRecord).filter(AttendanceRecord.id == id).first()
    if record is None:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    return record

@app.post("/attendance", status_code=status.HTTP_201_CREATED)
async def create_attendance(db: db_dependency, attendance_request: Attendance_Request):
    record_model = AttendanceRecord(**attendance_request.dict())
    db.add(record_model)
    db.commit()
    db.refresh(record_model)
    return record_model

@app.put("/attendance/{id}")
async def update_attendance(db: db_dependency, id: int, attendance_request: Attendance_Request):
    record = db.query(AttendanceRecord).filter(AttendanceRecord.id == id).first()
    if record is None:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    record.member_id = attendance_request.member_id
    record.status = attendance_request.status
    record.check_in_time = attendance_request.check_in_time
    record.check_out_time = attendance_request.check_out_time
    record.notes = attendance_request.notes
    db.add(record)
    db.commit()
    return record

@app.delete("/attendance/{id}")
async def delete_attendance(db: db_dependency, id: int):
    record = db.query(AttendanceRecord).filter(AttendanceRecord.id == id).first()
    if record is None:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    db.delete(record)
    db.commit()
    return {"message": "Attendance record deleted successfully"}
