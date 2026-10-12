# Modular Monolith Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the flat microservices codebase into a clean, layered FastAPI Modular Monolith running as a single application with direct in-memory communication.

**Architecture:** A unified FastAPI app with three clean layers: `models/` (pure Python entity classes), `schemas/` (Pydantic V2 validation), and `routers/` (APIRouter modules). Shared in-memory data lives in `app/database/db.py`, replacing inter-service HTTP networking with direct Python function lookups.

**Tech Stack:** Python 3.10+, FastAPI, Pydantic V2, Uvicorn, pytest, httpx.

**Spec:** `docs/superpowers/specs/2026-10-12-modular-monolith-refactor-design.md`

## Global Constraints

- Python 3.10+ / FastAPI / Pydantic V2 / Uvicorn.
- All entities use pure Python classes in `app/models/`.
- All request validation models in `app/schemas/` use Pydantic V2 (`ConfigDict`, `Field`).
- Centralized in-memory storage in `app/database/db.py`.
- Unified single application runs on port 8000 via `python run.py`.
- No HTTP networking between internal domain modules.

## Review Focus

1. Pydantic V2 deprecation warnings eliminated across all 9 request models.
2. Member creation validates `user_id` and `membership_plan_id` directly in memory and raises 400 if not found.
3. Booking creation checks member active status and slot capacity in memory, properly incrementing `current_bookings` or setting `waitlisted`.
4. Payment creation updates invoice `amount_paid` and status in memory atomically without network requests.
5. Legacy flat root files and multi-process scripts are completely cleaned up.

---

### Task 1: Create `app/models/` (Pure Python Entities)

**Files:**
- Create: `app/__init__.py`
- Create: `app/models/__init__.py`
- Create: `app/models/user.py`
- Create: `app/models/membership_plan.py`
- Create: `app/models/member.py`
- Create: `app/models/gym_class.py`
- Create: `app/models/class_slot.py`
- Create: `app/models/booking.py`
- Create: `app/models/invoice.py`
- Create: `app/models/payment.py`
- Create: `app/models/attendance.py`
- Test: `tests/test_models.py`

**Interfaces:**
- Produces: 9 entity classes (`User`, `MembershipPlan`, `Member`, `GymClass`, `ClassSlot`, `Booking`, `Invoice`, `Payment`, `AttendanceRecord`)

- [ ] **Step 1: Write unit tests for all 9 models in `tests/test_models.py`**

```python
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
    assert u.id == 1 and u.role == "admin"

    p = MembershipPlan(1, "1 Month", 30, 500000.0)
    assert p.is_active is True

    m = Member(1, 1, "test@gym.com")
    assert m.status == "active"

    c = GymClass(1, "Yoga", "Yoga", 1)
    assert c.is_active is True

    s = ClassSlot(1, 1, "2026-10-12 08:00:00")
    assert s.current_bookings == 0 and s.max_capacity == 20

    b = Booking(1, 1, 1)
    assert b.status == "confirmed"

    inv = Invoice(1, 1, 500000.0)
    assert inv.amount_paid == 0.0 and inv.status == "pending"

    pay = Payment(1, 1, 500000.0)
    assert pay.payment_method == "cash"

    att = AttendanceRecord(1, 1, "checked_in", "2026-10-12 08:00:00")
    assert att.check_out_time is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_models.py -v`
Expected: FAIL (ModuleNotFoundError)

- [ ] **Step 3: Implement 9 entity classes in `app/models/`**

Create pure Python classes each with `__init__` constructor methods matching spec §3.1.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_models.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/models/ tests/test_models.py app/__init__.py
git commit -m "feat: create pure python entity models in app/models"
```

---

### Task 2: Create `app/schemas/` (Pydantic V2 Request Schemas)

**Files:**
- Create: `app/schemas/__init__.py`
- Create: `app/schemas/user.py`
- Create: `app/schemas/membership_plan.py`
- Create: `app/schemas/member.py`
- Create: `app/schemas/gym_class.py`
- Create: `app/schemas/class_slot.py`
- Create: `app/schemas/booking.py`
- Create: `app/schemas/invoice.py`
- Create: `app/schemas/payment.py`
- Create: `app/schemas/attendance.py`
- Test: `tests/test_schemas.py`

**Interfaces:**
- Produces: 9 Pydantic request models with `model_config = ConfigDict(json_schema_extra={...})`

- [ ] **Step 1: Write tests for schemas validation in `tests/test_schemas.py`**

```python
import pytest
from pydantic import ValidationError
from app.schemas.user import UserRequest
from app.schemas.booking import BookingRequest

