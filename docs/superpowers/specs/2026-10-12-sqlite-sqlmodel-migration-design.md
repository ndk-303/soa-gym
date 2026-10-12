# Design Specification: SQLite & SQLModel Persistence Migration

**Date:** 2026-10-12  
**Status:** Approved  
**Topic:** Migrate in-memory datastore to SQLite using SQLModel (Sync Session)

---

## 1. Goal & Requirements

The current Modular Monolith uses Python in-memory lists (`app/database/db.py`) for data persistence. This design specification details the migration to **SQLite** using **SQLModel** (built on SQLAlchemy 2.0 Core and Pydantic V2) with clean layered boundaries:

1. **Database Engine:** SQLite database file stored at `./gym.db` (overrideable via `DATABASE_URL` environment variable).
2. **Session Lifecycle:** Synchronous `Session(engine)` injected into FastAPI endpoints using `Depends(get_session)`.
3. **Table & Schema Strategy:**
   - `app/models/`: SQLModel Table entities (`table=True`) with primary keys and foreign keys.
   - `app/schemas/`: Pydantic V2 request models (`*Request`) with field validations preserved.
4. **Initialization & Seeding:**
   - App startup creates tables automatically via `SQLModel.metadata.create_all(engine)` without pre-populating data (clean database).
   - A standalone CLI script `seed.py` provides on-demand population of sample records.
5. **Business Logic & Error Handling:**
   - Member creation validates `user_id` and `membership_plan_id`.
   - Booking creation enforces member `active` status, slot capacity limits, and auto-waitlist queuing.
   - Payment creation enforces invoice existence, prevents duplicate payment of settled invoices, and marks invoices as paid.
   - 404 Not Found guards on all single-item lookups and updates/deletions.
6. **Testing:**
   - Dedicated pytest test session fixtures using SQLite in-memory (`sqlite:///:memory:`) with `StaticPool` to ensure isolated, repeatable tests without touching `gym.db`.

---

## 2. Dependencies

Add `sqlmodel` to project dependencies:
```bash
pip install sqlmodel
```

---

## 3. Architecture & File Structure

```
gym-models/
├── app/
│   ├── models/                # SQLModel Table Entities (table=True)
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
│   ├── schemas/               # Request Validation DTOs (Pydantic V2)
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
│   ├── database/              # SQLite connection & session dependency
│   │   ├── __init__.py
│   │   ├── session.py         # engine, get_session, create_db_and_tables
│   │   └── seed.py            # Seed data records & seed_database function
│   ├── routers/               # 9 APIRouters injecting session: Session = Depends(get_session)
│   │   ├── users.py
│   │   ├── membership_plans.py
│   │   ├── members.py
│   │   ├── gym_classes.py
│   │   ├── class_slots.py
│   │   ├── bookings.py
│   │   ├── invoices.py
│   │   ├── payments.py
│   │   └── attendance.py
│   └── main.py                # FastAPI app with lifespan calling create_db_and_tables
├── tests/
│   ├── conftest.py            # Test engine (sqlite:///:memory:) & session override fixture
│   ├── test_models.py
│   ├── test_schemas.py
│   ├── test_database.py
│   ├── test_routers_logic.py
│   ├── test_main_app.py
│   └── test_monolith_api.py
├── run.py
├── seed.py                    # Root entrypoint CLI to seed database
└── README.md
```

---

## 4. Entity Definitions (`app/models/`)

All models inherit from `SQLModel` and specify `table=True`:

1. **`User` (`table=True`)**:
   - `id: Optional[int] = Field(default=None, primary_key=True)`
   - `email: str = Field(index=True, unique=True)`
   - `role: str`
   - `password: str`

2. **`MembershipPlan` (`table=True`)**:
   - `id: Optional[int] = Field(default=None, primary_key=True)`
   - `name: str`
   - `duration_days: int`
   - `price: float`
   - `is_active: bool = Field(default=True)`

3. **`Member` (`table=True`)**:
   - `id: Optional[int] = Field(default=None, primary_key=True)`
   - `user_id: int = Field(foreign_key="user.id")`
   - `email: str`
   - `status: str = Field(default="active")`
   - `membership_plan_id: Optional[int] = Field(default=None, foreign_key="membershipplan.id")`

4. **`GymClass` (`table=True`)**:
   - `id: Optional[int] = Field(default=None, primary_key=True)`
   - `name: str`
   - `category: str`
   - `trainer_id: int = Field(foreign_key="user.id")`
   - `is_active: bool = Field(default=True)`

5. **`ClassSlot` (`table=True`)**:
   - `id: Optional[int] = Field(default=None, primary_key=True)`
   - `class_id: int = Field(foreign_key="gymclass.id")`
   - `start_time: str`
   - `max_capacity: int`
   - `current_bookings: int = Field(default=0)`
   - `is_cancelled: bool = Field(default=False)`

6. **`Booking` (`table=True`)**:
   - `id: Optional[int] = Field(default=None, primary_key=True)`
   - `member_id: int = Field(foreign_key="member.id")`
   - `slot_id: int = Field(foreign_key="classslot.id")`
   - `status: str = Field(default="confirmed")`
   - `waitlist_position: Optional[int] = Field(default=None)`

