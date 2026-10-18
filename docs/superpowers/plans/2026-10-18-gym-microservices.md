# Gym Microservices Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor monolithic backend `gym-models` into a Share-Nothing Microservices architecture with 6 independent FastAPI services (each with its own SQLite database) and 1 central API Gateway supporting standardized `/api/...` endpoints and legacy aliases.

**Architecture:** 6 microservices running on dedicated ports (8001–8006) using FastAPI and SQLAlchemy with individual SQLite files, fronted by an API Gateway running on port 8000 using HTTPX async proxy for routing and error handling, orchestrated via a single multi-process runner script (`run_all.py`).

**Tech Stack:** FastAPI, Uvicorn, SQLAlchemy, SQLite, Pydantic, HTTPX, Python 3.10+, PowerShell / Windows Batch

**Spec:** `docs/superpowers/specs/2026-10-18-gym-microservices-design.md`

## Global Constraints

- **Python Version & Packages:** Python 3.10+, `fastapi`, `uvicorn`, `sqlalchemy`, `pydantic`, `httpx`.
- **Database Architecture:** Pure Database-per-service using SQLite. Each service creates its own `.db` file in its folder.
- **Port Allocation:** Gateway: 8000; User: 8001; Membership: 8002; Class: 8003; Booking: 8004; Billing: 8005; Attendance: 8006.
- **Endpoint Naming:** Standardized on Gateway as `/api/{resource}` (no `/v1` prefix), with legacy aliases `/{resource}` to maintain 100% compatibility with existing React frontend.
- **Logic & Schema Preservation:** All Pydantic request models (`*_Request`), validations, and seed data must be preserved verbatim from `gym-models/main.py`.

## Review Focus

- Trailing slash mismatch: Clients calling `/users/` or `/users` must both resolve cleanly without 307 redirect loops or 404s.
- Service unavailability: When any microservice is stopped, Gateway must return HTTP 503 with a structured JSON error instead of crashing or hanging.
- Database isolation: No cross-database joins or shared database files between services; foreign keys are logical integers.
- Multi-process cleanup: Terminating `run_all.py` via `Ctrl+C` must kill all 7 child processes cleanly without leaving background port listeners.
- Frontend backward-compatibility: The existing React frontend at port 5173 must load data and perform CRUD on all 9 screens through port 8000 with zero frontend code changes.

---

### Task 1: Scaffolding Directory Tree & Requirements

**Files:**
- Create: `gym-models/requirements.txt`
- Create directories: `gym-models/api-gateway`, `gym-models/services/user-service`, `gym-models/services/membership-service`, `gym-models/services/class-service`, `gym-models/services/booking-service`, `gym-models/services/billing-service`, `gym-models/services/attendance-service`

**Interfaces:**
- Consumes: None
- Produces: Project folder structure and dependency manifest for all services.

- [ ] **Step 1: Create `gym-models/requirements.txt`**
  Add dependencies:
  ```text
  fastapi>=0.100.0
  uvicorn[standard]>=0.23.0
  sqlalchemy>=2.0.0
  pydantic>=2.0.0
  httpx>=0.25.0
  ```

- [ ] **Step 2: Scaffold directory tree**
  Create service and gateway folders inside `gym-models/`.

- [ ] **Step 3: Verify Python environment has required packages installed**
  Run: `python -c "import fastapi, uvicorn, sqlalchemy, pydantic, httpx; print('ALL_DEPS_OK')"`
  Expected: `ALL_DEPS_OK` (or install missing packages via pip).

---

### Task 2: Implement User Service (Port 8001)

**Files:**
- Create: `gym-models/services/user-service/database.py`
- Create: `gym-models/services/user-service/models.py`
- Create: `gym-models/services/user-service/schemas.py`
- Create: `gym-models/services/user-service/main.py`
- Test: `gym-models/services/user-service/test_user_service.py`

**Interfaces:**
- Consumes: None
- Produces: `User` CRUD API at `http://127.0.0.1:8001/users` and `http://127.0.0.1:8001/users/{id}`

