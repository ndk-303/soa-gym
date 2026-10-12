from typing import List, Optional, Any

from app.models.user import User
from app.models.membership_plan import MembershipPlan
from app.models.member import Member
from app.models.gym_class import GymClass
from app.models.class_slot import ClassSlot
from app.models.booking import Booking
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.attendance import AttendanceRecord

USERS: List[User] = []
MEMBERSHIP_PLANS: List[MembershipPlan] = []
MEMBERS: List[Member] = []
GYM_CLASSES: List[GymClass] = []
CLASS_SLOTS: List[ClassSlot] = []
BOOKINGS: List[Booking] = []
INVOICES: List[Invoice] = []
PAYMENTS: List[Payment] = []
ATTENDANCE_RECORDS: List[AttendanceRecord] = []


def reset_database():
    global USERS, MEMBERSHIP_PLANS, MEMBERS, GYM_CLASSES, CLASS_SLOTS, BOOKINGS, INVOICES, PAYMENTS, ATTENDANCE_RECORDS

    USERS.clear()
    USERS.extend([
        User(1, "admin@gym.com", "admin", "admin123"),
        User(2, "trainer.nam@gym.com", "trainer", "trainer123"),
        User(3, "trainer.hoa@gym.com", "trainer", "trainer123"),
        User(4, "member.an@gym.com", "member", "member123"),
    ])

    MEMBERSHIP_PLANS.clear()
    MEMBERSHIP_PLANS.extend([
        MembershipPlan(1, "Goi 1 Thang Co Ban", 30, 500000.0, True),
        MembershipPlan(2, "Goi 3 Thang VIP", 90, 1350000.0, True),
        MembershipPlan(3, "Goi 6 Thang Pro", 180, 2500000.0, True),
        MembershipPlan(4, "Goi 1 Nam Platinum", 365, 4800000.0, True),
    ])

    MEMBERS.clear()
    MEMBERS.extend([
        Member(1, 4, "member.an@gym.com", "active", 1),
        Member(2, 5, "member.binh@gym.com", "active", 2),
        Member(3, 6, "member.cuong@gym.com", "inactive", None),
    ])

    GYM_CLASSES.clear()
    GYM_CLASSES.extend([
        GymClass(1, "Yoga Binh Minh", "Yoga", 2, True),
        GymClass(2, "Boxing Doi Khang", "Boxing", 3, True),
        GymClass(3, "HIIT Dot Mo Nhanh", "Cardio", 2, True),
        GymClass(4, "Pilates Co Ban", "Pilates", 3, False),
    ])

    CLASS_SLOTS.clear()
    CLASS_SLOTS.extend([
        ClassSlot(1, 1, "2026-10-12 06:00:00", 15, 5, False),
        ClassSlot(2, 1, "2026-10-12 18:00:00", 15, 12, False),
        ClassSlot(3, 2, "2026-10-13 07:00:00", 20, 20, False),
        ClassSlot(4, 3, "2026-10-13 19:00:00", 20, 0, True),
    ])

    BOOKINGS.clear()
    BOOKINGS.extend([
        Booking(1, 1, 1, "confirmed", None),
        Booking(2, 2, 1, "confirmed", None),
        Booking(3, 3, 3, "waitlisted", 1),
        Booking(4, 1, 2, "cancelled", None),
    ])

    INVOICES.clear()
    INVOICES.extend([
        Invoice(1, 1, 500000.0, 500000.0, "paid"),
        Invoice(2, 2, 1350000.0, 0.0, "pending"),
        Invoice(3, 3, 2500000.0, 1000000.0, "pending"),
        Invoice(4, 4, 4800000.0, 0.0, "cancelled"),
    ])

    PAYMENTS.clear()
    PAYMENTS.extend([
        Payment(1, 1, 500000.0, "bank_transfer", "Chuyen khoan VietQR"),
        Payment(2, 3, 1000000.0, "cash", "Tien mat tai quay"),
        Payment(3, 2, 1350000.0, "credit_card", "Quet the POS"),
    ])

    ATTENDANCE_RECORDS.clear()
    ATTENDANCE_RECORDS.extend([
        AttendanceRecord(1, 1, "checked_in", "2026-10-11 08:30:00", None, "Check-in buoi sang"),
        AttendanceRecord(2, 2, "checked_out", "2026-10-11 06:15:00", "2026-10-11 07:45:00", "Tap buoi sang"),
        AttendanceRecord(3, 1, "checked_out", "2026-10-10 17:00:00", "2026-10-10 18:30:00", "Tap buoi chieu"),
    ])


# Initialize seed data on module import
reset_database()


def get_next_id(collection: List[Any]) -> int:
    return 1 if len(collection) == 0 else collection[-1].id + 1


def find_user_by_id(user_id: int) -> Optional[User]:
    for u in USERS:
        if u.id == user_id:
            return u
    return None


def find_plan_by_id(plan_id: int) -> Optional[MembershipPlan]:
    for p in MEMBERSHIP_PLANS:
        if p.id == plan_id:
            return p
    return None


def find_member_by_id(member_id: int) -> Optional[Member]:
    for m in MEMBERS:
        if m.id == member_id:
            return m
    return None


def find_class_by_id(class_id: int) -> Optional[GymClass]:
    for c in GYM_CLASSES:
        if c.id == class_id:
            return c
    return None


def find_slot_by_id(slot_id: int) -> Optional[ClassSlot]:
    for s in CLASS_SLOTS:
        if s.id == slot_id:
            return s
    return None


def find_booking_by_id(booking_id: int) -> Optional[Booking]:
    for b in BOOKINGS:
        if b.id == booking_id:
            return b
    return None


def find_invoice_by_id(invoice_id: int) -> Optional[Invoice]:
    for inv in INVOICES:
        if inv.id == invoice_id:
            return inv
    return None


def find_payment_by_id(payment_id: int) -> Optional[Payment]:
    for p in PAYMENTS:
        if p.id == payment_id:
            return p
    return None


def find_attendance_by_id(record_id: int) -> Optional[AttendanceRecord]:
    for a in ATTENDANCE_RECORDS:
        if a.id == record_id:
            return a
    return None
