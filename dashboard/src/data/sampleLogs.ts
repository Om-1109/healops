import type { LogLine } from "@/types"

export const SAMPLE_LOG_LINES: LogLine[] = [
  {
    id: "l1",
    level: "INFO",
    at: "2026-03-27T12:08:02.112Z",
    service: "orchestrator",
    message: "GET /api/services/status 200 18ms",
  },
  {
    id: "l2",
    level: "INFO",
    at: "2026-03-27T12:08:05.441Z",
    service: "monitor",
    message: "Checking system flow via api_gateway:8000/process",
  },
  {
    id: "l3",
    level: "WARN",
    at: "2026-03-27T12:08:06.883Z",
    service: "order_service",
    message: "Downstream payment_service latency 890ms (threshold 500ms)",
  },
  {
    id: "l4",
    level: "ERROR",
    at: "2026-03-27T12:08:07.102Z",
    service: "payment_service",
    message: "Simulated failure — HTTP 500 on /process chain",
  },
  {
    id: "l5",
    level: "WARN",
    at: "2026-03-27T12:08:07.340Z",
    service: "api_gateway",
    message: "Aggregated status non-OK; marking anomaly score 0.92",
  },
  {
    id: "l6",
    level: "INFO",
    at: "2026-03-27T12:08:08.015Z",
    service: "orchestrator",
    message: "POST payment_service:8002/toggle-failure 200 42ms",
  },
  {
    id: "l7",
    level: "INFO",
    at: "2026-03-27T12:08:10.551Z",
    service: "payment_service",
    message: "FAIL_MODE=false; health probe OK",
  },
]
