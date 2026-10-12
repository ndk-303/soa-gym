# Microservices Communication & API Gateway Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement inter-service synchronous HTTP validation across three core gym workflows and introduce an API Gateway reverse proxy on port 8000 with centralized health checking.

**Architecture:** A lightweight FastAPI reverse proxy gateway on port 8000 forwards client requests to 9 microservices (ports 8001–8009) using `httpx.AsyncClient`. Individual microservices make direct HTTP calls with 2.0s timeouts to validate foreign relations and trigger cross-domain updates.

**Tech Stack:** Python 3.10+, FastAPI, Pydantic, httpx, Uvicorn.

**Spec:** `docs/superpowers/specs/2026-10-12-microservices-communication-gateway-design.md`

## Global Constraints

- Python 3.10+ / FastAPI / Pydantic / httpx
- Backend microservices retain their designated ports (8001–8009); Gateway listens on port 8000.
- Inter-service HTTP calls use `httpx.AsyncClient` with a 2.0s timeout.
- Unhandled service disconnections return HTTP `503 Service Unavailable`.
- Missing referenced entities raise HTTP `400 Bad Request` or `404 Not Found`.

## Review Focus

1. Target service is down when a caller makes an inter-service call ➔ caller returns 503 instead of crashing or hanging indefinitely.
2. Member with inactive status attempts class booking ➔ rejected with 400 Bad Request.
3. Class slot reaches capacity (`current_bookings == max_capacity`) ➔ booking automatically marked `"waitlisted"` with sequential `waitlist_position` instead of incrementing slot capacity.
4. Payment applied to already-paid invoice ➔ rejected with 400 Bad Request.
5. Invalid service name requested on Gateway (`/api/nonexistent/foo`) ➔ returns 404 Not Found with clear detail.

---

### Task 1: Callee Endpoints & 404 Standardizations in Target Services

**Files:**
- Modify: `users.py:65-70`
- Modify: `membership_plans.py:69-74`
- Modify: `class_slots.py:73-78`
- Modify: `invoices.py:69-74`
- Test: `tests/test_callee_services.py`

**Interfaces:**
- Consumes: Existing in-memory models and data lists
- Produces:
  - `GET /users/{id}` ➔ raises `HTTPException(404, "User not found")` if missing
  - `GET /membership_plans/{id}` ➔ raises `HTTPException(404, "Membership plan not found")` if missing
  - `GET /class_slots/{id}` ➔ raises `HTTPException(404, "Class slot not found")` if missing
  - `POST /class_slots/{id}/increment_booking` ➔ returns updated `ClassSlot`
  - `GET /invoices/{id}` ➔ raises `HTTPException(404, "Invoice not found")` if missing
  - `POST /invoices/{id}/apply_payment?paid_amount={amount}` ➔ returns updated `Invoice`

- [ ] **Step 1: Write the failing unit tests for callee endpoints**

```python
import pytest
from httpx import ASGITransport, AsyncClient
from users import app as users_app
from membership_plans import app as plans_app
from class_slots import app as slots_app
from invoices import app as invoices_app

@pytest.mark.asyncio
async def test_users_404_on_missing_id():
    async with AsyncClient(transport=ASGITransport(app=users_app), base_url="http://test") as client:
        res = await client.get("/users/9999")
        assert res.status_code == 404

@pytest.mark.asyncio
async def test_class_slots_increment_booking():
    async with AsyncClient(transport=ASGITransport(app=slots_app), base_url="http://test") as client:
        res = await client.post("/class_slots/1/increment_booking")
        assert res.status_code == 200
        assert res.json()["current_bookings"] == 6

@pytest.mark.asyncio
async def test_invoices_apply_payment():
    async with AsyncClient(transport=ASGITransport(app=invoices_app), base_url="http://test") as client:
        res = await client.post("/invoices/2/apply_payment?paid_amount=1350000.0")
        assert res.status_code == 200
        data = res.json()
        assert data["amount_paid"] == 1350000.0
        assert data["status"] == "paid"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_callee_services.py -v`
Expected: FAIL with missing endpoints and 200/null responses for missing IDs.

- [ ] **Step 3: Implement 404 guards and helper endpoints**

