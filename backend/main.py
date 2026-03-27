import asyncio
import time
from typing import Any

import httpx
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from datetime import datetime
import pytz
import random

ist = pytz.timezone("Asia/Kolkata")

system_state = {
    "anomaly_score": 10,
    "status": "healthy",
    "root_cause": None,
    "confidence": 0.0,
    "affected_services": [],
    "timeline": [],
    "logs": [],
    "auto_fix": "idle"
}

def add_log(level, service, message):
    system_state["logs"].append({
        "level": level,
        "service": service,
        "message": message,
        "timestamp": datetime.now(ist).isoformat()
    })
    system_state["logs"] = system_state["logs"][-50:]

def add_event(event_type, service=None):
    system_state["timeline"].append({
        "type": event_type,
        "service": service,
        "timestamp": datetime.now(ist).isoformat()
    })

SERVICE_NAMES: tuple[str, ...] = (
    "api_gateway",
    "order_service",
    "payment_service",
    "inventory_service",
)
FLOW_PROCESS_URL = "http://api_gateway:8000/process"
PAYMENT_TOGGLE_FAILURE_URL = "http://payment_service:8002/toggle-failure"
PAYMENT_SIM_STATE_URL = "http://payment_service:8002/sim-state"

ALLOWED_RESTART_SERVICES: frozenset[str] = frozenset(SERVICE_NAMES)

AUTO_FIX_COOLDOWN_SEC = 10.0
last_healed: dict[str, float] = {}


class AutoFixRequest(BaseModel):
    service: str


def _service_row(name: str, status: str, latency_ms: float, error: bool) -> dict[str, Any]:
    if status == "critical":
        score = 0.9
    elif status == "degraded":
        score = 0.7
    else:
        score = 0.1
    return {
        "name": name,
        "status": status,
        "latency_ms": latency_ms,
        "error": error,
        "anomaly_score": score,
    }


def compute_rca(services: list[dict[str, Any]]) -> str:
    by_name = {item["name"]: item for item in services}
    payment = by_name.get("payment_service", {})
    order = by_name.get("order_service", {})

    if payment.get("status") == "critical":
        return "Payment Service failure detected. Order Service likely impacted."
    if order.get("status") == "degraded":
        return "Order Service slowdown likely due to Payment Service latency."
    return "All systems operating normally."


async def get_service_status() -> dict[str, Any]:
    """End-to-end check via api_gateway /process; return services list + rca_text."""
    start = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(FLOW_PROCESS_URL)
        latency_ms = round((time.perf_counter() - start) * 1000, 2)

        if not response.is_success:
            print("System failure detected", flush=True)
            add_event("failure_injected", "payment_service")
            results = [
                _service_row(n, "critical", latency_ms, True) for n in SERVICE_NAMES
            ]
            return {
                "services": results,
                "rca_text": compute_rca(results),
            }

        payload = response.json()
        if payload.get("status") != "ok":
            print("System failure detected", flush=True)
            add_event("failure_injected", "payment_service")
            results = [
                _service_row(n, "critical", latency_ms, True) for n in SERVICE_NAMES
            ]
        else:
            results = [
                _service_row(n, "healthy", latency_ms, False) for n in SERVICE_NAMES
            ]
    except Exception:
        latency_ms = round((time.perf_counter() - start) * 1000, 2)
        print("System failure detected", flush=True)
        add_event("failure_injected", "payment_service")
        results = []
        for n in SERVICE_NAMES:
            if n == "payment_service":
                results.append(_service_row(n, "critical", latency_ms, True))
            else:
                results.append(_service_row(n, "healthy", latency_ms, False))

    return {
        "services": results,
        "rca_text": compute_rca(results),
    }


async def get_payment_fail_mode() -> bool | None:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(PAYMENT_SIM_STATE_URL)
        if response.is_success:
            return bool(response.json().get("fail_mode"))
    except Exception:
        pass
    return None


async def post_toggle_payment() -> dict[str, Any]:
    start = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(PAYMENT_TOGGLE_FAILURE_URL)
        mttr_ms = round((time.perf_counter() - start) * 1000, 2)
        success = response.is_success
    except Exception:
        mttr_ms = round((time.perf_counter() - start) * 1000, 2)
        success = False

    return {
        "success": success,
        "service": "payment_service",
        "mttr_ms": mttr_ms,
    }


async def ensure_payment_fail_mode(want_failure: bool) -> dict[str, Any]:
    """Toggle payment simulation until `fail_mode` matches `want_failure` (or give up)."""
    start = time.perf_counter()

    for _ in range(5):
        current = await get_payment_fail_mode()
        if current is None:
            return {
                "success": False,
                "service": "payment_service",
                "fail_mode": None,
                "mttr_ms": round((time.perf_counter() - start) * 1000, 2),
            }
        if current is want_failure:
            return {
                "success": True,
                "service": "payment_service",
                "fail_mode": current,
                "mttr_ms": round((time.perf_counter() - start) * 1000, 2),
            }
        toggle_result = await post_toggle_payment()
        if not toggle_result["success"]:
            break

    final = await get_payment_fail_mode()
    return {
        "success": final is want_failure if final is not None else False,
        "service": "payment_service",
        "fail_mode": final,
        "mttr_ms": round((time.perf_counter() - start) * 1000, 2),
    }


