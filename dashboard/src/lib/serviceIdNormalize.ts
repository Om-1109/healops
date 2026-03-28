import type { DependencyGraphServiceId } from "@/types"

const GRAPH_IDS: DependencyGraphServiceId[] = [
  "api_gateway",
  "order_service",
  "payment_service",
  "inventory_service",
]

/**
 * Normalize labels like `Payment Service` or `payment-service` to `payment_service`
 * for comparison with graph / API ids.
 */
export function normalizeServiceId(name: string | null | undefined): string {
  if (name == null || !String(name).trim()) return ""
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
}

/** Resolve GET /api/rca `service` (or any label) to a graph node id. */
export function matchDependencyGraphServiceId(
  name: string | null | undefined,
): DependencyGraphServiceId | null {
  const n = normalizeServiceId(name)
  if (!n) return null
  const hit = GRAPH_IDS.find((id) => id === n || normalizeServiceId(id) === n)
  return hit ?? null
}