Update `users.py`, `membership_plans.py`, `class_slots.py`, and `invoices.py`:
- In `GET /{entities}/{id}`: raise `HTTPException(status_code=404, detail="...")` if loop finishes without match.
- In `class_slots.py`: add `@app.post("/class_slots/{id}/increment_booking")` to increment `slot.current_bookings += 1`.
- In `invoices.py`: add `@app.post("/invoices/{id}/apply_payment")` with query param `paid_amount: float` to update `amount_paid` and set `status = "paid"` if `amount_paid >= amount`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_callee_services.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add users.py membership_plans.py class_slots.py invoices.py tests/test_callee_services.py
git commit -m "feat: standardize 404 responses and add increment/payment endpoints"
```

---

### Task 2: Implement Member Validation (Workflow 1)

**Files:**
- Modify: `members.py`
- Test: `tests/test_members_validation.py`

**Interfaces:**
- Consumes:
  - `GET http://127.0.0.1:8001/users/{user_id}`
  - `GET http://127.0.0.1:8002/membership_plans/{plan_id}`
- Produces:
  - `POST /member/create_member` ➔ validates foreign IDs, raises 400 if user or plan does not exist, or 503 if services unreachable.
  - `GET /members/{id}` ➔ raises 404 if missing.

- [ ] **Step 1: Write the failing test for Member creation validation**

```python
import pytest
from httpx import ASGITransport, AsyncClient
from unittest.mock import patch
from members import app as members_app

@pytest.mark.asyncio
async def test_create_member_rejects_missing_user():
    async with AsyncClient(transport=ASGITransport(app=members_app), base_url="http://test") as client:
        with patch("members.check_user_exists", return_value=False):
            res = await client.post("/member/create_member", json={
                "user_id": 9999,
                "email": "test@gym.com",
                "status": "active"
            })
            assert res.status_code == 400
            assert "User with id 9999 does not exist" in res.json()["detail"]

@pytest.mark.asyncio
async def test_create_member_rejects_missing_plan():
    async with AsyncClient(transport=ASGITransport(app=members_app), base_url="http://test") as client:
        with patch("members.check_user_exists", return_value=True), \
             patch("members.check_plan_exists", return_value=False):
            res = await client.post("/member/create_member", json={
                "user_id": 1,
                "email": "valid@gym.com",
                "status": "active",
                "membership_plan_id": 999
            })
            assert res.status_code == 400
            assert "Membership plan 999 does not exist" in res.json()["detail"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_members_validation.py -v`
Expected: FAIL

- [ ] **Step 3: Implement validation functions & integrate in `members.py`**

- Add helper async functions in `members.py`:
  - `check_user_exists(user_id: int) -> bool` calling `http://127.0.0.1:8001/users/{user_id}`.
  - `check_plan_exists(plan_id: int) -> bool` calling `http://127.0.0.1:8002/membership_plans/{plan_id}`.
  - Wrap in try/except `httpx.RequestError` raising `HTTPException(503, "Target service unavailable")`.
- In `create_member(request_member: MemberRequest)`:
  - If not `await check_user_exists(request_member.user_id)`: raise `HTTPException(400, f"User with id {request_member.user_id} does not exist")`.
  - If `request_member.membership_plan_id` and not `await check_plan_exists(request_member.membership_plan_id)`: raise `HTTPException(400, f"Membership plan {request_member.membership_plan_id} does not exist")`.
- In `GET /members/{id}`: raise 404 if not found.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_members_validation.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add members.py tests/test_members_validation.py
git commit -m "feat: add user and plan validation to member creation"
```

---

### Task 3: Implement Booking Validation & Slot Reservation (Workflow 2)

**Files:**
- Modify: `bookings.py`
- Test: `tests/test_bookings_validation.py`

**Interfaces:**
- Consumes:
  - `GET http://127.0.0.1:8003/members/{member_id}`
  - `GET http://127.0.0.1:8005/class_slots/{slot_id}`
  - `POST http://127.0.0.1:8005/class_slots/{slot_id}/increment_booking`
- Produces:
  - `POST /booking/create_booking` ➔ rejects inactive member (400), cancelled slot (400), increments slot bookings if available, or queues waitlist if slot is full.

- [ ] **Step 1: Write the failing test for Booking validation**

