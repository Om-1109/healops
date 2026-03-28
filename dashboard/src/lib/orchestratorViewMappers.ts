import { formatServiceLabel } from "@/lib/logStreamUtils"
import type {
  LogLevel,
  LogLine,
  MetricsDatum,
  MetricsSeriesPoint,
  OrchestratorLogEntry,
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

/**
 * Header / status bar root cause: `currentIncident.service` first, then `insights.service`, else critical → Detecting….
 */
export function headerRootCauseDisplay(
  currentIncident: { service?: string } | null,
  insights: { service?: string } | null,
  systemStatus: { status?: string } | null | undefined,
): string {
  const svc =
    currentIncident?.service?.trim() || insights?.service?.trim()
  if (svc) {
    return formatRootCauseLabel(svc)
  }
  if (systemStatus?.status?.toLowerCase() === "critical") {
    return "Detecting..."
  }
  return "—"
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
