from app.database import db
from app.models.user import User


def test_database_initialization_and_helpers():
    db.reset_database()
    assert len(db.USERS) == 4
    assert len(db.MEMBERSHIP_PLANS) == 4
    assert len(db.MEMBERS) == 3
    assert len(db.GYM_CLASSES) == 4
    assert len(db.CLASS_SLOTS) == 4
    assert len(db.BOOKINGS) == 4
    assert len(db.INVOICES) == 4
    assert len(db.PAYMENTS) == 3
    assert len(db.ATTENDANCE_RECORDS) == 3

    next_user_id = db.get_next_id(db.USERS)
    assert next_user_id == 5

    # Test lookup helpers
    assert db.find_user_by_id(1) is not None
    assert db.find_user_by_id(9999) is None

    assert db.find_plan_by_id(1) is not None
    assert db.find_plan_by_id(9999) is None

    assert db.find_member_by_id(1) is not None
    assert db.find_member_by_id(9999) is None

    assert db.find_slot_by_id(1) is not None
    assert db.find_slot_by_id(9999) is None

    assert db.find_invoice_by_id(1) is not None
    assert db.find_invoice_by_id(9999) is None