- [ ] **Step 1: Write test for User Service CRUD**
  Create `test_user_service.py` using `TestClient(app)` verifying:
  - `GET /users` returns initial seeded users (3 users).
  - `POST /users` creates a new user.
  - `GET /users/{id}` retrieves the user.
  - `PUT /users/{id}` updates the user.
  - `DELETE /users/{id}` deletes the user.

- [ ] **Step 2: Run test to verify it fails before implementation**
  Run: `python -m pytest gym-models/services/user-service/test_user_service.py`
  Expected: FAIL (modules not implemented yet)

- [ ] **Step 3: Implement `database.py`, `models.py`, `schemas.py`, and `main.py`**
  - `database.py`: SQLite engine `sqlite:///./user.db`, `SessionLocal`, `Base = declarative_base()`, `get_db()` dependency.
  - `models.py`: `User` model (`id`, `email`, `role`, `password`, `is_active`).
  - `schemas.py`: `User_Request` (from existing `main.py`).
  - `main.py`: FastAPI app with CORS, startup event to create tables & seed 3 users if empty, endpoints `/users` (GET, POST) and `/users/{id}` (GET, PUT, DELETE).

- [ ] **Step 4: Run test to verify it passes**
  Run: `python -m pytest gym-models/services/user-service/test_user_service.py -v`
  Expected: 5 passed.

---

### Task 3: Implement Membership Service (Port 8002)

**Files:**
- Create: `gym-models/services/membership-service/database.py`
- Create: `gym-models/services/membership-service/models.py`
- Create: `gym-models/services/membership-service/schemas.py`
- Create: `gym-models/services/membership-service/main.py`
- Test: `gym-models/services/membership-service/test_membership_service.py`

**Interfaces:**
- Consumes: None
- Produces: `MembershipPlan` CRUD at `/membership-plans` and `Member` CRUD at `/members` on port 8002.

- [ ] **Step 1: Write test for Membership Service**
  Create `test_membership_service.py` testing:
  - `GET /membership-plans` returns 3 seeded plans.
  - `POST /membership-plans` creates a new plan.
  - `GET /members` returns 1 seeded member.
  - `POST /members`, `PUT /members/{id}`, `DELETE /members/{id}`.

- [ ] **Step 2: Run test to verify it fails**
  Run: `python -m pytest gym-models/services/membership-service/test_membership_service.py`
  Expected: FAIL

- [ ] **Step 3: Implement `database.py`, `models.py`, `schemas.py`, and `main.py`**
  - `database.py`: `sqlite:///./membership.db`.
  - `models.py`: `MembershipPlan` and `Member`.
  - `schemas.py`: `MembershipPlan_Request` and `Member_Request`.
  - `main.py`: Endpoints for `/membership-plans` and `/members`, startup seed data for both tables.

- [ ] **Step 4: Run test to verify it passes**
  Run: `python -m pytest gym-models/services/membership-service/test_membership_service.py -v`
  Expected: PASS.

---

### Task 4: Implement Class Service (Port 8003)

**Files:**
- Create: `gym-models/services/class-service/database.py`
- Create: `gym-models/services/class-service/models.py`
- Create: `gym-models/services/class-service/schemas.py`
- Create: `gym-models/services/class-service/main.py`
- Test: `gym-models/services/class-service/test_class_service.py`

**Interfaces:**
- Consumes: None
- Produces: `GymClass` CRUD at `/gym-classes` and `ClassSlot` CRUD at `/class-slots` on port 8003.

- [ ] **Step 1: Write test for Class Service**
  Create `test_class_service.py` testing:
  - `GET /gym-classes` returns 2 seeded classes.
  - `GET /class-slots` returns 1 seeded slot.
  - CRUD operations on classes and slots.

- [ ] **Step 2: Run test to verify it fails**
  Run: `python -m pytest gym-models/services/class-service/test_class_service.py`
  Expected: FAIL

