import sys
import os
import asyncio
import httpx
from typing import Optional, Tuple, Any, List, Dict
from contextlib import asynccontextmanager
import jwt
from fastapi import FastAPI, Request, Response, HTTPException, status, Depends, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from config import (
    settings,
    SERVICE_MAP,
    USER_SERVICE_URL,
    MEMBERSHIP_SERVICE_URL,
    CLASS_SERVICE_URL,
    BOOKING_SERVICE_URL,
    BILLING_SERVICE_URL,
    ATTENDANCE_SERVICE_URL,
)

# Shared persistent HTTP client pool
http_client: Optional[httpx.AsyncClient] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global http_client
    http_client = httpx.AsyncClient(timeout=settings.GATEWAY_HTTP_TIMEOUT)
    yield
    if http_client:
        await http_client.aclose()


security_scheme = HTTPBearer(auto_error=False)

app = FastAPI(
    title="Gym Management API Gateway (SOA)",
    description="Unified Entry Point for Gym Management Microservices with Centralized JWT Authentication",
    version="1.0.0",
    lifespan=lifespan,
    swagger_ui_parameters={"persistAuthorization": True},
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== JWT Verification & Auth Helpers ====================

def decode_jwt_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token xác thực không hợp lệ.",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def verify_jwt_token(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_scheme),
) -> dict:
    raw_token = None
    if credentials and credentials.credentials:
        raw_token = credentials.credentials
    else:
        auth_header = request.headers.get("authorization", "")
        if auth_header:
            parts = auth_header.split(" ", 1)
            if len(parts) == 2 and parts[0].lower() == "bearer":
                raw_token = parts[1].strip()
            elif len(parts) == 1 and parts[0]:
                raw_token = parts[0].strip()

    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Yêu cầu xác thực: Vui lòng cung cấp Bearer token trong header Authorization.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return decode_jwt_token(raw_token)


def require_roles(allowed_roles: List[str]):
    async def role_checker(current_user: dict = Depends(verify_jwt_token)):
        user_role = current_user.get("role")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Quyền truy cập bị từ chối: Vai trò '{user_role}' không được phép truy cập tài nguyên này.",
            )
        return current_user
    return role_checker


def is_public_path(method: str, target_path: str, clean_path: str) -> bool:
    if method == "OPTIONS":
        return True

    clean = clean_path.strip("/")
    if clean.startswith("api/"):
        clean = clean[4:].strip("/")

    if clean in ("", "health", "favicon.ico", "docs", "redoc", "openapi.json"):
        return True

    if clean.endswith("/health") or clean == "health":
        return True

    if method == "POST" and (target_path == "/users/login" or clean.endswith("/login") or clean == "login"):
        return True

    return False


def match_service_url(path: str) -> Optional[Tuple[str, str]]:
    """
    Given a request path (e.g. '/api/users/1' or '/users/1'),
    returns (service_base_url, target_path) or None if no match.
    """
    clean_path = path.strip()
    if clean_path.startswith("/api/"):
        stripped = clean_path[5:]
    elif clean_path.startswith("api/"):
        stripped = clean_path[4:]
    elif clean_path.startswith("/"):
        stripped = clean_path[1:]
    else:
        stripped = clean_path

    parts = stripped.split("/", 1)
    resource = parts[0]
    remainder = "/" + parts[1] if len(parts) > 1 else ""

    if resource in SERVICE_MAP:
        base_url, target_prefix = SERVICE_MAP[resource]
        combined = target_prefix + remainder
        target_path = combined.rstrip("/") if combined != "/" else "/"
        return base_url, target_path

    return None


@app.get("/")
async def root():
    return {
        "message": "He Thong Quan Ly Gym (FastAPI + Microservices API Gateway)",
        "gateway_version": "1.0.0",
        "docs_url": "/docs",
        "health_url": "/health",
    }


@app.get("/health")
async def health_check():
    services_to_check = {
        "user-service": f"{USER_SERVICE_URL}/health",
        "membership-service": f"{MEMBERSHIP_SERVICE_URL}/health",
        "class-service": f"{CLASS_SERVICE_URL}/health",
        "booking-service": f"{BOOKING_SERVICE_URL}/health",
        "billing-service": f"{BILLING_SERVICE_URL}/health",
        "attendance-service": f"{ATTENDANCE_SERVICE_URL}/health",
    }

    client = http_client if http_client is not None else httpx.AsyncClient(timeout=2.0)
    should_close = http_client is None

    async def check_single(name: str, url: str):
        try:
            r = await client.get(url, timeout=2.0)
            if r.status_code == 200:
                return name, "UP"
            return name, f"DOWN (status: {r.status_code})"
        except Exception:
            return name, "DOWN (connection failed)"

    try:
        tasks = [check_single(name, url) for name, url in services_to_check.items()]
        results = dict(await asyncio.gather(*tasks))
    finally:
        if should_close:
            await client.aclose()

    return {
        "status": "UP",
        "gateway": "api-gateway",
        "services": results,
    }


