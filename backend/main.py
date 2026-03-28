import asyncio
import time
from typing import Any

import httpx
import uvicorn
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from datetime import datetime
import pytz
import random

ist = pytz.timezone("Asia/Kolkata")

# Single source of truth for the active incident's failing service (RCA, timeline, remediation).
current_root_cause: str | None = None

# Orchestrator-facing anomaly gauge (0–100); aligned with probe + inject/recovery lifecycle.
BASELINE_ANOMALY_SCORE = 10
INJECT_ANOMALY_SCORE = 85
# Stable “elevated” band when an incident is already critical (optional refinement; no per-tick random).
ANOMALY_ELEVATED_SCORE = 88

current_anomaly_score = BASELINE_ANOMALY_SCORE

system_state = {
    "anomaly_score": BASELINE_ANOMALY_SCORE,
    "status": "healthy",
    "root_cause": None,
    "confidence": 0.0,
    "affected_services": [],
    "timeline": [],
    "logs": [],
    "auto_fix": "idle",
}


def set_anomaly_score(value: int) -> None:
    """Clamp to 0–100 and mirror into ``system_state`` for API consumers."""
    global current_anomaly_score
    current_anomaly_score = max(0, min(100, int(value)))
    system_state["anomaly_score"] = current_anomaly_score


def set_current_root_cause(svc: str | None) -> None:
    global current_root_cause
    current_root_cause = svc
    system_state["root_cause"] = svc
    if svc:
        system_state["confidence"] = 0.85
        system_state["affected_services"] = affected_services_for(svc)
    else:
        system_state["confidence"] = 0.0
        system_state["affected_services"] = []


def add_log(level, service, message):
    system_state["logs"].append(
        {
            "level": level,
            "service": service,
            "message": message,
            "timestamp": datetime.now(ist).isoformat(),
        }
    )
    system_state["logs"] = system_state["logs"][-50:]


def add_event(event_type, service=None):
    system_state["timeline"].append(
        {
            "type": event_type,
            "service": service,
            "timestamp": datetime.now(ist).isoformat(),
        }
    )


SERVICE_NAMES: tuple[str, ...] = (
    "api_gateway",
    "order_service",
    "payment_service",
    "inventory_service",
)

# Request flow order (gateway → … → inventory) for downstream impact lists.
SERVICE_FLOW_ORDER: tuple[str, ...] = SERVICE_NAMES

SERVICE_INTERNAL_BASE: dict[str, str] = {
    "api_gateway": "http://api_gateway:8000",
    "order_service": "http://order_service:8001",
    "payment_service": "http://payment_service:8002",
    "inventory_service": "http://inventory_service:8003",
}

FLOW_PROCESS_URL = f"{SERVICE_INTERNAL_BASE['api_gateway']}/process"

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


def affected_services_for(failing: str) -> list[str]:
    """Downstream services in the demo flow that may observe impact."""
    try:
        idx = SERVICE_FLOW_ORDER.index(failing)
    except ValueError:
        return list(SERVICE_FLOW_ORDER[1:])
    downstream = list(SERVICE_FLOW_ORDER[idx + 1 :])
    return downstream


def compute_rca(services: list[dict[str, Any]], root_hint: str | None) -> str:
    root = root_hint or current_root_cause
    by_name = {item["name"]: item for item in services}
    if root and by_name.get(root, {}).get("status") == "critical":
        return f"{root} failure detected. Downstream services may be impacted."
    for name in SERVICE_FLOW_ORDER:
        if by_name.get(name, {}).get("status") == "critical":
            return f"{name} failure detected. Downstream services may be impacted."
    crit_any = [s["name"] for s in services if s.get("status") == "critical"]
    if crit_any:
        return f"{crit_any[0]} failure detected. Downstream services may be impacted."
    return "All systems operating normally."


def sync_system_state_from_probe_result(status: dict[str, Any]) -> None:
    """Update `system_state` anomaly score and status from a `/process` probe result."""
    services = status.get("services") or []
    critical = [s for s in services if s.get("status") == "critical"]

    if services:
        worst = max(float(svc.get("anomaly_score", 0) or 0) for svc in services)
        max_lat = max(float(svc.get("latency_ms") or 0) for svc in services)
        any_error = any(bool(svc.get("error")) for svc in services)
        # Model score 0–1 → 0–100; small bounded bumps from latency / error (deterministic).
        base = int(round(worst * 100))
        lat_bump = min(5, max(0, int((max_lat - 200.0) / 300.0)))
        err_bump = 3 if any_error else 0
        if critical:
            score = min(100, max(70, base + lat_bump + err_bump))
            set_anomaly_score(score)
        else:
            set_anomaly_score(BASELINE_ANOMALY_SCORE)
    elif not critical:
        set_anomaly_score(BASELINE_ANOMALY_SCORE)

    if critical:
        system_state["status"] = "critical"
        if not current_root_cause:
            set_current_root_cause(critical[0].get("name"))
        else:
            system_state["root_cause"] = current_root_cause
    else:
        system_state["status"] = "healthy"
        set_current_root_cause(None)