```python
import pytest
from httpx import ASGITransport, AsyncClient
from unittest.mock import patch, AsyncMock
from bookings import app as bookings_app

@pytest.mark.asyncio
async def test_booking_rejects_inactive_member():
    async with AsyncClient(transport=ASGITransport(app=bookings_app), base_url="http://test") as client:
        with patch("bookings.fetch_member", return_value={"id": 3, "status": "inactive"}):
            res = await client.post("/booking/create_booking", json={
                "member_id": 3,
                "slot_id": 1
            })
            assert res.status_code == 400
            assert "Member is not active" in res.json()["detail"]

@pytest.mark.asyncio
async def test_booking_increments_slot_when_open():
    async with AsyncClient(transport=ASGITransport(app=bookings_app), base_url="http://test") as client:
        with patch("bookings.fetch_member", return_value={"id": 1, "status": "active"}), \
             patch("bookings.fetch_slot", return_value={"id": 1, "current_bookings": 5, "max_capacity": 15, "is_cancelled": False}), \
             patch("bookings.increment_slot_booking", new_callable=AsyncMock) as mock_inc:
            res = await client.post("/booking/create_booking", json={
                "member_id": 1,
                "slot_id": 1
            })
            assert res.status_code == 200
            assert res.json()["status"] == "confirmed"
            mock_inc.assert_awaited_once_with(1)

@pytest.mark.asyncio
async def test_booking_auto_waitlists_when_slot_full():
    async with AsyncClient(transport=ASGITransport(app=bookings_app), base_url="http://test") as client:
        with patch("bookings.fetch_member", return_value={"id": 1, "status": "active"}), \
             patch("bookings.fetch_slot", return_value={"id": 3, "current_bookings": 20, "max_capacity": 20, "is_cancelled": False}):
            res = await client.post("/booking/create_booking", json={
                "member_id": 1,
                "slot_id": 3
            })
            assert res.status_code == 200
            assert res.json()["status"] == "waitlisted"
            assert res.json()["waitlist_position"] is not None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_bookings_validation.py -v`
Expected: FAIL

- [ ] **Step 3: Implement booking workflow logic in `bookings.py`**

- Add helper functions `fetch_member(member_id: int)`, `fetch_slot(slot_id: int)`, and `increment_slot_booking(slot_id: int)` using `httpx.AsyncClient`.
- In `create_booking`:
  - Validate member is active (400 if inactive).
  - Validate slot is not cancelled (400 if cancelled).
  - If `slot["current_bookings"] < slot["max_capacity"]`: set `status = "confirmed"`, await `increment_slot_booking(slot_id)`.
  - Else: set `status = "waitlisted"`, calculate `waitlist_position` = count of waitlists for that slot + 1.
  - Return created `Booking`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_bookings_validation.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add bookings.py tests/test_bookings_validation.py
git commit -m "feat: add member validation and slot capacity management to bookings"
```

---

### Task 4: Implement Payment Application & Invoice Update (Workflow 3)

**Files:**
- Modify: `payments.py`
- Test: `tests/test_payments_workflow.py`

**Interfaces:**
- Consumes:
  - `GET http://127.0.0.1:8007/invoices/{invoice_id}`
  - `POST http://127.0.0.1:8007/invoices/{invoice_id}/apply_payment?paid_amount={amount}`
- Produces:
  - `POST /payment/create_payment` ➔ rejects already paid invoices (400), missing invoices (404), records payment, and calls `apply_payment` on `invoices.py`.

- [ ] **Step 1: Write the failing test for Payment workflow**

```python
import pytest
from httpx import ASGITransport, AsyncClient
from unittest.mock import patch, AsyncMock
from payments import app as payments_app

@pytest.mark.asyncio
async def test_payment_rejects_already_paid_invoice():
    async with AsyncClient(transport=ASGITransport(app=payments_app), base_url="http://test") as client:
        with patch("payments.fetch_invoice", return_value={"id": 1, "status": "paid"}):
            res = await client.post("/payment/create_payment", json={
                "invoice_id": 1,
                "amount": 500000.0,
                "payment_method": "cash"
            })
            assert res.status_code == 400
            assert "Invoice is already fully paid" in res.json()["detail"]

@pytest.mark.asyncio
async def test_payment_calls_apply_payment():
    async with AsyncClient(transport=ASGITransport(app=payments_app), base_url="http://test") as client:
        with patch("payments.fetch_invoice", return_value={"id": 2, "status": "pending"}), \
             patch("payments.apply_invoice_payment", new_callable=AsyncMock) as mock_apply:
            res = await client.post("/payment/create_payment", json={
                "invoice_id": 2,
                "amount": 1350000.0,
                "payment_method": "bank_transfer"
            })
            assert res.status_code == 200
            mock_apply.assert_awaited_once_with(2, 1350000.0)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_payments_workflow.py -v`
