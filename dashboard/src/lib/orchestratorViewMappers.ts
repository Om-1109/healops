import { formatServiceLabel } from "@/lib/logStreamUtils"
import type {
  InsightsApi,
  LogLevel,
  LogLine,
  MetricsDatum,
  MetricsSeriesPoint,
  OrchestratorLogEntry,
  OrchestratorTimelineEvent,
  TimelineEvent,
  TimelineEventType,
} from "@/types"

/** Header / status bar: API `status` → display label */
export function formatHealthLabel(status: string | undefined): string {
  const v = (status ?? "healthy").toLowerCase()
  if (v === "critical") return "Critical"
  if (v === "degraded") return "Degraded"
  return "Healthy"
}

/** Map API status to `SystemStatus` / `Header` variant */
export function apiStatusToSystemStatus(
  status: string | undefined,
): "healthy" | "degraded" | "critical" {
  const v = (status ?? "healthy").toLowerCase()
  if (v === "critical") return "critical"
  if (v === "degraded") return "degraded"
  return "healthy"
}

export function formatRootCauseLabel(
  raw: string | null | undefined,
): string {
  if (raw == null || raw.trim() === "") {
    return "—"
  }
  const t = raw.trim()
  if (t.includes("_") || t === t.toLowerCase()) {
    return formatServiceLabel(t.replace(/\s+/g, "_").toLowerCase())
  }
  return t
}

const EVENT_TYPE_TO_ICON: Record<string, TimelineEventType> = {
  failure_injected: "alert",
  anomaly_detected: "anomaly",
  remediation_started: "fix",
  remediation_complete: "success",
}

function humanizeEventType(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

export function mapOrchestratorTimeline(
  events: OrchestratorTimelineEvent[],
): TimelineEvent[] {
  return events.map((e, index) => ({
    id: `${e.timestamp}-${index}-${e.type}`,
    type: EVENT_TYPE_TO_ICON[e.type] ?? "anomaly",
    serviceName: e.service ? formatServiceLabel(e.service) : "System",
    description: humanizeEventType(e.type),
    at: e.timestamp,
  }))
}

export function normalizeLogLevel(raw: string): LogLevel {
  const u = raw.toUpperCase()
  if (u === "ERROR") return "ERROR"
  if (u === "WARN" || u === "WARNING") return "WARN"
  return "INFO"
}

export function mapOrchestratorLogs(
  entries: OrchestratorLogEntry[],
): LogLine[] {
  return entries.map((e, i) => ({
    id: `orch-${i}-${e.timestamp}`,
    level: normalizeLogLevel(e.level),
    message: e.message,
    at: e.timestamp,
    service: e.service,
  }))
}

export function mapMetricsToChartData(
  points: MetricsSeriesPoint[],
): MetricsDatum[] {
  return points.map((p) => ({
    label: String(p.time),
    latency: p.latency,
    error_rate: p.error_rate,
  }))
}

export function insightsToRcaProps(insights: InsightsApi | null) {
  if (!insights) {
    return {
      serviceName: "—",
      failureType: "—",
      affectedServices: [] as string[],
      explanation: "Connect to the orchestrator to load insights.",
      confidencePercent: 0,
      emphasizedTerms: [] as string[],
    }
  }
  const aff = insights.affected_services.map((s) => formatServiceLabel(s))
  return {
    serviceName: formatServiceLabel(insights.service),
    failureType: "Active incident",
    affectedServices: aff,
    explanation: insights.rca_text,
    confidencePercent: Math.min(
      100,
      Math.max(0, Math.round(insights.confidence * 100)),
    ),
    emphasizedTerms: [
      ...aff,
      formatServiceLabel(insights.service),
      "downstream",
    ],
  }
}
