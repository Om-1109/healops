import type { ServiceCardStatus } from "@/components/ServiceCard"
import { formatServiceLabel } from "@/lib/logStreamUtils"
import type {
  DependencyGraphServiceId,
  DependencyGraphStatus,
  ServiceHealth,
} from "@/types"

export const GRAPH_SERVICE_ORDER: DependencyGraphServiceId[] = [
  "api_gateway",
  "order_service",
  "payment_service",
  "inventory_service",
]

function healthByName(
  services: ServiceHealth[],
): Map<string, ServiceHealth> {
  const m = new Map<string, ServiceHealth>()
  for (const s of services) {
    m.set(s.name, s)
  }
  return m
}

/** Map API `status` to dependency graph node status. */
function toGraphStatus(status: ServiceHealth["status"]): DependencyGraphStatus {
  if (status === "critical") return "critical"
  if (status === "degraded") return "degraded"
  return "healthy"
}

/** Map API `status` to service card chip status. */
function toCardStatus(status: ServiceHealth["status"]): ServiceCardStatus {
  return status
}

export function mapServiceHealthToGraphProps(services: ServiceHealth[]): {
  statuses: Record<DependencyGraphServiceId, DependencyGraphStatus>
  latenciesMs: Record<DependencyGraphServiceId, number>
} {
  const by = healthByName(services)
  const statuses = {} as Record<
    DependencyGraphServiceId,
    DependencyGraphStatus
  >
  const latenciesMs = {} as Record<DependencyGraphServiceId, number>
  for (const id of GRAPH_SERVICE_ORDER) {
    const row = by.get(id)
    statuses[id] = row ? toGraphStatus(row.status) : "healthy"
    latenciesMs[id] = row?.latency_ms ?? 0
  }
  return { statuses, latenciesMs }
}

export function mapServiceHealthToCardProps(
  id: DependencyGraphServiceId,
  services: ServiceHealth[],
) {
  const row = healthByName(services).get(id)
  if (!row) return null
  return {
    name: formatServiceLabel(id),
    status: toCardStatus(row.status),
    latency: row.latency_ms ?? 0,
    error_rate: row.error ? 100 : 0,
    request_count: 0,
    anomaly_score: row.anomaly_score ?? 0,
  }
}
