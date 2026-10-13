from app.models.base import Base
from app.models.user import User
from app.models.membership_plan import MembershipPlan
from app.models.member import Member
from app.models.gym_class import GymClass
from app.models.class_slot import ClassSlot
from app.models.booking import Booking
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.attendance import AttendanceRecord


def test_models_table_metadata():
    for model_cls in [User, MembershipPlan, Member, GymClass, ClassSlot, Booking, Invoice, Payment, AttendanceRecord]:
        assert issubclass(model_cls, Base)
        assert hasattr(model_cls, "__tablename__")
        assert getattr(model_cls, "__tablename__") is not None


def test_models_instantiation():
    u = User(id=1, email="test@gym.com", role="admin", password="secret")
    assert u.id == 1 and u.role == "admin" and u.email == "test@gym.com"

    p = MembershipPlan(id=1, name="1 Month", duration_days=30, price=500000.0)
    assert p.is_active is True and p.duration_days == 30 and p.price == 500000.0

    m = Member(id=1, user_id=1, email="test@gym.com")
    assert m.status == "active" and m.membership_plan_id is None

    c = GymClass(id=1, name="Yoga", category="Yoga", trainer_id=1)
    assert c.is_active is True and c.trainer_id == 1

    s = ClassSlot(id=1, class_id=1, start_time="2026-10-12 08:00:00", max_capacity=20)
    assert s.current_bookings == 0 and s.max_capacity == 20 and s.is_cancelled is False

    b = Booking(id=1, member_id=1, slot_id=1)
    assert b.status == "confirmed" and b.waitlist_position is None

    inv = Invoice(id=1, member_id=1, amount=500000.0)
    assert inv.amount_paid == 0.0 and inv.status == "pending"

    pay = Payment(id=1, invoice_id=1, amount=500000.0, payment_method="cash")
    assert pay.payment_method == "cash" and pay.notes is None

    att = AttendanceRecord(id=1, member_id=1, status="checked_in", check_in_time="2026-10-12 08:00:00")
    assert att.check_out_time is None and att.status == "checked_in"
