from app.models.user import User
from app.models.membership_plan import MembershipPlan
from app.models.member import Member
from app.models.gym_class import GymClass
from app.models.class_slot import ClassSlot
from app.models.booking import Booking
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.attendance import AttendanceRecord


def test_models_instantiation():
    u = User(1, "test@gym.com", "admin", "secret")
    assert u.id == 1 and u.role == "admin" and u.email == "test@gym.com"

    p = MembershipPlan(1, "1 Month", 30, 500000.0)
    assert p.is_active is True and p.duration_days == 30 and p.price == 500000.0

    m = Member(1, 1, "test@gym.com")
    assert m.status == "active" and m.membership_plan_id is None

    c = GymClass(1, "Yoga", "Yoga", 1)
    assert c.is_active is True and c.trainer_id == 1

    s = ClassSlot(1, 1, "2026-10-12 08:00:00")
    assert s.current_bookings == 0 and s.max_capacity == 20 and s.is_cancelled is False

    b = Booking(1, 1, 1)
    assert b.status == "confirmed" and b.waitlist_position is None

    inv = Invoice(1, 1, 500000.0)
    assert inv.amount_paid == 0.0 and inv.status == "pending"

    pay = Payment(1, 1, 500000.0)
    assert pay.payment_method == "cash" and pay.notes == ""

    att = AttendanceRecord(1, 1, "checked_in", "2026-10-12 08:00:00")
    assert att.check_out_time is None and att.status == "checked_in"