def test_user_request_valid():
    req = UserRequest(email="admin@gym.com", role="admin", password="password123")
    assert req.email == "admin@gym.com"

def test_user_request_invalid_length():
    with pytest.raises(ValidationError):
        UserRequest(email="a@b", role="ad", password="123")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_schemas.py -v`
Expected: FAIL (ModuleNotFoundError)

- [ ] **Step 3: Implement 9 schemas in `app/schemas/` using Pydantic V2 syntax**

Implement all 9 schema classes with `model_config = ConfigDict(...)` and `Field` constraints.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_schemas.py -v`
Expected: PASS (with 0 deprecation warnings)

- [ ] **Step 5: Commit**

```bash
git add app/schemas/ tests/test_schemas.py
git commit -m "feat: create pydantic v2 validation schemas in app/schemas"
```

---

### Task 3: Create `app/database/db.py` (Centralized In-Memory Store & Seed Data)

**Files:**
- Create: `app/database/__init__.py`
- Create: `app/database/db.py`
- Test: `tests/test_database.py`

**Interfaces:**
- Produces:
  - Collections: `USERS`, `MEMBERSHIP_PLANS`, `MEMBERS`, `GYM_CLASSES`, `CLASS_SLOTS`, `BOOKINGS`, `INVOICES`, `PAYMENTS`, `ATTENDANCE_RECORDS`
  - Helpers: `get_next_id(collection)`, `reset_database()`

- [ ] **Step 1: Write test for database operations in `tests/test_database.py`**

```python
from app.database.db import USERS, MEMBERS, reset_database, get_next_id
from app.models.user import User

def test_database_initialization_and_helpers():
    reset_database()
    assert len(USERS) == 4
    assert len(MEMBERS) == 3
    next_id = get_next_id(USERS)
    assert next_id == 5
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_database.py -v`
Expected: FAIL

- [ ] **Step 3: Implement `app/database/db.py`**

Implement seed data arrays and `reset_database()` function to reset state cleanly between tests.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_database.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/database/ tests/test_database.py
git commit -m "feat: implement centralized in-memory database and seed data"
```

---

### Task 4: Create `app/routers/` (CRUD & In-Memory Workflows)

**Files:**
- Create: `app/routers/__init__.py`
- Create: `app/routers/users.py`
- Create: `app/routers/membership_plans.py`
- Create: `app/routers/members.py`
- Create: `app/routers/gym_classes.py`
- Create: `app/routers/class_slots.py`
- Create: `app/routers/bookings.py`
- Create: `app/routers/invoices.py`
- Create: `app/routers/payments.py`
- Create: `app/routers/attendance.py`
- Test: `tests/test_routers_logic.py`

**Interfaces:**
- Consumes: `app.models`, `app.schemas`, `app.database.db`
- Produces: 9 `APIRouter` instances implementing CRUD and direct memory validations:
  - `members.py` checks `db.USERS` & `db.MEMBERSHIP_PLANS`
  - `bookings.py` checks `db.MEMBERS` & `db.CLASS_SLOTS`, updates capacity or waitlists
  - `payments.py` checks and updates `db.INVOICES` atomically

- [ ] **Step 1: Write tests for routers in `tests/test_routers_logic.py`**

```python
import pytest
from httpx import ASGITransport, AsyncClient
from fastapi import FastAPI
from app.routers.members import router as members_router
from app.routers.bookings import router as bookings_router
from app.routers.payments import router as payments_router
from app.database.db import reset_database

test_app = FastAPI()
test_app.include_router(members_router, prefix="/members")
test_app.include_router(bookings_router, prefix="/bookings")
test_app.include_router(payments_router, prefix="/payments")

