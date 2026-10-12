import pytest
from pydantic import ValidationError
from app.schemas.user import UserRequest
from app.schemas.membership_plan import MembershipPlanRequest
from app.schemas.member import MemberRequest
from app.schemas.gym_class import GymClassRequest
from app.schemas.class_slot import ClassSlotRequest
from app.schemas.booking import BookingRequest
from app.schemas.invoice import InvoiceRequest
from app.schemas.payment import PaymentRequest
from app.schemas.attendance import AttendanceRecordRequest


def test_user_request_valid():
    req = UserRequest(email="admin@gym.com", role="admin", password="password123")
    assert req.email == "admin@gym.com"
    data = req.model_dump()
    assert data["role"] == "admin"


def test_user_request_invalid_length():
    with pytest.raises(ValidationError):
        UserRequest(email="a@b", role="ad", password="123")


def test_all_schemas_instantiation():
    p = MembershipPlanRequest(name="1 Month", duration_days=30, price=500000.0)
    assert p.duration_days == 30

    m = MemberRequest(user_id=1, email="m@gym.com")
    assert m.status == "active"

    c = GymClassRequest(name="Yoga", category="Yoga", trainer_id=1)
    assert c.is_active is True

    s = ClassSlotRequest(class_id=1, start_time="2026-10-12 08:00:00", max_capacity=25)
    assert s.max_capacity == 25

    b = BookingRequest(member_id=1, slot_id=1)
    assert b.status == "confirmed"

    inv = InvoiceRequest(member_id=1, amount=500000.0)
    assert inv.status == "pending"

    pay = PaymentRequest(invoice_id=1, amount=500000.0, payment_method="cash")
    assert pay.payment_method == "cash"

    att = AttendanceRecordRequest(member_id=1, check_in_time="2026-10-12 08:00:00")
    assert att.status == "checked_in"
