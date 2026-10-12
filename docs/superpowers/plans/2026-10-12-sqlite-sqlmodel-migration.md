# SQLite & SQLModel Persistence Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the in-memory gym management system to SQLite using SQLModel (sync session) with complete test coverage and clean layer separation.

**Architecture:** Convert 9 domain entities in `app/models/` to SQLModel table classes, create SQLite engine and session dependency in `app/database/session.py`, implement CLI seeder `seed.py`, update all 9 APIRouters to use `Session = Depends(get_session)` with SQLModel queries while preserving business rules, and isolate automated tests via in-memory SQLite (`sqlite:///:memory:`).

**Tech Stack:** Python 3.11, FastAPI, SQLModel (SQLAlchemy 2.0 + Pydantic V2), SQLite, Pytest, HTTPX.

**Spec:** `docs/superpowers/specs/2026-10-12-sqlite-sqlmodel-migration-design.md`

## Global Constraints

- Database file default: `./gym.db` (configurable via `DATABASE_URL`).
- SQLModel table classes inherit `SQLModel, table=True` and use `Field(default=None, primary_key=True)` for `id`.
- Request DTOs in `app/schemas/` remain pure Pydantic V2 models for input validation.
- All session operations in routers use sync `Session(engine)` injected via `session: Session = Depends(get_session)`.
- No auto-seeding on app startup: startup only executes `create_db_and_tables()`. Manual seeding is handled via `seed.py`.
- Automated test suites MUST use SQLite in-memory (`sqlite:///:memory:`) with `StaticPool` and never write to `./gym.db`.

## Review Focus

- Slot capacity boundary: booking a slot whose `current_bookings >= max_capacity` marks booking as `waitlisted` without incrementing capacity.
- Member profile foreign keys: creating member with non-existent `user_id` or `membership_plan_id` returns 400 Bad Request.
- Settled invoice protection: applying payment to an already `paid` invoice returns 400 Bad Request.
- Cancelled class slot protection: booking a slot with `is_cancelled=True` returns 400 Bad Request.
- Non-existent resource lookups: GET/PUT/DELETE for non-existent IDs on all 9 routers return 404 Not Found.

---

### Task 1: Install `sqlmodel` and Refactor `app/models/` to SQLModel Table Entities

**Files:**
- Modify: `app/models/user.py`
- Modify: `app/models/membership_plan.py`
- Modify: `app/models/member.py`
- Modify: `app/models/gym_class.py`
- Modify: `app/models/class_slot.py`
- Modify: `app/models/booking.py`
- Modify: `app/models/invoice.py`
- Modify: `app/models/payment.py`
- Modify: `app/models/attendance.py`
- Modify: `tests/test_models.py`

**Interfaces:**
- Produces: 9 SQLModel table entity classes inheriting `SQLModel, table=True` with typed fields, primary keys, and foreign keys:
  - `User`, `MembershipPlan`, `Member`, `GymClass`, `ClassSlot`, `Booking`, `Invoice`, `Payment`, `AttendanceRecord`.

- [ ] **Step 1: Install `sqlmodel`**

```bash
pip install sqlmodel
```

- [ ] **Step 2: Update `tests/test_models.py` with SQLModel assertions**

```python
from sqlmodel import SQLModel
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
        assert issubclass(model_cls, SQLModel)
        assert hasattr(model_cls, "__tablename__")
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pytest tests/test_models.py -v`  
Expected: FAIL

- [ ] **Step 4: Refactor all 9 files in `app/models/` to SQLModel classes**

Convert plain Python `__init__` classes to `SQLModel, table=True` with `id: Optional[int] = Field(default=None, primary_key=True)` and foreign keys as specified in the spec.

- [ ] **Step 5: Run test to verify it passes**

Run: `pytest tests/test_models.py -v`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/models/ tests/test_models.py
git commit -m "feat: convert domain models to SQLModel table entities"
```

---

### Task 2: Implement Database Session & Seed Script (`app/database/`)

**Files:**
- Create: `app/database/session.py`
- Create: `app/database/seed.py`
- Create: `seed.py`
- Test: `tests/test_database.py`

**Interfaces:**
- Produces:
  - `engine: Engine`: SQLite engine connection.
  - `get_session() -> Generator[Session, None, None]`: FastAPI dependency yielding sync Session.
  - `create_db_and_tables()`: Calls `SQLModel.metadata.create_all(engine)`.
  - `seed_database(session: Session)`: Inserts standard mock records for all 9 entities.
  - Root `seed.py`: CLI script executing initialization and seeding.

- [ ] **Step 1: Write test for session and seeding in `tests/test_database.py`**

```python
import pytest
from sqlmodel import SQLModel, create_engine, Session, select
from sqlalchemy.pool import StaticPool
from app.database.seed import seed_database
from app.models.user import User

