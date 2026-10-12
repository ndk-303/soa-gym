from sqlmodel import Session, select
from app.models.user import User
from app.models.membership_plan import MembershipPlan
from app.models.member import Member
from app.models.gym_class import GymClass
from app.models.class_slot import ClassSlot
from app.models.booking import Booking
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.attendance import AttendanceRecord


def seed_database(session: Session) -> None:
    # Check if already seeded to prevent duplication
    existing_user = session.exec(select(User)).first()
    if existing_user is not None:
        return

    # Tier 1: Independent tables
    users = [
        User(id=1, email="admin@gym.com", role="admin", password="admin123"),
        User(id=2, email="trainer.nam@gym.com", role="trainer", password="trainer123"),
        User(id=3, email="trainer.hoa@gym.com", role="trainer", password="trainer123"),
        User(id=4, email="member.an@gym.com", role="member", password="member123"),
        User(id=5, email="member.binh@gym.com", role="member", password="member123"),
        User(id=6, email="member.chi@gym.com", role="member", password="member123"),
    ]
    for u in users:
        session.add(u)

    plans = [
        MembershipPlan(id=1, name="Goi 1 Thang Co Ban", duration_days=30, price=500000.0, is_active=True),
        MembershipPlan(id=2, name="Goi 3 Thang VIP", duration_days=90, price=1350000.0, is_active=True),
        MembershipPlan(id=3, name="Goi 6 Thang Pro", duration_days=180, price=2500000.0, is_active=True),
        MembershipPlan(id=4, name="Goi 1 Nam Platinum", duration_days=365, price=4800000.0, is_active=True),
    ]
    for p in plans:
        session.add(p)
    session.flush()

    # Tier 2: Tables depending on User and MembershipPlan
    members = [
        Member(id=1, user_id=4, email="member.an@gym.com", status="active", membership_plan_id=1),
        Member(id=2, user_id=5, email="member.binh@gym.com", status="active", membership_plan_id=2),
        Member(id=3, user_id=6, email="member.chi@gym.com", status="inactive", membership_plan_id=None),
    ]
    for m in members:
        session.add(m)

    gym_classes = [
        GymClass(id=1, name="Yoga Co Ban", category="Yoga", trainer_id=2, is_active=True),
        GymClass(id=2, name="Boxing Sparring", category="Combat", trainer_id=3, is_active=True),
        GymClass(id=3, name="HIIT Dot Mo", category="Cardio", trainer_id=2, is_active=True),
        GymClass(id=4, name="Pilates Phuc Hoi", category="Rehab", trainer_id=3, is_active=True),
    ]
    for gc in gym_classes:
        session.add(gc)
    session.flush()

    # Tier 3: ClassSlots depending on GymClass
    slots = [
        ClassSlot(id=1, class_id=1, start_time="2026-10-12 08:00:00", max_capacity=15, current_bookings=5, is_cancelled=False),
        ClassSlot(id=2, class_id=2, start_time="2026-10-12 10:00:00", max_capacity=10, current_bookings=8, is_cancelled=False),
        ClassSlot(id=3, class_id=3, start_time="2026-10-13 15:30:00", max_capacity=20, current_bookings=20, is_cancelled=False),
        ClassSlot(id=4, class_id=3, start_time="2026-10-14 18:00:00", max_capacity=25, current_bookings=0, is_cancelled=True),
    ]
    for s in slots:
        session.add(s)
    session.flush()

    # Tier 4: Bookings & Invoices depending on Member and ClassSlot
    bookings = [
        Booking(id=1, member_id=1, slot_id=1, status="confirmed", waitlist_position=None),
        Booking(id=2, member_id=2, slot_id=2, status="confirmed", waitlist_position=None),
        Booking(id=3, member_id=1, slot_id=3, status="confirmed", waitlist_position=None),
        Booking(id=4, member_id=2, slot_id=3, status="waitlisted", waitlist_position=1),
    ]
    for b in bookings:
        session.add(b)

    invoices = [
        Invoice(id=1, member_id=1, amount=500000.0, amount_paid=500000.0, status="paid"),
        Invoice(id=2, member_id=2, amount=1350000.0, amount_paid=0.0, status="pending"),
        Invoice(id=3, member_id=1, amount=2500000.0, amount_paid=1000000.0, status="partial"),
        Invoice(id=4, member_id=3, amount=500000.0, amount_paid=0.0, status="cancelled"),
    ]
    for inv in invoices:
        session.add(inv)
    session.flush()

    # Tier 5: Payments & AttendanceRecords depending on Invoice & Member
    payments = [
        Payment(id=1, invoice_id=1, amount=500000.0, payment_method="cash", notes="Thanh toan tien mat"),
        Payment(id=2, invoice_id=3, amount=1000000.0, payment_method="bank_transfer", notes="Chuyen khoan dot 1"),
        Payment(id=3, invoice_id=1, amount=500000.0, payment_method="credit_card", notes="Giao dich thanh toan the"),
    ]
    for pay in payments:
        session.add(pay)

    records = [
        AttendanceRecord(id=1, member_id=1, status="checked_in", check_in_time="2026-10-11 08:30:00", check_out_time=None, notes="Check-in buoi sang"),
        AttendanceRecord(id=2, member_id=2, status="checked_out", check_in_time="2026-10-11 06:15:00", check_out_time="2026-10-11 07:45:00", notes="Tap buoi sang"),
        AttendanceRecord(id=3, member_id=1, status="checked_out", check_in_time="2026-10-10 17:00:00", check_out_time="2026-10-10 18:30:00", notes="Tap buoi chieu"),
    ]
    for r in records:
        session.add(r)

    session.commit()
