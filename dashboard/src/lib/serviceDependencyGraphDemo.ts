import type {
  DependencyGraphServiceId,
  DependencyGraphStatus,
} from "@/types"

const DEFAULT_LATENCIES: Record<DependencyGraphServiceId, number> = {
  api_gateway: 38,
  order_service: 812,
  payment_service: 3200,
  inventory_service: 156,
}

const SERVICE_IDS = [
  "api_gateway",
  "order_service",
  "payment_service",
  "inventory_service",
] as const satisfies readonly DependencyGraphServiceId[]

function isDependencyServiceId(t: string): t is DependencyGraphServiceId {
  return (SERVICE_IDS as readonly string[]).includes(t)
}

/** Map inject-failure target (API value) to a plausible multi-service posture for the demo graph. */
export function monitoringStatusesForInjectTarget(
  target: string,
): Partial<Record<DependencyGraphServiceId, DependencyGraphStatus>> {
  if (!isDependencyServiceId(target)) {
    return {}
  }
  switch (target) {
    case "payment_service":
      return {
        api_gateway: "healthy",
        order_service: "degraded",
        payment_service: "critical",
        inventory_service: "recovering",
      }
    case "order_service":
      return {
        api_gateway: "degraded",
        order_service: "critical",
        payment_service: "degraded",
        inventory_service: "healthy",
      }
    case "api_gateway":
      return {
        api_gateway: "critical",
        order_service: "degraded",
        payment_service: "degraded",
        inventory_service: "healthy",
      }
    case "inventory_service":
      return {
        api_gateway: "healthy",
        order_service: "degraded",
        payment_service: "degraded",
        inventory_service: "critical",
      }
    default:
      return {}
  }
}

export function monitoringLatenciesForInjectTarget(
  target: string,
): Partial<Record<DependencyGraphServiceId, number>> {
  if (!isDependencyServiceId(target)) {
    return {}
  }
  switch (target) {
    case "payment_service":
      return DEFAULT_LATENCIES
    case "order_service":
      return {
        api_gateway: 120,
        order_service: 2100,
        payment_service: 890,
        inventory_service: 70,
      }
    case "api_gateway":
      return {
        api_gateway: 4200,
        order_service: 950,
        payment_service: 210,
        inventory_service: 65,
      }
    case "inventory_service":
      return {
        api_gateway: 45,
        order_service: 620,
        payment_service: 1400,
        inventory_service: 2800,
      }
    default:
      return {}
  }
}