- [ ] **Step 3: Implement `database.py`, `models.py`, `schemas.py`, and `main.py`**
  - `database.py`: `sqlite:///./class.db`.
  - `models.py`: `GymClass` and `ClassSlot`.
  - `schemas.py`: `GymClass_Request` and `ClassSlot_Request`.
  - `main.py`: Full CRUD for `/gym-classes` and `/class-slots`, startup seed data.

- [ ] **Step 4: Run test to verify it passes**
  Run: `python -m pytest gym-models/services/class-service/test_class_service.py -v`
  Expected: PASS.

---

### Task 5: Implement Booking Service (Port 8004)

**Files:**
- Create: `gym-models/services/booking-service/database.py`
- Create: `gym-models/services/booking-service/models.py`
- Create: `gym-models/services/booking-service/schemas.py`
- Create: `gym-models/services/booking-service/main.py`
- Test: `gym-models/services/booking-service/test_booking_service.py`

**Interfaces:**
- Consumes: None
- Produces: `Booking` CRUD at `/bookings` on port 8004.

- [ ] **Step 1: Write test for Booking Service**
  Create `test_booking_service.py` testing:
  - `GET /bookings` returns seeded booking.
  - `POST /bookings`, `PUT /bookings/{id}`, `DELETE /bookings/{id}`.

- [ ] **Step 2: Run test to verify it fails**
  Run: `python -m pytest gym-models/services/booking-service/test_booking_service.py`
  Expected: FAIL

- [ ] **Step 3: Implement `database.py`, `models.py`, `schemas.py`, and `main.py`**
  - `database.py`: `sqlite:///./booking.db`.
  - `models.py`: `Booking`.
  - `schemas.py`: `Booking_Request`.
  - `main.py`: CRUD for `/bookings`, startup seed data.

- [ ] **Step 4: Run test to verify it passes**
  Run: `python -m pytest gym-models/services/booking-service/test_booking_service.py -v`
  Expected: PASS.

---

### Task 6: Implement Billing Service (Port 8005)

**Files:**
- Create: `gym-models/services/billing-service/database.py`
- Create: `gym-models/services/billing-service/models.py`
- Create: `gym-models/services/billing-service/schemas.py`
- Create: `gym-models/services/billing-service/main.py`
- Test: `gym-models/services/billing-service/test_billing_service.py`

**Interfaces:**
- Consumes: None
- Produces: `Invoice` CRUD at `/invoices` and `Payment` CRUD at `/payments` on port 8005.

- [ ] **Step 1: Write test for Billing Service**
  Create `test_billing_service.py` testing:
  - `GET /invoices` returns seeded invoices.
  - `GET /payments` returns seeded payments.
  - CRUD operations for invoices and payments.

- [ ] **Step 2: Run test to verify it fails**
  Run: `python -m pytest gym-models/services/billing-service/test_billing_service.py`
  Expected: FAIL

- [ ] **Step 3: Implement `database.py`, `models.py`, `schemas.py`, and `main.py`**
  - `database.py`: `sqlite:///./billing.db`.
  - `models.py`: `Invoice` and `Payment`.
  - `schemas.py`: `Invoice_Request` and `Payment_Request`.
  - `main.py`: CRUD for `/invoices` and `/payments`, startup seed data.

- [ ] **Step 4: Run test to verify it passes**
  Run: `python -m pytest gym-models/services/billing-service/test_billing_service.py -v`
  Expected: PASS.

---

### Task 7: Implement Attendance Service (Port 8006)

**Files:**
- Create: `gym-models/services/attendance-service/database.py`
- Create: `gym-models/services/attendance-service/models.py`
- Create: `gym-models/services/attendance-service/schemas.py`
- Create: `gym-models/services/attendance-service/main.py`
- Test: `gym-models/services/attendance-service/test_attendance_service.py`

**Interfaces:**
- Consumes: None
- Produces: `AttendanceRecord` CRUD at `/attendance` on port 8006.

- [ ] **Step 1: Write test for Attendance Service**
  Create `test_attendance_service.py` testing:
  - `GET /attendance` returns seeded attendance record.
  - `POST /attendance`, `PUT /attendance/{id}`, `DELETE /attendance/{id}`.

