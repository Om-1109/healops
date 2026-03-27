import type { TimelineEvent } from "@/types"

/** Demo events (unsorted — Timeline sorts newest first). */
export const SAMPLE_TIMELINE_EVENTS: TimelineEvent[] = [
  {
    id: "1",
    type: "success",
    serviceName: "Payment Service",
    description: "Failure mode cleared via service reset; process chain healthy again.",
    at: "2026-03-27T12:08:00.000Z",
  },
  {
    id: "2",
    type: "fix",
    serviceName: "Orchestrator",
    description: "Triggered auto-heal: POST payment /toggle-failure",
    at: "2026-03-27T12:07:32.000Z",
  },
  {
    id: "3",
    type: "anomaly",
    serviceName: "API Gateway",
    description: "End-to-end /process latency spike detected on status aggregation.",
    at: "2026-03-27T12:06:15.000Z",
  },
  {
    id: "4",
    type: "alert",
    serviceName: "Order Service",
    description: "Downstream payment errors caused order finalization failures.",
    at: "2026-03-27T12:05:40.000Z",
  },
]