@app.get("/api/auth/me", tags=["Auth"])
async def get_current_user_profile(current_user: dict = Depends(verify_jwt_token)):
    """
    Returns the currently authenticated user claims.
    """
    return {
        "id": current_user.get("sub"),
        "email": current_user.get("email"),
        "role": current_user.get("role"),
    }


# ==================== Composite Aggregator Helpers & Endpoints ====================

def get_proxy_client() -> Tuple[httpx.AsyncClient, bool]:
    if http_client is not None:
        return http_client, False
    return httpx.AsyncClient(timeout=10.0), True


async def fetch_json(client: httpx.AsyncClient, url: str) -> Any:
    try:
        r = await client.get(url, timeout=5.0)
        if r.status_code == 200:
            return r.json()
        return None
    except Exception:
        return None


@app.get("/api/composite/bookings")
async def composite_bookings(current_user: dict = Depends(verify_jwt_token)):
    client, should_close = get_proxy_client()
    try:
        tasks = [
            fetch_json(client, f"{BOOKING_SERVICE_URL}/bookings"),
            fetch_json(client, f"{MEMBERSHIP_SERVICE_URL}/members"),
            fetch_json(client, f"{CLASS_SERVICE_URL}/class-slots"),
            fetch_json(client, f"{CLASS_SERVICE_URL}/gym-classes"),
        ]
        bookings_data, members_data, slots_data, classes_data = await asyncio.gather(*tasks)

        member_map = {m["id"]: m for m in (members_data or []) if isinstance(m, dict) and "id" in m}
        class_map = {c["id"]: c for c in (classes_data or []) if isinstance(c, dict) and "id" in c}

        slot_map = {}
        for s in (slots_data or []):
            if isinstance(s, dict) and "id" in s:
                s_copy = dict(s)
                s_copy["class"] = class_map.get(s.get("class_id"))
                slot_map[s["id"]] = s_copy

        enriched_bookings = []
        for b in (bookings_data or []):
            if isinstance(b, dict):
                b_copy = dict(b)
                b_copy["member"] = member_map.get(b.get("member_id"))
                b_copy["slot"] = slot_map.get(b.get("slot_id"))
                enriched_bookings.append(b_copy)

        return enriched_bookings
    finally:
        if should_close:
            await client.aclose()


@app.get("/api/composite/invoices")
async def composite_invoices(current_user: dict = Depends(verify_jwt_token)):
    client, should_close = get_proxy_client()
    try:
        tasks = [
            fetch_json(client, f"{BILLING_SERVICE_URL}/invoices"),
            fetch_json(client, f"{MEMBERSHIP_SERVICE_URL}/members"),
        ]
        invoices_data, members_data = await asyncio.gather(*tasks)

        member_map = {m["id"]: m for m in (members_data or []) if isinstance(m, dict) and "id" in m}

        enriched_invoices = []
        for inv in (invoices_data or []):
            if isinstance(inv, dict):
                inv_copy = dict(inv)
                inv_copy["member"] = member_map.get(inv.get("member_id"))
                enriched_invoices.append(inv_copy)

        return enriched_invoices
    finally:
        if should_close:
            await client.aclose()


@app.get("/api/composite/payments")
async def composite_payments(current_user: dict = Depends(verify_jwt_token)):
    client, should_close = get_proxy_client()
    try:
        tasks = [
            fetch_json(client, f"{BILLING_SERVICE_URL}/payments"),
            fetch_json(client, f"{BILLING_SERVICE_URL}/invoices"),
            fetch_json(client, f"{MEMBERSHIP_SERVICE_URL}/members"),
        ]
        payments_data, invoices_data, members_data = await asyncio.gather(*tasks)

        member_map = {m["id"]: m for m in (members_data or []) if isinstance(m, dict) and "id" in m}

        invoice_map = {}
        for inv in (invoices_data or []):
            if isinstance(inv, dict) and "id" in inv:
                inv_copy = dict(inv)
                inv_copy["member"] = member_map.get(inv.get("member_id"))
                invoice_map[inv["id"]] = inv_copy

        enriched_payments = []
        for p in (payments_data or []):
            if isinstance(p, dict):
                p_copy = dict(p)
                linked_inv = invoice_map.get(p.get("invoice_id"))
                p_copy["invoice"] = linked_inv
                p_copy["member"] = linked_inv.get("member") if linked_inv else None
                enriched_payments.append(p_copy)

        return enriched_payments
    finally:
        if should_close:
            await client.aclose()


@app.get("/api/composite/attendance")
async def composite_attendance(current_user: dict = Depends(verify_jwt_token)):
    client, should_close = get_proxy_client()
    try:
        tasks = [
            fetch_json(client, f"{ATTENDANCE_SERVICE_URL}/attendance"),
            fetch_json(client, f"{MEMBERSHIP_SERVICE_URL}/members"),
        ]
        attendance_data, members_data = await asyncio.gather(*tasks)

        member_map = {m["id"]: m for m in (members_data or []) if isinstance(m, dict) and "id" in m}

        enriched_attendance = []
        for a in (attendance_data or []):
            if isinstance(a, dict):
                a_copy = dict(a)
                a_copy["member"] = member_map.get(a.get("member_id"))
                enriched_attendance.append(a_copy)

        return enriched_attendance
    finally:
        if should_close:
            await client.aclose()


