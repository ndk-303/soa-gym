# Design Specification: Modular Monolith Refactoring

- **Date**: 2026-10-12
- **Topic**: Restructuring Gym Management System from Standalone Microservice Files into a Clean FastAPI Modular Monolith
- **Status**: Approved by User

---

## 1. Executive Summary & Goals

Transform the existing flat repository (containing 9 standalone microservice files, a separate gateway, and a multi-process runner) into a unified **FastAPI Modular Monolith**.
- Consolidates all endpoints under a single FastAPI instance running on port 8000.
- Cleans directory structure into three well-bounded layers: `models/` (pure Python entities), `schemas/` (Pydantic V2 validation models), and `routers/` (APIRouter endpoints).
- Manages mock state in a centralized `app/database/db.py` module with direct in-memory Python operations.
- Replaces inter-service HTTP networking (RPC calls across 9 ports) with instantaneous, reliable direct memory function lookups.

---

## 2. Directory Structure

```
gym-models/
├── app/
│   ├── __init__.py
│   ├── main.py                     # Primary FastAPI application mounting 9 APIRouters
│   ├── database/
│   │   ├── __init__.py
│   │   └── db.py                   # Centralized in-memory storage & auto-increment helpers
│   ├── models/                     # Pure Python entity classes
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── membership_plan.py
│   │   ├── member.py
│   │   ├── gym_class.py
│   │   ├── class_slot.py
│   │   ├── booking.py
│   │   ├── invoice.py
│   │   ├── payment.py
│   │   └── attendance.py
│   ├── schemas/                    # Pydantic V2 Request validation models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── membership_plan.py
│   │   ├── member.py
│   │   ├── gym_class.py
│   │   ├── class_slot.py
│   │   ├── booking.py
│   │   ├── invoice.py
│   │   ├── payment.py
│   │   └── attendance.py
│   └── routers/                    # FastAPI APIRouters with prefix and OpenAPI tags
│       ├── __init__.py
│       ├── users.py                # prefix="/users", tags=["Users"]
│       ├── membership_plans.py     # prefix="/membership_plans", tags=["Membership Plans"]
│       ├── members.py              # prefix="/members", tags=["Members"]
│       ├── gym_classes.py          # prefix="/gym_classes", tags=["Gym Classes"]
│       ├── class_slots.py          # prefix="/class_slots", tags=["Class Slots"]
│       ├── bookings.py             # prefix="/bookings", tags=["Bookings"]
│       ├── invoices.py             # prefix="/invoices", tags=["Invoices"]
│       ├── payments.py             # prefix="/payments", tags=["Payments"]
│       └── attendance.py           # prefix="/attendance", tags=["Attendance"]
├── tests/
│   ├── __init__.py
│   └── test_monolith_api.py        # Comprehensive test suite covering all routers & workflows
├── run.py                          # Single Uvicorn startup script (port 8000)
├── pytest.ini
├── PROJECT_CONTEXT.md
└── README.md
```

---

## 3. Layer Architecture Details

### 3.1 Entity Models (`app/models/`)
Plain Python classes with `__init__` constructor methods, decoupled from validation concerns:
- `User(id, email, role, password)`
- `MembershipPlan(id, name, duration_days, price, is_active=True)`
- `Member(id, user_id, email, status="active", membership_plan_id=None)`
- `GymClass(id, name, category, trainer_id, is_active=True)`
- `ClassSlot(id, class_id, start_time, max_capacity=20, current_bookings=0, is_cancelled=False)`
- `Booking(id, member_id, slot_id, status="confirmed", waitlist_position=None)`
- `Invoice(id, member_id, amount, amount_paid=0.0, status="pending")`
- `Payment(id, invoice_id, amount, payment_method="cash", notes="")`
- `AttendanceRecord(id, member_id, status="checked_in", check_in_time=..., check_out_time=None, notes="")`

### 3.2 Pydantic Validation Schemas (`app/schemas/`)
Pydantic v2 `BaseModel` classes using `Field(...)` constraints and updated to modern Pydantic v2 conventions (`model_config = ConfigDict(json_schema_extra={...})`):
- `UserRequest`
- `MembershipPlanRequest`
- `MemberRequest`
- `GymClassRequest`
- `ClassSlotRequest`
- `BookingRequest`
- `InvoiceRequest`
- `PaymentRequest`
- `AttendanceRecordRequest`

### 3.3 Database State (`app/database/db.py`)
Centralized storage lists initialized with seed data:
- `USERS: list[User]`
- `MEMBERSHIP_PLANS: list[MembershipPlan]`
- `MEMBERS: list[Member]`
- `GYM_CLASSES: list[GymClass]`
- `CLASS_SLOTS: list[ClassSlot]`
- `BOOKINGS: list[Booking]`
- `INVOICES: list[Invoice]`
- `PAYMENTS: list[Payment]`
- `ATTENDANCE_RECORDS: list[AttendanceRecord]`
- Helper functions: `get_next_id(collection)`, `reset_database()` (for test isolation).

### 3.4 Direct In-Memory Workflows (`app/routers/`)

1. **Member Router (`app/routers/members.py`)**:
   - In `POST /members/create_member`:
     - Validates `user_id` exists in `db.USERS`. If missing: `HTTPException(400, "User with id {user_id} does not exist")`.
     - Validates `membership_plan_id` exists in `db.MEMBERSHIP_PLANS` if provided. If missing: `HTTPException(400, "Membership plan {id} does not exist")`.
     - Appends new `Member` and returns it.

2. **Booking Router (`app/routers/bookings.py`)**:
   - In `POST /bookings/create_booking`:
     - Validates `member_id` exists and `status == "active"`. If not: `HTTPException(400, "Member is not active")`.
     - Validates `slot_id` exists in `db.CLASS_SLOTS`. If not: `HTTPException(404, "Class slot not found")`.
     - If `slot.is_cancelled`: `HTTPException(400, "Class slot has been cancelled")`.
     - If `slot.current_bookings < slot.max_capacity`:
       - `status = "confirmed"`, `waitlist_position = None`
       - `slot.current_bookings += 1`
     - Else:
       - `status = "waitlisted"`, `waitlist_position = count of waitlists for slot + 1`
     - Appends new `Booking` and returns it.

3. **Payment Router (`app/routers/payments.py`)**:
   - In `POST /payments/create_payment`:
     - Validates `invoice_id` exists in `db.INVOICES`. If not: `HTTPException(404, "Invoice not found")`.
     - If `invoice.status == "paid"`: `HTTPException(400, "Invoice is already fully paid")`.
     - Updates `invoice.amount_paid += request.amount`.
     - If `invoice.amount_paid >= invoice.amount`: sets `invoice.status = "paid"`.
     - Appends new `Payment` and returns it.

---

## 4. Migration & Cleanup Plan

- Remove legacy flat root files:
  - Microservices: `users.py`, `membership_plans.py`, `members.py`, `gym_classes.py`, `class_slots.py`, `bookings.py`, `invoices.py`, `payments.py`, `attendance.py`
  - Multi-process runner and gateway: `gateway.py`, `run_all.py`, `test_system.py`
  - Old tests in `tests/`
- Add new `run.py` launching `app.main:app` on port 8000 with reload.
- Add new comprehensive test suite `tests/test_monolith_api.py`.
- Update `README.md` and `PROJECT_CONTEXT.md` to document the new Modular Monolith design.