7. **`Invoice` (`table=True`)**:
   - `id: Optional[int] = Field(default=None, primary_key=True)`
   - `member_id: int = Field(foreign_key="member.id")`
   - `amount: float`
   - `amount_paid: float = Field(default=0.0)`
   - `status: str = Field(default="pending")`

8. **`Payment` (`table=True`)**:
   - `id: Optional[int] = Field(default=None, primary_key=True)`
   - `invoice_id: int = Field(foreign_key="invoice.id")`
   - `amount: float`
   - `payment_method: str`
   - `notes: Optional[str] = Field(default=None)`

9. **`AttendanceRecord` (`table=True`)**:
   - `id: Optional[int] = Field(default=None, primary_key=True)`
   - `member_id: int = Field(foreign_key="member.id")`
   - `status: str = Field(default="checked_in")`
   - `check_in_time: str`
   - `check_out_time: Optional[str] = Field(default=None)`
   - `notes: Optional[str] = Field(default=None)`

---

## 5. Database Session & Seeder (`app/database/`)

### `app/database/session.py`
- `DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///gym.db")`
- `engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})`
- `def create_db_and_tables(): SQLModel.metadata.create_all(engine)`
- `def get_session(): with Session(engine) as session: yield session`

### `app/database/seed.py` & `seed.py`
- Seed lists containing the existing sample records for all 9 entities.
- `def seed_database(session: Session)`:
  - Checks if database has users; if empty, adds seed entities and commits.
- Root script [`seed.py`](file:///D:/Khoa%2015/TON%20DUC%20THANG/gym-models/seed.py):
  - Calls `create_db_and_tables()` and `seed_database()`, outputting confirmation message.

---

## 6. Router Query Pattern

Endpoints in `app/routers/` receive `session: Session = Depends(get_session)`:

1. **List all:**
   ```python
   session.exec(select(Entity)).all()
   ```
2. **Filter query:**
   ```python
   session.exec(select(Entity).where(Entity.role == role)).all()
   ```
3. **Get by ID:**
   ```python
   obj = session.get(Entity, id)
   if not obj:
       raise HTTPException(status_code=404, detail="Entity not found")
   ```
4. **Create:**
   ```python
   db_obj = Entity.model_validate(req)
   session.add(db_obj)
   session.commit()
   session.refresh(db_obj)
   return db_obj
   ```
5. **Update:**
   ```python
   obj = session.get(Entity, id)
   if not obj:
       raise HTTPException(status_code=404, detail="Entity not found")
   update_data = req.model_dump(exclude_unset=True, exclude={"id"})
   for key, val in update_data.items():
       setattr(obj, key, val)
   session.add(obj)
   session.commit()
   session.refresh(obj)
   return obj
   ```
6. **Delete:**
   ```python
   obj = session.get(Entity, id)
   if not obj:
       raise HTTPException(status_code=404, detail="Entity not found")
   session.delete(obj)
   session.commit()
   return {"detail": "Entity deleted"}
   ```

---

## 7. Business Logic Implementation Details

1. **Member Validation (`app/routers/members.py`)**:
   - Checks `session.get(User, req.user_id)`. If None, raise 400.
   - If `req.membership_plan_id`, checks `session.get(MembershipPlan, req.membership_plan_id)`. If None, raise 400.

2. **Booking Slot Capacity & Waitlist (`app/routers/bookings.py`)**:
   - Member check: `member = session.get(Member, req.member_id)`. If None or `member.status != "active"`, raise 400.
   - Slot check: `slot = session.get(ClassSlot, req.slot_id)`. If None, raise 404; if `slot.is_cancelled`, raise 400.
   - Capacity check:
     - If `slot.current_bookings < slot.max_capacity`:
       - `booking = Booking(member_id=req.member_id, slot_id=req.slot_id, status="confirmed")`
       - `slot.current_bookings += 1`
       - `session.add(slot)`
     - Else:
       - Query waitlisted bookings on slot: `waitlist_count = len(session.exec(select(Booking).where(Booking.slot_id == slot.id, Booking.status == "waitlisted")).all())`
       - `booking = Booking(member_id=req.member_id, slot_id=req.slot_id, status="waitlisted", waitlist_position=waitlist_count + 1)`
     - `session.add(booking); session.commit(); session.refresh(booking)`

3. **Payment Settlement (`app/routers/payments.py`)**:
   - `invoice = session.get(Invoice, req.invoice_id)`. If None, raise 404.
   - If `invoice.status == "paid"`: raise 400 ("Invoice is already paid").
   - `payment = Payment.model_validate(req); session.add(payment)`
   - `invoice.amount_paid += req.amount`
   - If `invoice.amount_paid >= invoice.amount`:
     - `invoice.status = "paid"`
   - `session.add(invoice); session.commit(); session.refresh(payment)`

---

## 8. Test Strategy & Isolation

- Provide `tests/conftest.py` with:
  ```python
  @pytest.fixture(name="session")
  def session_fixture():
      engine = create_engine(
          "sqlite:///:memory:",
          connect_args={"check_same_thread": False},
          poolclass=StaticPool,
      )
      SQLModel.metadata.create_all(engine)
      with Session(engine) as session:
          seed_database(session)  # Seed mock records for test convenience
          yield session
  ```
- Override FastAPI's `get_session` dependency in tests so that all HTTP client requests hit the in-memory SQLite database.
- Full pytest test suite covers models, schemas, database helpers, routers logic, main app, and E2E monolith API.
