import asyncio
import random

import httpx
from fastapi import FastAPI


app = FastAPI(title="api_gateway")


@app.get("/health")
async def health() -> dict:
    return {"service": "api_gateway", "status": "ok", "latency_ms": 0}


@app.api_route("/process", methods=["GET", "POST"])
async def process() -> dict:
    latency_ms = random.randint(50, 200)
    await asyncio.sleep(latency_ms / 1000)
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
