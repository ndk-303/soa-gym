import sys
import os
import httpx
from typing import Optional, Tuple
from fastapi import FastAPI, Request, Response, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from config import (
    SERVICE_MAP,
    USER_SERVICE_URL,
    MEMBERSHIP_SERVICE_URL,
    CLASS_SERVICE_URL,
    BOOKING_SERVICE_URL,
    BILLING_SERVICE_URL,
    ATTENDANCE_SERVICE_URL,
)

app = FastAPI(
    title="Gym Management API Gateway (SOA)",
    description="Unified Entry Point for Gym Management Microservices",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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

    # Preserve trailing slash if original path ended with slash and remainder is empty
    if not remainder and (clean_path.endswith("/") and not clean_path == "/"):
        remainder = "/"

    if resource in SERVICE_MAP:
        base_url, target_prefix = SERVICE_MAP[resource]
        target_path = target_prefix + remainder
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
    results = {}
    async with httpx.AsyncClient(timeout=2.0) as client:
        for name, url in services_to_check.items():
            try:
                r = await client.get(url)
                if r.status_code == 200:
                    results[name] = "UP"
                else:
                    results[name] = f"DOWN (status: {r.status_code})"
            except Exception:
                results[name] = "DOWN (connection failed)"

    return {
        "status": "UP",
        "gateway": "api-gateway",
        "services": results,
    }


@app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
async def reverse_proxy(full_path: str, request: Request):
    # Ignore favicon and docs paths from proxying
    if full_path in ("favicon.ico", "docs", "redoc", "openapi.json"):
        raise HTTPException(status_code=404, detail="Not found")

    match = match_service_url("/" + full_path)
    if not match:
        raise HTTPException(status_code=404, detail=f"No microservice registered for route '/{full_path}'")

    base_url, target_path = match
    target_url = f"{base_url}{target_path}"

    # Extract headers (filtering out host header)
    headers = {k: v for k, v in request.headers.items() if k.lower() not in ("host", "content-length")}
    params = dict(request.query_params)
    body = await request.body()

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.request(
                method=request.method,
                url=target_url,
                headers=headers,
                params=params,
                content=body,
            )

        # Return downstream response
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