- [ ] **Step 2: Run test to verify it fails**
  Run: `python -m pytest gym-models/services/attendance-service/test_attendance_service.py`
  Expected: FAIL

- [ ] **Step 3: Implement `database.py`, `models.py`, `schemas.py`, and `main.py`**
  - `database.py`: `sqlite:///./attendance.db`.
  - `models.py`: `AttendanceRecord`.
  - `schemas.py`: `Attendance_Request`.
  - `main.py`: CRUD for `/attendance`, startup seed data.

- [ ] **Step 4: Run test to verify it passes**
  Run: `python -m pytest gym-models/services/attendance-service/test_attendance_service.py -v`
  Expected: PASS.

---

### Task 8: Implement API Gateway (Port 8000)

**Files:**
- Create: `gym-models/api-gateway/config.py`
- Create: `gym-models/api-gateway/main.py`
- Test: `gym-models/api-gateway/test_gateway.py`

**Interfaces:**
- Consumes: All 6 microservices at ports 8001–8006.
- Produces: Unified API Gateway at `http://127.0.0.1:8000`, handling `/api/...` and legacy alias routes, CORS middleware, `/health` endpoint, and Swagger UI at `/docs`.

- [ ] **Step 1: Write unit tests for API Gateway routing & error handling**
  Create `test_gateway.py` with mock / client tests verifying:
  - Forwarding `/api/users` and `/users` to User Service.
  - Forwarding `/api/attendances` and `/attendance` to Attendance Service.
  - Graceful 503 response when backend service is unreachable.
  - Health check endpoint `/health`.

- [ ] **Step 2: Run test to verify it fails**
  Run: `python -m pytest gym-models/api-gateway/test_gateway.py`
  Expected: FAIL

- [ ] **Step 3: Implement `config.py` and `main.py`**
  - `config.py`: Service registry mapping resource prefixes to target base URLs (`USER_SERVICE_URL="http://127.0.0.1:8001"`, etc.).
  - `main.py`:
    - Async HTTP proxy function using `httpx.AsyncClient`.
    - Handles GET, POST, PUT, DELETE, path params, query params, headers, and request body.
    - Strips / normalizes trailing slashes.
    - Mounts both `/api/{resource}` and legacy `/{resource}`.
    - Adds CORS middleware for all origins.
    - Implements `GET /health` checking Gateway status and service reachability.

- [ ] **Step 4: Run test to verify it passes**
  Run: `python -m pytest gym-models/api-gateway/test_gateway.py -v`
  Expected: PASS.

---

### Task 9: System Orchestration & End-to-End Verification

**Files:**
- Create: `gym-models/run_all.py`
- Create: `gym-models/run_all.bat`
- Create: `gym-models/test_e2e_system.py`

**Interfaces:**
- Consumes: All 6 services and Gateway.
- Produces: Single-command startup and end-to-end integration test suite.

- [ ] **Step 1: Implement `run_all.py`**
  - Uses `subprocess.Popen` to launch 6 services (ports 8001–8006) and Gateway (port 8000) using `uvicorn`.
  - Formatted console logging showing status and port for each service.
  - Handles `KeyboardInterrupt` (`Ctrl+C`) to terminate all child processes cleanly without hanging.

- [ ] **Step 2: Implement `run_all.bat`**
  - Batch script running `python run_all.py`.

- [ ] **Step 3: Implement E2E test `test_e2e_system.py`**
  - Launches all services, tests CRUD for each model through Gateway port 8000 (both `/api/...` and legacy alias routes), validates responses, and terminates services cleanly.

- [ ] **Step 4: Run E2E test to verify complete system**
  Run: `python -m pytest gym-models/test_e2e_system.py -v`
  Expected: All E2E tests PASS.

- [ ] **Step 5: Verify Frontend Compatibility**
  - Ensure Frontend at `http://localhost:5173` loads without CORS or 404 errors, communicating directly with Gateway at `http://127.0.0.1:8000`.