def _rows_all_healthy(latency_ms: float) -> list[dict[str, Any]]:
    return [_service_row(n, "healthy", latency_ms, False) for n in SERVICE_NAMES]


def _rows_single_critical(
    failing: str, latency_ms: float
) -> list[dict[str, Any]]:
    rows = []
    for n in SERVICE_NAMES:
        if n == failing:
            rows.append(_service_row(n, "critical", latency_ms, True))
        else:
            rows.append(_service_row(n, "healthy", latency_ms, False))
    return rows


def _event_service_for_failure() -> str | None:
    return current_root_cause


async def get_service_status() -> dict[str, Any]:
    """End-to-end check via api_gateway /process; return services list + rca_text."""
    start = time.perf_counter()
    ev_svc = _event_service_for_failure()
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(FLOW_PROCESS_URL)
        latency_ms = round((time.perf_counter() - start) * 1000, 2)

        if not response.is_success:
            print("System failure detected", flush=True)
            fail = ev_svc or "api_gateway"
            results = _rows_single_critical(fail, latency_ms) if fail in SERVICE_NAMES else [
                _service_row(n, "critical", latency_ms, True) for n in SERVICE_NAMES
            ]
            return {
                "services": results,
                "rca_text": compute_rca(results, fail),
            }

        payload = response.json()
        if payload.get("status") != "ok":
            print("System failure detected", flush=True)
            fail = ev_svc or (payload.get("service") or "order_service")
            if fail not in SERVICE_NAMES:
                fail = "order_service"
            results = _rows_single_critical(fail, latency_ms)
            return {
                "services": results,
                "rca_text": compute_rca(results, fail),
            }

        # Simulated failure may not trip every request (~80% fail); keep incident state in sync.
        if current_root_cause:
            fm = await get_fail_mode(current_root_cause)
            if fm is True:
                print("System failure detected (simulation active)", flush=True)
                fail = current_root_cause
                results = _rows_single_critical(fail, latency_ms)
                return {
                    "services": results,
                    "rca_text": compute_rca(results, fail),
                }

        results = _rows_all_healthy(latency_ms)
    except Exception:
        latency_ms = round((time.perf_counter() - start) * 1000, 2)
        print("System failure detected", flush=True)
        fail = ev_svc or "api_gateway"
        results = _rows_single_critical(fail, latency_ms)

    return {
        "services": results,
        "rca_text": compute_rca(results, current_root_cause),
    }


async def get_fail_mode(service: str) -> bool | None:
    if service not in SERVICE_INTERNAL_BASE:
        return None
    base = SERVICE_INTERNAL_BASE[service]
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{base}/sim-state")
        if response.is_success:
            return bool(response.json().get("fail_mode"))
    except Exception:
        pass
    return None


async def post_toggle_failure(service: str) -> bool:
    if service not in SERVICE_INTERNAL_BASE:
        return False
    base = SERVICE_INTERNAL_BASE[service]
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{base}/toggle-failure",
                params={"service": service},
            )
        return response.is_success
    except Exception:
        return False


async def ensure_fail_mode(service: str, want_failure: bool) -> dict[str, Any]:
    """Toggle simulation until `fail_mode` matches `want_failure` (or give up)."""
    start = time.perf_counter()

    if service not in ALLOWED_RESTART_SERVICES:
        return {
            "success": False,
            "service": service,
            "fail_mode": None,
            "mttr_ms": round((time.perf_counter() - start) * 1000, 2),
        }

    for _ in range(5):
        current = await get_fail_mode(service)
        if current is None:
            return {
                "success": False,
                "service": service,
                "fail_mode": None,
                "mttr_ms": round((time.perf_counter() - start) * 1000, 2),
            }
        if current is want_failure:
            return {
                "success": True,
                "service": service,
                "fail_mode": current,
                "mttr_ms": round((time.perf_counter() - start) * 1000, 2),
            }
        toggle_ok = await post_toggle_failure(service)
        if not toggle_ok:
            break

    final = await get_fail_mode(service)
    return {
        "success": final is want_failure if final is not None else False,
        "service": service,
        "fail_mode": final,
        "mttr_ms": round((time.perf_counter() - start) * 1000, 2),
    }


async def execute_auto_fix(service: str | None = None) -> dict[str, Any]:
    """Clear failure simulation for the given service (best-effort)."""
    target = service or current_root_cause
    if target is not None and target not in ALLOWED_RESTART_SERVICES:
        return {
            "success": False,
            "service": target,
            "fail_mode": None,
            "mttr_ms": 0.0,
        }
    if target is None:
        return {
            "success": False,
            "service": None,
            "fail_mode": None,
            "mttr_ms": 0.0,
        }

    system_state["auto_fix"] = "running"
    try:
        add_event("remediation_started", target)
        add_log("INFO", "system", "Auto-healing triggered")
        result = await ensure_fail_mode(target, False)
        if result.get("success"):
            add_event("remediation_complete", target)
            add_log("INFO", target, "Service recovered successfully")
            set_current_root_cause(None)
            set_anomaly_score(BASELINE_ANOMALY_SCORE)
        return result
    finally:
        system_state["auto_fix"] = "idle"


