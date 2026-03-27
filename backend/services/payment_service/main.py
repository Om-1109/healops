import asyncio
import random

import httpx
from fastapi import FastAPI, HTTPException


app = FastAPI(title="payment_service")
FAIL_MODE = False


@app.get("/health")
async def health() -> dict:
    return {"service": "payment_service", "status": "ok", "latency_ms": 0}


@app.get("/sim-state")
async def sim_state() -> dict:
    """Current payment failure simulation flag (for orchestrator dashboards)."""
    return {"service": "payment_service", "fail_mode": FAIL_MODE}


@app.api_route("/toggle-failure", methods=["GET", "POST"])
async def toggle_failure() -> dict:
    global FAIL_MODE
    FAIL_MODE = not FAIL_MODE
    return {"service": "payment_service", "status": "ok", "fail_mode": FAIL_MODE}


@app.api_route("/process", methods=["GET", "POST"])
async def process() -> dict:
    latency_ms = random.randint(50, 200)
    await asyncio.sleep(latency_ms / 1000)
    if FAIL_MODE and random.random() < 0.8:
        raise HTTPException(
            status_code=500,
            detail="Payment service failure simulated",
        )
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            downstream = await client.post("http://inventory_service:8003/process")
        downstream.raise_for_status()
        downstream_data = downstream.json()
        if downstream_data.get("status") != "ok":
            return {
                "service": "payment_service",
                "status": "failed",
                "latency_ms": latency_ms,
                "error": "inventory_service returned failure",
            }
    except Exception as exc:
        return {
            "service": "payment_service",
            "status": "failed",
            "latency_ms": latency_ms,
            "error": str(exc),
        }

    return {"service": "payment_service", "status": "ok", "latency_ms": latency_ms}
