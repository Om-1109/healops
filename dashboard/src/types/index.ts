/** Shared dashboard / API types */

export type ServiceHealth = {
  name: string
  status: "healthy" | "degraded" | "critical"
  latency_ms: number
  error: boolean
  anomaly_score: number
}

export type ServicesStatusResponse = {
  services: ServiceHealth[]
  rca_text: string
}

/** Time series point for metrics chart (latency + error rate). */
export type MetricsDatum = {
  label: string
  latency: number
  error_rate: number
  /**
   * Shown in the chart tooltip — explain spikes, deploys, or anomalies
   * for this bucket.
   */
  insight?: string
}

export type TimelineEventType = "alert" | "anomaly" | "fix" | "success"

export type TimelineEvent = {
  id: string
  type: TimelineEventType
  serviceName: string
  description: string
  /** ISO 8601 or other string parseable by `Date` */
  at: string
}

export type LogLevel = "ERROR" | "WARN" | "INFO"

export type LogLine = {
  id: string
  level: LogLevel
  message: string
  /** ISO 8601 — shown as local time in stream */
  at: string
  /**
   * Logical service (e.g. `payment_service`). If omitted, inferred from
   * `message` prefix before `:`.
   */
  service?: string
}

/** Orchestrator / action strip state shown next to inject & auto-fix controls. */
export type ActionBarStatus = "monitoring" | "fixing" | "recovered"

/** `GET /api/system-status` */
export type SystemStatusApi = {
  status: string
  anomaly_score: number
  root_cause: string | null
  auto_fix: string
}

/** `GET /api/insights` */
export type InsightsApi = {
  service: string
  confidence: number
  rca_text: string
  affected_services: string[]
}

/** `GET /api/timeline` → `events[]` item */
export type OrchestratorTimelineEvent = {
  type: string
  service: string | null
  timestamp: string
}

/** `GET /api/logs` → `logs[]` item */
export type OrchestratorLogEntry = {
  level: string
  service: string
  message: string
  timestamp: string
}

/** `GET /api/metrics` → `metrics[]` item */
export type MetricsSeriesPoint = {
  time: number
  latency: number
  error_rate: number
}

/** Service IDs aligned with backend / inject-failure targets. */
export type DependencyGraphServiceId =
  | "api_gateway"
  | "order_service"
  | "payment_service"
  | "inventory_service"

export type DependencyGraphStatus =
  | "healthy"
  | "degraded"
  | "critical"
  | "recovering"
