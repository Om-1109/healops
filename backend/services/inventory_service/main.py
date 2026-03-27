import asyncio
import random

from fastapi import FastAPI


app = FastAPI(title="inventory_service")


@app.get("/health")
async def health() -> dict:
    return {"service": "inventory_service", "status": "ok", "latency_ms": 0}


@app.api_route("/process", methods=["GET", "POST"])
async def process() -> dict:
    latency_ms = random.randint(50, 200)
    await asyncio.sleep(latency_ms / 1000)
    return {"service": "inventory_service", "status": "ok", "latency_ms": latency_ms}
