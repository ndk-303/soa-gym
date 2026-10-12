# Design Specification: Microservices Communication & Basic API Gateway

- **Date**: 2026-10-12
- **Topic**: Inter-service Communication & API Gateway for Gym Models
- **Status**: Approved by User

---

## 1. System Architecture Overview

The system consists of 10 FastAPI instances:
- **API Gateway (`gateway.py`)**: Runs on port `8000`, acts as the single entry point for client requests, provides a unified health-check endpoint, and forwards traffic to backend microservices.
- **9 Standalone Microservices**: Run on ports `8001` through `8009`, managing isolated domains using in-memory data structures.

```
Client / Frontend
       │
       ▼
┌────────────────────────────────────────────────────────┐
│             API Gateway (Port 8000)                    │
│      - Wildcard Reverse Proxy (/api/{service}/*)       │
│      - Centralized Health Check (/health)              │
└──────┬────────────┬────────────┬────────────┬──────────┘
       │            │            │            │
       ▼            ▼            ▼            ▼
┌────────────┐┌────────────┐┌────────────┐┌────────────┐
│   Users    ││ Membership ││  Members   ││Gym Classes │ ... (9 Services: Ports 8001-8009)
│ (Port 8001)││(Port 8002) ││(Port 8003) ││(Port 8004) │
└──────▲─────┘└──────▲─────┘└──────▲─────┘└────────────┘
       │             │             │
       └─────────────┼─────────────┘
          HTTP Calls │ (Inter-service validation:
                     │  - members -> users, membership_plans
                     │  - bookings -> members, class_slots
                     │  - payments -> invoices)
```

---

## 2. Component Design

### 2.1 API Gateway (`gateway.py` — Port 8000)

- **Routing Map**:
  ```python
  SERVICES = {
      "users": "http://127.0.0.1:8001",
      "membership_plans": "http://127.0.0.1:8002",
      "members": "http://127.0.0.1:8003",
      "gym_classes": "http://127.0.0.1:8004",
      "class_slots": "http://127.0.0.1:8005",
      "bookings": "http://127.0.0.1:8006",
      "invoices": "http://127.0.0.1:8007",
      "payments": "http://127.0.0.1:8008",
      "attendance": "http://127.0.0.1:8009",
  }
  ```
- **Endpoints**:
  - `GET /`: Gateway info, lists available routed prefixes.
  - `GET /health`: Uses `asyncio.gather` with a 1.5s timeout per service to ping `GET /` on all 9 backend services. Returns JSON status per service and an overall system status (`"healthy"` or `"degraded"`).
  - `@app.api_route("/api/{service}/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])`:
    - Checks if `{service}` is in `SERVICES`. If not, raises `404 Not Found` with message `"Unknown service"`.
    - Rewrites destination URL: `{SERVICES[service]}/{path}`.
    - Proxies request method, query params, headers (excluding host), and JSON body using `httpx.AsyncClient`.
    - Handles `httpx.RequestError` gracefully by returning `503 Service Unavailable` with message `"Backend service unavailable"`.

---

## 3. Inter-Service Communication Workflows