async def execute_auto_fix(service: str | None = None) -> dict[str, Any]:
    """Clear payment failure simulation (best-effort; MTTR spans toggle round-trips)."""
    if service is not None and service not in ALLOWED_RESTART_SERVICES:
        return {
            "success": False,
            "service": service,
            "fail_mode": None,
            "mttr_ms": 0.0,
        }
    add_event("remediation_started", "payment_service")
    add_log("INFO", "system", "Auto-healing triggered")
    result = await ensure_payment_fail_mode(False)
    if result.get("success"):
        add_event("remediation_complete", "payment_service")
        add_log("INFO", "payment_service", "Service recovered successfully")
    return result


async def monitoring_loop() -> None:
    while True:
        await asyncio.sleep(3)
        try:
            print("Checking system flow...")
            status = await get_service_status()
            now = time.monotonic()
            critical_services = [
                svc
                for svc in status["services"]
                if svc.get("status") == "critical"
            ]
            if not critical_services:
                continue

            for svc in critical_services:
                name = svc["name"]
                if (
                    name in last_healed
                    and now - last_healed[name] < AUTO_FIX_COOLDOWN_SEC
                ):
                    print("Skipping auto-heal (cooldown active)")
                    continue

                detect_to_recovery_start = time.perf_counter()
                print("Healing allowed")
                print("Anomaly detected in system")
                add_event("anomaly_detected", "payment_service")
                add_log("WARN", "system", "Anomaly detected in system")
                print("Triggering auto-heal via service reset")
                result = await execute_auto_fix()
                last_healed[name] = time.monotonic()
                print("Auto-heal executed via service reset")
                if result["success"]:
                    elapsed_ms = round(
                        (time.perf_counter() - detect_to_recovery_start) * 1000, 2
                    )
                    print(
                        f"Self-healing completed successfully in {elapsed_ms} ms"
                    )
                break
        except Exception as exc:
            print(f"Monitoring loop error: {exc}")


def create_app() -> FastAPI:
    application = FastAPI(title="HealOps Orchestrator")

    @application.get("/", response_class=PlainTextResponse)
    def root() -> str:
        return "HealOps running"

    @application.get("/api/services/status")
    async def services_status() -> dict[str, Any]:
        return await get_service_status()

    @application.post("/api/auto-fix")
    async def auto_fix(body: AutoFixRequest) -> dict[str, Any]:
        if body.service not in ALLOWED_RESTART_SERVICES:
            raise HTTPException(status_code=400, detail="Unknown service")
        return await execute_auto_fix(body.service)

    @application.post("/api/inject-failure")
    async def inject_failure(body: AutoFixRequest) -> dict[str, Any]:
        if body.service not in ALLOWED_RESTART_SERVICES:
            raise HTTPException(status_code=400, detail="Unknown service")
        if body.service != "payment_service":
            return {
                "success": True,
                "service": body.service,
                "fail_mode": None,
                "mttr_ms": 0.0,
                "note": "Only payment_service supports simulated failure in this demo.",
            }
        result = await ensure_payment_fail_mode(True)
        if result.get("success"):
            add_event("failure_injected", "payment_service")
            add_log("ERROR", "payment_service", "Payment service failure injected")
        return result

    @application.on_event("startup")
    async def start_background_monitor() -> None:
        asyncio.create_task(monitoring_loop())

    return application


app = create_app()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/system-status")
def get_system_status():
    return {
        "status": system_state.get("status", "healthy"),
        "anomaly_score": system_state.get("anomaly_score", 10),
        "root_cause": system_state.get("root_cause", None),
        "auto_fix": system_state.get("auto_fix", "idle")
}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=9000, reload=False)


@app.get("/api/insights")
def get_insights():
    return {
        "service": system_state.get("root_cause") or "payment_service",
        "confidence": system_state.get("confidence") or 0.85,
        "rca_text": "Payment service failure causing downstream impact on order and API gateway.",
        "affected_services": system_state.get("affected_services") or ["order_service", "api_gateway"]
    }


@app.get("/api/timeline")
def get_timeline():
    return {
        "events": system_state.get("timeline", [])
    }


@app.get("/api/logs")
def get_logs():
    return {
        "logs": system_state.get("logs", [])
    }


@app.get("/api/metrics")
def get_metrics():
    data = []

    for i in range(30):
        if system_state.get("status") == "critical":
            latency = random.randint(500, 1200)
            error_rate = round(random.uniform(0.1, 0.3), 2)
        else:
            latency = random.randint(50, 200)
            error_rate = round(random.uniform(0.0, 0.05), 2)

        data.append({
            "time": i,
            "latency": latency,
            "error_rate": error_rate
        })

    return {
        "metrics": data
    }
