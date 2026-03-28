import asyncio
import random

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(title="inventory_service")
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
    return {"service": "inventory_service", "status": "ok", "latency_ms": 0}


@app.get("/sim-state")
async def sim_state() -> dict:
    return {"service": "inventory_service", "fail_mode": FAIL_MODE}


@app.api_route("/toggle-failure", methods=["GET", "POST"])
async def toggle_failure(service: str | None = Query(default=None)) -> dict:
    if service is not None and service != "inventory_service":
        raise HTTPException(
            status_code=400,
            detail="Query service must be inventory_service for this host",
        )
    global FAIL_MODE
    FAIL_MODE = not FAIL_MODE
    return {"service": "inventory_service", "status": "ok", "fail_mode": FAIL_MODE}


@app.api_route("/process", methods=["GET", "POST"])
async def process() -> dict:
    latency_ms = random.randint(50, 200)
    await asyncio.sleep(latency_ms / 1000)
    if FAIL_MODE and random.random() < 0.8:
        raise HTTPException(
            status_code=500,
            detail="Inventory service failure simulated",
        )
    return {"service": "inventory_service", "status": "ok", "latency_ms": latency_ms}