@pytest.fixture(autouse=True)
def setup_db():
    reset_database()

@pytest.mark.asyncio
async def test_member_creation_in_memory_validation():
    async with AsyncClient(transport=ASGITransport(app=test_app), base_url="http://test") as client:
        res = await client.post("/members/create_member", json={"user_id": 9999, "email": "a@b.com", "status": "active"})
        assert res.status_code == 400
        assert "User with id 9999 does not exist" in res.json()["detail"]

@pytest.mark.asyncio
async def test_booking_slot_capacity_in_memory():
    async with AsyncClient(transport=ASGITransport(app=test_app), base_url="http://test") as client:
        res = await client.post("/bookings/create_booking", json={"member_id": 1, "slot_id": 1})
        assert res.status_code == 200
        assert res.json()["status"] == "confirmed"

@pytest.mark.asyncio
async def test_payment_settles_invoice_in_memory():
    async with AsyncClient(transport=ASGITransport(app=test_app), base_url="http://test") as client:
        res = await client.post("/payments/create_payment", json={"invoice_id": 2, "amount": 1350000.0, "payment_method": "cash"})
        assert res.status_code == 200
        assert res.json()["amount"] == 1350000.0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_routers_logic.py -v`
Expected: FAIL

- [ ] **Step 3: Implement all 9 routers in `app/routers/`**

Implement APIRouters with standardized CRUD endpoints, 404 guards, and in-memory workflow integrations.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_routers_logic.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/routers/ tests/test_routers_logic.py
git commit -m "feat: implement 9 apirouters with direct in-memory business logic"
```

---

### Task 5: Assemble `app/main.py` and `run.py`

**Files:**
- Create: `app/main.py`
- Create: `run.py`
- Test: `tests/test_main_app.py`

**Interfaces:**
- Produces:
  - `app.main:app` (FastAPI instance with all 9 routers mounted)
  - `run.py` launcher script

- [ ] **Step 1: Write test for main app assembly in `tests/test_main_app.py`**

```python
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_main_app_root():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/")
        assert res.status_code == 200
        assert "Gym Management System" in res.json()["message"]

@pytest.mark.asyncio
async def test_all_routers_mounted():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/users/users")
        assert res.status_code == 200
        assert len(res.json()) >= 4
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_main_app.py -v`
Expected: FAIL

- [ ] **Step 3: Implement `app/main.py` and `run.py`**

Assemble main FastAPI app with all routers and write `run.py`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_main_app.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/main.py run.py tests/test_main_app.py
git commit -m "feat: assemble modular monolith app and add run.py launcher"
```

---

### Task 6: Cleanup Obsolete Flat Files, Comprehensive E2E Test Suite & Documentation

**Files:**
- Delete: `attendance.py`, `bookings.py`, `class_slots.py`, `gym_classes.py`, `invoices.py`, `members.py`, `membership_plans.py`, `payments.py`, `users.py`, `gateway.py`, `run_all.py`, `test_system.py`
- Create: `tests/test_monolith_api.py` (Full E2E test suite)
- Clean: remove old microservices tests from `tests/`
- Modify: `README.md`
- Modify: `PROJECT_CONTEXT.md`

**Interfaces:**
- Produces: Cleaned project repository, single comprehensive test suite, updated docs.

- [ ] **Step 1: Implement full test suite `tests/test_monolith_api.py`**

Write tests covering:
- CRUD on all 9 routers
- 404 error responses
- Member validation logic
- Booking capacity & waitlist logic
- Payment invoice settlement logic

- [ ] **Step 2: Delete legacy root files and obsolete test files**

Remove flat root microservice files and multi-process runner scripts.

- [ ] **Step 3: Update `README.md` and `PROJECT_CONTEXT.md`**

Document the new Modular Monolith structure, layer roles, and startup instructions (`python run.py`).

- [ ] **Step 4: Run full pytest suite across entire project**

Run: `pytest tests/ -v`
Expected: All tests PASS with 0 deprecation warnings.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: clean up obsolete microservices files and update documentation"
```