def test_session_and_seed_database():
    test_engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    SQLModel.metadata.create_all(test_engine)
    with Session(test_engine) as session:
        seed_database(session)
        users = session.exec(select(User)).all()
        assert len(users) == 6
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_database.py -v`  
Expected: FAIL

- [ ] **Step 3: Implement `app/database/session.py`, `app/database/seed.py`, and `seed.py`**

Implement connection engine, `get_session`, `create_db_and_tables`, `seed_database`, and root `seed.py` CLI launcher.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_database.py -v`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/database/session.py app/database/seed.py seed.py tests/test_database.py
git commit -m "feat: implement database session management and seed script"
```

---

### Task 3: Pytest Session Fixtures & Dependency Overrides (`tests/conftest.py`)

**Files:**
- Create: `tests/conftest.py`

**Interfaces:**
- Consumes: `app.database.session.get_session`, `app.database.seed.seed_database`
- Produces:
  - `test_engine`: In-memory SQLite engine with `StaticPool`.
  - `session`: Fresh test Session populated with seed data for test queries.
  - `client`: AsyncClient with FastAPI `app.dependency_overrides[get_session]` active.

- [ ] **Step 1: Implement `tests/conftest.py`**

```python
import pytest
from httpx import ASGITransport, AsyncClient
from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy.pool import StaticPool
from app.database.session import get_session
from app.database.seed import seed_database
from app.main import app

@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        seed_database(session)
        yield session

@pytest.fixture(name="client")
async def client_fixture(session: Session):
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()
```

- [ ] **Step 2: Run pytest to verify conftest imports cleanly**

Run: `pytest tests/test_database.py -v`  
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tests/conftest.py
git commit -m "test: configure isolated in-memory sqlite test fixtures"
```

---

### Task 4: Refactor 9 APIRouters to SQLModel Session & Database Queries

**Files:**
- Modify: `app/routers/users.py`
- Modify: `app/routers/membership_plans.py`
- Modify: `app/routers/members.py`
- Modify: `app/routers/gym_classes.py`
- Modify: `app/routers/class_slots.py`
- Modify: `app/routers/bookings.py`
- Modify: `app/routers/invoices.py`
- Modify: `app/routers/payments.py`
- Modify: `app/routers/attendance.py`
- Modify: `tests/test_routers_logic.py`

**Interfaces:**
- Consumes: `app.models`, `app.schemas`, `app.database.session.get_session`
- Produces: 9 APIRouters using `session: Session = Depends(get_session)` with SQLModel `select`, `session.get`, `session.add`, `session.commit`, `session.delete`.

- [ ] **Step 1: Update `tests/test_routers_logic.py` to test SQLModel router logic**

Update test cases for:
- User query and filter
- Member validation (rejects invalid `user_id` and `plan_id`)
- Booking capacity check, confirmed booking increment, auto-waitlist on full capacity, and reject cancelled slot
- Payment invoice settlement, updating invoice `amount_paid` and setting status to `paid`

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_routers_logic.py -v`  
Expected: FAIL

- [ ] **Step 3: Refactor all 9 APIRouters in `app/routers/` to use SQLModel queries**

Replace in-memory list operations (`db.USERS`, etc.) with `session.exec(select(...))`, `session.get()`, `session.add()`, and `session.commit()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_routers_logic.py -v`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/routers/ tests/test_routers_logic.py
git commit -m "feat: migrate 9 apirouters to sqlmodel session queries and transactions"
```

---

### Task 5: Update Main Application Lifespan & Launcher Script

**Files:**
- Modify: `app/main.py`
- Modify: `tests/test_main_app.py`

**Interfaces:**
- Consumes: `app.database.session.create_db_and_tables`
- Produces: `app.main:app` with FastAPI lifespan handler initializing SQLite tables on startup.

- [ ] **Step 1: Update `tests/test_main_app.py`**

Verify root status and OpenAPI docs.

- [ ] **Step 2: Update `app/main.py` with lifespan event**

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.database.session import create_db_and_tables

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(title="Gym Management System", version="1.0.0", lifespan=lifespan)
```

- [ ] **Step 3: Run test to verify it passes**

Run: `pytest tests/test_main_app.py -v`  
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/main.py tests/test_main_app.py
git commit -m "feat: register database initialization in app lifespan"
```

---

### Task 6: Comprehensive E2E Test Suite, Deprecate `app/database/db.py`, and Documentation

**Files:**
- Delete: `app/database/db.py`
- Modify: `tests/test_monolith_api.py`
- Modify: `README.md`
- Modify: `PROJECT_CONTEXT.md`

**Interfaces:**
- Produces: Clean codebase without leftover in-memory list storage, updated documentation explaining SQLite and SQLModel, passing full test suite.

- [ ] **Step 1: Update `tests/test_monolith_api.py` to use test client with SQLite session fixture**

Verify end-to-end user journey across all 9 domains against SQLite in-memory database.

- [ ] **Step 2: Delete legacy in-memory file `app/database/db.py`**

Remove `app/database/db.py` and verify no lingering imports remain.

- [ ] **Step 3: Update `README.md` and `PROJECT_CONTEXT.md`**

Update documentation with `gym.db`, `seed.py`, `sqlmodel` requirements, and database structure.

- [ ] **Step 4: Run full test suite across the entire project**

Run: `pytest tests/ -v`  
Expected: All tests PASS with 0 errors and 0 warnings.

- [ ] **Step 5: Verify CLI seed script runs cleanly**

Run: `python seed.py`  
Expected: Creates `gym.db` and populates seed records successfully.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: remove in-memory db, update e2e tests and documentation for sqlite"
```