Expected: FAIL

- [ ] **Step 3: Implement payment workflow in `payments.py`**

- Add helper functions `fetch_invoice(invoice_id: int)` and `apply_invoice_payment(invoice_id: int, amount: float)`.
- In `create_payment`:
  - Fetch invoice; raise 404 if missing, 400 if `invoice["status"] == "paid"`.
  - Create and append `Payment`.
  - Await `apply_invoice_payment(invoice_id, amount)`.
  - Return created payment.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_payments_workflow.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add payments.py tests/test_payments_workflow.py
git commit -m "feat: validate invoice status and apply payment synchronously"
```

---

### Task 5: Implement API Gateway (`gateway.py`)

**Files:**
- Create: `gateway.py`
- Test: `tests/test_gateway.py`

**Interfaces:**
- Consumes: Ports 8001–8009
- Produces:
  - `GET /` ➔ Gateway metadata and route directory
  - `GET /health` ➔ Aggregated status of all 9 services
  - `ANY /api/{service}/{path:path}` ➔ Reverse proxy to backend services

- [ ] **Step 1: Write the failing tests for API Gateway**

```python
import pytest
from httpx import ASGITransport, AsyncClient
from unittest.mock import patch, AsyncMock
from gateway import app as gateway_app

@pytest.mark.asyncio
async def test_gateway_root():
    async with AsyncClient(transport=ASGITransport(app=gateway_app), base_url="http://test") as client:
        res = await client.get("/")
        assert res.status_code == 200
        assert "Gym API Gateway" in res.json()["message"]

@pytest.mark.asyncio
async def test_gateway_unknown_service():
    async with AsyncClient(transport=ASGITransport(app=gateway_app), base_url="http://test") as client:
        res = await client.get("/api/unknown_service/test")
        assert res.status_code == 404

@pytest.mark.asyncio
async def test_gateway_proxy_forward():
    async with AsyncClient(transport=ASGITransport(app=gateway_app), base_url="http://test") as client:
        with patch("gateway.forward_request", new_callable=AsyncMock) as mock_forward:
            mock_forward.return_value = {"proxied": True}
            res = await client.get("/api/users/users")
            assert res.status_code == 200
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_gateway.py -v`
Expected: FAIL (gateway.py does not exist)

- [ ] **Step 3: Implement `gateway.py`**

- Define `SERVICES` dictionary mapping 9 services to `http://127.0.0.1:8001..8009`.
- Implement `GET /` returning summary and route list.
- Implement `GET /health` using `asyncio.gather` pinging `GET /` on each service with 1.5s timeout.
- Implement `@app.api_route("/api/{service}/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])` forwarding requests via `httpx.AsyncClient` with 2.0s timeout and returning status 503 if unreachable.

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_gateway.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add gateway.py tests/test_gateway.py
git commit -m "feat: implement API Gateway reverse proxy and health check"
```

---

### Task 6: Multi-Service Startup Script (`run_all.py`) & End-to-End Test (`test_system.py`)

**Files:**
- Create: `run_all.py`
- Create: `test_system.py`

**Interfaces:**
- Consumes: `gateway.py` and 9 service modules
- Produces:
  - CLI command `python run_all.py` to start and gracefully terminate all 10 services
  - CLI command `python test_system.py` to verify full live system flow

- [ ] **Step 1: Write `run_all.py` process manager**

- Spawns each process with `uvicorn <module>:app --port <port>` via `subprocess.Popen`.
- Listens for keyboard interrupt `SIGINT` / `KeyboardInterrupt` and terminates all child processes cleanly.

- [ ] **Step 2: Write live end-to-end integration test `test_system.py`**

- Verifies Gateway `GET http://127.0.0.1:8000/health` reports status `"healthy"`.
- Tests Workflow 1 through Gateway (`POST http://127.0.0.1:8000/api/members/member/create_member` fails with non-existent user, succeeds with valid user).
- Tests Workflow 2 through Gateway (`POST http://127.0.0.1:8000/api/bookings/booking/create_booking` succeeds, increments slot capacity; waitlists when full).
- Tests Workflow 3 through Gateway (`POST http://127.0.0.1:8000/api/payments/payment/create_payment` pays invoice, sets invoice status to `"paid"`).

- [ ] **Step 3: Run pytest on all test suites**

Run: `pytest tests/ -v`
Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add run_all.py test_system.py
git commit -m "feat: add multi-service startup runner and end-to-end test suite"
```
