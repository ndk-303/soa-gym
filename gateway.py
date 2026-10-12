import asyncio
from typing import Dict, Any

import httpx
from fastapi import FastAPI, Request, Response, HTTPException

app = FastAPI(title="Gym API Gateway", version="1.0.0")

SERVICES: Dict[str, str] = {
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


@app.get("/")
async def root():
    return {
        "message": "Gym API Gateway",
        "description": "Unified entry point for Gym Microservices",
        "services": list(SERVICES.keys()),
        "endpoints": {
            "health": "/health",
            "proxy_pattern": "/api/{service}/{path}"
        }
    }


async def check_service_health(name: str, base_url: str) -> Dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=1.5) as client:
            res = await client.get(f"{base_url}/")
            if res.status_code == 200:
                return {"name": name, "status": "UP", "url": base_url}
            return {"name": name, "status": "DOWN", "url": base_url, "code": res.status_code}
    except Exception:
        return {"name": name, "status": "DOWN", "url": base_url}


@app.get("/health")
async def health():
    tasks = [check_service_health(name, url) for name, url in SERVICES.items()]
    results = await asyncio.gather(*tasks)
    all_up = all(r["status"] == "UP" for r in results)
    return {
        "status": "healthy" if all_up else "degraded",
        "services": results
    }


async def send_proxy_request(client: httpx.AsyncClient, req: httpx.Request) -> httpx.Response:
    return await client.send(req)


@app.api_route("/api/{service}/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def reverse_proxy(service: str, path: str, request: Request):
    if service not in SERVICES:
        raise HTTPException(status_code=404, detail=f"Unknown service '{service}'")

    target_url = f"{SERVICES[service]}/{path}"

    headers = {k: v for k, v in request.headers.items() if k.lower() != "host"}
    body = await request.body()

    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            req = client.build_request(
                method=request.method,
                url=target_url,
                params=dict(request.query_params),
                headers=headers,
                content=body
            )
            response = await send_proxy_request(client, req)

            excluded_headers = {"content-encoding", "content-length", "transfer-encoding", "connection"}
            forward_headers = {k: v for k, v in response.headers.items() if k.lower() not in excluded_headers}

            return Response(
                content=response.content,
                status_code=response.status_code,
                headers=forward_headers,
                media_type=response.headers.get("content-type")
            )
    except httpx.RequestError:
        raise HTTPException(
            status_code=503,
            detail=f"Backend service '{service}' at {SERVICES[service]} is unavailable"
        )