async def monitoring_loop() -> None:
    while True:
        await asyncio.sleep(5)
        try:
            print("Checking system flow...")
            status = await get_service_status()
            sync_system_state_from_probe_result(status)
            now = time.monotonic()
            critical_services = [
                svc for svc in status["services"] if svc.get("status") == "critical"
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
                event_svc = current_root_cause or name
                add_event("anomaly_detected", event_svc)
                # Optional stable refinement band (no random walk per tick).
                set_anomaly_score(
                    min(100, max(current_anomaly_score, ANOMALY_ELEVATED_SCORE))
                )
                add_log("WARN", "system", "Anomaly detected in system")
                print("Triggering auto-heal via service reset")
                result = await execute_auto_fix(name)
                last_healed[name] = time.monotonic()
                print("Auto-heal executed via service reset")
                if result["success"]:
                    elapsed_ms = round(
                        (time.perf_counter() - detect_to_recovery_start) * 1000, 2
                    )
                    print(f"Self-healing completed successfully in {elapsed_ms} ms")
                break
        except Exception as exc:
            print(f"Monitoring loop error: {exc}")


def _rca_payload() -> dict[str, Any]:
    if not current_root_cause:
        return {}
    svc = current_root_cause
    return {
        "service": svc,
        "confidence": 0.85,
        "rca_text": f"{svc} failure causing downstream impact.",
        "affected_services": affected_services_for(svc),
    }


def create_app() -> FastAPI:
    application = FastAPI(title="HealOps Orchestrator")
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

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

    @application.post("/api/toggle-failure")
    async def orchestrator_toggle_failure(
        service: str = Query(..., description="Service to toggle failure simulation on"),
    ) -> dict[str, Any]:
        if service not in ALLOWED_RESTART_SERVICES:
            raise HTTPException(status_code=400, detail="Unknown service")
        set_current_root_cause(service)
        result = await post_toggle_failure(service)
        if not result:
            set_current_root_cause(None)
            set_anomaly_score(BASELINE_ANOMALY_SCORE)
            return {
                "success": False,
                "service": service,
                "fail_mode": None,
                "mttr_ms": 0.0,
            }
        add_event("failure_injected", service)
        add_log("ERROR", service, f"{service} failure simulation toggled")
        probe = await get_service_status()
        sync_system_state_from_probe_result(probe)
        set_anomaly_score(INJECT_ANOMALY_SCORE)
        final_mode = await get_fail_mode(service)
        return {
            "success": True,
            "service": service,
            "fail_mode": final_mode,
            "mttr_ms": 0.0,
        }

    @application.post("/api/inject-failure")
    async def inject_failure(body: AutoFixRequest) -> dict[str, Any]:
        if body.service not in ALLOWED_RESTART_SERVICES:
            raise HTTPException(status_code=400, detail="Unknown service")
        set_current_root_cause(body.service)
        result = await ensure_fail_mode(body.service, True)
        if result.get("success"):
            add_event("failure_injected", body.service)
            add_log("ERROR", body.service, f"{body.service} failure injected")
            probe = await get_service_status()
            sync_system_state_from_probe_result(probe)
            set_anomaly_score(INJECT_ANOMALY_SCORE)
        else:
            set_current_root_cause(None)
            set_anomaly_score(BASELINE_ANOMALY_SCORE)
        return result

    @application.on_event("startup")
    async def start_background_monitor() -> None:
        asyncio.create_task(monitoring_loop())

    @application.get("/api/system-status")
    def get_system_status():
        return {
            "status": system_state.get("status", "healthy"),
            "anomaly_score": current_anomaly_score,
            "root_cause": current_root_cause,
            "auto_fix": system_state.get("auto_fix", "idle"),
        }

    @application.get("/api/rca")
    def get_rca():
        return _rca_payload()

    @application.get("/api/insights")
    def get_insights():
        return _rca_payload()

    @application.get("/api/timeline")
    def get_timeline():
        return {"events": system_state.get("timeline", [])}

    @application.get("/api/logs")
    def get_logs():
        return {"logs": system_state.get("logs", [])}

    @application.get("/api/metrics")
    def get_metrics():
        data = []

        for i in range(30):
            if system_state.get("status") == "critical":
                latency = random.randint(500, 1200)
                error_rate = round(random.uniform(0.1, 0.3), 2)
            else:
                latency = random.randint(50, 200)
                error_rate = round(random.uniform(0.0, 0.05), 2)

            data.append({"time": i, "latency": latency, "error_rate": error_rate})

        return {"metrics": data}

    return application


app = create_app()


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=9000, reload=False)
