import asyncio
import random

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(title="api_gateway")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
FAIL_MODE = False


@app.get("/health")
async def health() -> dict:
    return {"service": "api_gateway", "status": "ok", "latency_ms": 0}


@app.get("/sim-state")
async def sim_state() -> dict:
    return {"service": "api_gateway", "fail_mode": FAIL_MODE}


@app.api_route("/toggle-failure", methods=["GET", "POST"])
async def toggle_failure(service: str | None = Query(default=None)) -> dict:
    if service is not None and service != "api_gateway":
        raise HTTPException(
            status_code=400,
            detail="Query service must be api_gateway for this host",
        )
    global FAIL_MODE
    FAIL_MODE = not FAIL_MODE
    return {"service": "api_gateway", "status": "ok", "fail_mode": FAIL_MODE}


@app.api_route("/process", methods=["GET", "POST"])
async def process() -> dict:
    latency_ms = random.randint(50, 200)
    await asyncio.sleep(latency_ms / 1000)
    if FAIL_MODE and random.random() < 0.8:
        raise HTTPException(
            status_code=500,
            detail="API Gateway failure simulated",
        )
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            downstream = await client.post("http://order_service:8001/process")
        downstream.raise_for_status()
        downstream_data = downstream.json()
        if downstream_data.get("status") != "ok":
            return {
                "service": "api_gateway",
                "status": "failed",
                "latency_ms": latency_ms,
                "error": "order_service returned failure",
            }
    except Exception as exc:
        return {
            "service": "api_gateway",
            "status": "failed",
            "latency_ms": latency_ms,
            "error": str(exc),
        }

    return {"service": "api_gateway", "status": "ok", "latency_ms": latency_ms}