### 3.1 Workflow 1: Member Creation Validation
- **Caller**: [`members.py`](file:///D:/Khoa%2015/TON%20DUC%20THANG/gym-models/members.py) (`POST /member/create_member`)
- **Callee 1**: [`users.py`](file:///D:/Khoa%2015/TON%20DUC%20THANG/gym-models/users.py) (`GET http://127.0.0.1:8001/users/{user_id}`)
  - Validation: If user not found (HTTP 404), raises `400 Bad Request` with detail `"User with id {user_id} does not exist"`.
- **Callee 2**: [`membership_plans.py`](file:///D:/Khoa%2015/TON%20DUC%20THANG/gym-models/membership_plans.py) (`GET http://127.0.0.1:8002/membership_plans/{membership_plan_id}`)
  - Condition: Only triggered if `membership_plan_id` is not None.
  - Validation: If plan not found (HTTP 404), raises `400 Bad Request` with detail `"Membership plan {membership_plan_id} does not exist"`.
- **Result**: On success, creates and appends `Member`.

### 3.2 Workflow 2: Booking Creation & Slot Reservation
- **Caller**: [`bookings.py`](file:///D:/Khoa%2015/TON%20DUC%20THANG/gym-models/bookings.py) (`POST /booking/create_booking`)
- **Callee 1**: [`members.py`](file:///D:/Khoa%2015/TON%20DUC%20THANG/gym-models/members.py) (`GET http://127.0.0.1:8003/members/{member_id}`)
  - Validation: If member not found, raises `404 Not Found`.
  - Validation: If `member.status != 'active'`, raises `400 Bad Request` with detail `"Member is not active"`.
- **Callee 2**: [`class_slots.py`](file:///D:/Khoa%2015/TON%20DUC%20THANG/gym-models/class_slots.py) (`GET http://127.0.0.1:8005/class_slots/{slot_id}`)
  - Validation: If slot not found, raises `404 Not Found`.
  - Validation: If `slot.is_cancelled == True`, raises `400 Bad Request` with detail `"Class slot has been cancelled"`.
  - Capacity & Waitlist logic:
    - If `slot.current_bookings < slot.max_capacity`:
      - Set `status = "confirmed"`, `waitlist_position = None`.
      - Call Callee 3: `POST http://127.0.0.1:8005/class_slots/{slot_id}/increment_booking` to increment `current_bookings` by 1.
    - If `slot.current_bookings >= slot.max_capacity`:
      - Set `status = "waitlisted"`.
      - Calculate `waitlist_position` = (count of existing waitlisted bookings for this slot + 1).
- **Result**: Appends `Booking` and returns created record.

### 3.3 Workflow 3: Payment Application & Invoice Status Update
- **Caller**: [`payments.py`](file:///D:/Khoa%2015/TON%20DUC%20THANG/gym-models/payments.py) (`POST /payment/create_payment`)
- **Callee 1**: [`invoices.py`](file:///D:/Khoa%2015/TON%20DUC%20THANG/gym-models/invoices.py) (`GET http://127.0.0.1:8007/invoices/{invoice_id}`)
  - Validation: If invoice not found, raises `404 Not Found`.
  - Validation: If invoice `status == "paid"`, raises `400 Bad Request` with detail `"Invoice is already fully paid"`.
- **Callee 2**: [`invoices.py`](file:///D:/Khoa%2015/TON%20DUC%20THANG/gym-models/invoices.py) (`POST http://127.0.0.1:8007/invoices/{invoice_id}/apply_payment?paid_amount={amount}`)
  - Adds `paid_amount` to `invoice.amount_paid`.
  - If `invoice.amount_paid >= invoice.amount`: sets `invoice.status = "paid"`.
- **Result**: Appends `Payment` and returns created record.

---

## 4. Backend Service Enhancements

To support reliable inter-service calls, individual services require the following updates:
1. **[`users.py`](file:///D:/Khoa%2015/TON%20DUC%20THANG/gym-models/users.py)**:
   - `GET /users/{id}`: Return `HTTPException(status_code=404, detail="User not found")` when id does not exist.
2. **[`membership_plans.py`](file:///D:/Khoa%2015/TON%20DUC%20THANG/gym-models/membership_plans.py)**:
   - `GET /membership_plans/{id}`: Return `HTTPException(status_code=404, detail="Membership plan not found")` when id does not exist.
3. **[`members.py`](file:///D:/Khoa%2015/TON%20DUC%20THANG/gym-models/members.py)**:
   - `GET /members/{id}`: Return `HTTPException(status_code=404, detail="Member not found")` when id does not exist.
4. **[`class_slots.py`](file:///D:/Khoa%2015/TON%20DUC%20THANG/gym-models/class_slots.py)**:
   - `GET /class_slots/{id}`: Return `HTTPException(status_code=404, detail="Class slot not found")` when id does not exist.
   - Add endpoint `POST /class_slots/{id}/increment_booking`: Increments `current_bookings` by 1 and returns updated slot.
5. **[`invoices.py`](file:///D:/Khoa%2015/TON%20DUC%20THANG/gym-models/invoices.py)**:
   - `GET /invoices/{id}`: Return `HTTPException(status_code=404, detail="Invoice not found")` when id does not exist.
   - Add endpoint `POST /invoices/{id}/apply_payment`: Takes `paid_amount: float`, updates `amount_paid` and `status`.

---

## 5. Operations & Verification

### 5.1 System Startup Script (`run_all.py`)
- Spawns all 10 processes (`gateway` on 8000, 9 services on 8001-8009) via Python's standard `subprocess.Popen`.
- Monitors child processes and cleanly terminates all children upon `Ctrl + C` (SIGINT/SIGBREAK).

### 5.2 Verification Script (`test_system.py`)
- An end-to-end Python test script utilizing `httpx`:
  1. Verifies `GET http://127.0.0.1:8000/health` reports status `"healthy"` across all 9 services.
  2. Verifies reverse proxy routes forward successfully (`GET http://127.0.0.1:8000/api/users/users`).
  3. Verifies Member creation rejected with invalid `user_id=9999` (400) and accepted with valid `user_id=1`.
  4. Verifies Booking creation rejected for inactive `member_id=3` (400), accepted for active member incrementing slot bookings, and auto-waitlisted when slot is at capacity.
  5. Verifies Payment creation rejects already-paid invoice, accepts payment on pending invoice, and updates invoice `amount_paid` and `status`.