@app.get("/api/composite/classes")
async def composite_classes(current_user: dict = Depends(verify_jwt_token)):
    client, should_close = get_proxy_client()
    try:
        tasks = [
            fetch_json(client, f"{CLASS_SERVICE_URL}/gym-classes"),
            fetch_json(client, f"{USER_SERVICE_URL}/users"),
        ]
        classes_data, users_data = await asyncio.gather(*tasks)

        user_map = {u["id"]: u for u in (users_data or []) if isinstance(u, dict) and "id" in u}

        enriched_classes = []
        for c in (classes_data or []):
            if isinstance(c, dict):
                c_copy = dict(c)
                c_copy["trainer"] = user_map.get(c.get("trainer_id"))
                enriched_classes.append(c_copy)

        return enriched_classes
    finally:
        if should_close:
            await client.aclose()


@app.get("/api/composite/members")
async def composite_members(current_user: dict = Depends(verify_jwt_token)):
    client, should_close = get_proxy_client()
    try:
        tasks = [
            fetch_json(client, f"{MEMBERSHIP_SERVICE_URL}/members"),
            fetch_json(client, f"{USER_SERVICE_URL}/users"),
            fetch_json(client, f"{MEMBERSHIP_SERVICE_URL}/membership-plans"),
        ]
        members_data, users_data, plans_data = await asyncio.gather(*tasks)

        user_map = {u["id"]: u for u in (users_data or []) if isinstance(u, dict) and "id" in u}
        plan_map = {p["id"]: p for p in (plans_data or []) if isinstance(p, dict) and "id" in p}

        enriched_members = []
        for m in (members_data or []):
            if isinstance(m, dict):
                m_copy = dict(m)
                m_copy["user"] = user_map.get(m.get("user_id"))
                m_copy["membership_plan"] = plan_map.get(m.get("membership_plan_id"))
                enriched_members.append(m_copy)

        return enriched_members
    finally:
        if should_close:
            await client.aclose()


@app.get("/api/composite/slots")
async def composite_slots(current_user: dict = Depends(verify_jwt_token)):
    client, should_close = get_proxy_client()
    try:
        tasks = [
            fetch_json(client, f"{CLASS_SERVICE_URL}/class-slots"),
            fetch_json(client, f"{CLASS_SERVICE_URL}/gym-classes"),
        ]
        slots_data, classes_data = await asyncio.gather(*tasks)

        class_map = {c["id"]: c for c in (classes_data or []) if isinstance(c, dict) and "id" in c}

        enriched_slots = []
        for s in (slots_data or []):
            if isinstance(s, dict):
                s_copy = dict(s)
                s_copy["class"] = class_map.get(s.get("class_id"))
                enriched_slots.append(s_copy)

        return enriched_slots
    finally:
        if should_close:
            await client.aclose()


# ==================== Reverse Proxy with Auth Verification ====================

@app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
async def reverse_proxy(
    full_path: str,
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_scheme),
):
    # Ignore favicon and docs paths from proxying
    if full_path in ("favicon.ico", "docs", "redoc", "openapi.json"):
        raise HTTPException(status_code=404, detail="Not found")

    match = match_service_url("/" + full_path)
    if not match:
        raise HTTPException(status_code=404, detail=f"No microservice registered for route '/{full_path}'")

    base_url, target_path = match
    target_url = f"{base_url}{target_path}"

    headers = {k: v for k, v in request.headers.items() if k.lower() not in ("host", "content-length")}
    params = dict(request.query_params)
    body = await request.body()

    # Authentication verification check
    if not is_public_path(request.method, target_path, full_path):
        user_claims = await verify_jwt_token(request, credentials)
        # Inject verified identity into downstream headers
        headers["x-user-id"] = str(user_claims.get("sub", ""))
        headers["x-user-email"] = str(user_claims.get("email", ""))
        headers["x-user-role"] = str(user_claims.get("role", ""))

    client = http_client if http_client is not None else httpx.AsyncClient(timeout=10.0)
    should_close = http_client is None

    try:
        resp = await client.request(
            method=request.method,
            url=target_url,
            headers=headers,
            params=params,
            content=body,
        )

        filtered_headers = {
            k: v for k, v in resp.headers.items()
            if k.lower() not in ("content-length", "content-encoding", "transfer-encoding")
        }
        return Response(
            content=resp.content,
            status_code=resp.status_code,
            headers=filtered_headers,
            media_type=resp.headers.get("content-type"),
        )
    except (httpx.ConnectError, httpx.ConnectTimeout):
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "detail": f"Microservice at '{base_url}' is currently unavailable. Please verify the service is running."
            },
        )
    except httpx.HTTPError as exc:
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content={"detail": f"Gateway proxy error: {str(exc)}"},
        )
    finally:
        if should_close:
            await client.aclose()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.GATEWAY_HOST, port=settings.GATEWAY_PORT, reload=settings.ENVIRONMENT == "development")
