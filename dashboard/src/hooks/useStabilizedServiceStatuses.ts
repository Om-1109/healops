import { useEffect, useMemo, useRef, useState } from "react"

import { GRAPH_SERVICE_ORDER } from "@/lib/serviceHealthView"
import type {
  DependencyGraphServiceId,
  DependencyGraphStatus,
} from "@/types"

/** Minimum time a service stays visually critical (ms) after backend reports critical. */
export const MIN_CRITICAL_VISUAL_MS = 6000

/**
 * Holds critical (red) visually for at least {@link MIN_CRITICAL_VISUAL_MS} before allowing
 * a transition to healthy when the API recovers sooner — purely visual.
 */
export function useStabilizedServiceStatuses(
  statuses: Record<DependencyGraphServiceId, DependencyGraphStatus> | null,
): Record<DependencyGraphServiceId, DependencyGraphStatus> | null {
  const [visualStatuses, setVisualStatuses] = useState<Record<
    DependencyGraphServiceId,
    DependencyGraphStatus
  > | null>(null)

  const lastCriticalAtRef = useRef<
    Partial<Record<DependencyGraphServiceId, number>>
  >({})
  const prevStatusesRef = useRef<Record<
    DependencyGraphServiceId,
    DependencyGraphStatus
  > | null>(null)
  const pendingTimeoutsRef = useRef<
    Map<DependencyGraphServiceId, ReturnType<typeof setTimeout>>
  >(new Map())

  useEffect(() => {
    if (!statuses) return

    const prev = prevStatusesRef.current

    setVisualStatuses((vis) => {
      const next: Record<DependencyGraphServiceId, DependencyGraphStatus> = {
        ...(vis ?? statuses),
      }

      for (const id of GRAPH_SERVICE_ORDER) {
        const s = statuses[id]
        const p = prev?.[id]

        if (s === "critical") {
          const oldT = pendingTimeoutsRef.current.get(id)
          if (oldT != null) {
            clearTimeout(oldT)
            pendingTimeoutsRef.current.delete(id)
          }
          next[id] = "critical"
          if (p !== "critical") {
            lastCriticalAtRef.current[id] = Date.now()
          }
          continue
        }

        if (s === "degraded" || s === "recovering") {
          const oldT = pendingTimeoutsRef.current.get(id)
          if (oldT != null) {
            clearTimeout(oldT)
            pendingTimeoutsRef.current.delete(id)
          }
          next[id] = s
          delete lastCriticalAtRef.current[id]
          continue
        }

        if (s === "healthy" && next[id] === "critical") {
          const t0 = lastCriticalAtRef.current[id]
          if (t0 == null) {
            next[id] = "healthy"
            continue
          }
          const remaining = MIN_CRITICAL_VISUAL_MS - (Date.now() - t0)
          if (remaining <= 0) {
            const oldT = pendingTimeoutsRef.current.get(id)
            if (oldT != null) {
              clearTimeout(oldT)
              pendingTimeoutsRef.current.delete(id)
            }
            next[id] = "healthy"
            delete lastCriticalAtRef.current[id]
          } else {
            next[id] = "critical"
            if (!pendingTimeoutsRef.current.has(id)) {
              const tid = window.setTimeout(() => {
                setVisualStatuses((v) => {
                  if (!v) return v
                  return { ...v, [id]: "healthy" }
                })
                delete lastCriticalAtRef.current[id]
                pendingTimeoutsRef.current.delete(id)
              }, remaining)
              pendingTimeoutsRef.current.set(id, tid)
            }
          }
          continue
        }

        if (s === "healthy") {
          const oldT = pendingTimeoutsRef.current.get(id)
          if (oldT != null) {
            clearTimeout(oldT)
            pendingTimeoutsRef.current.delete(id)
          }
          next[id] = "healthy"
          delete lastCriticalAtRef.current[id]
          continue
        }

        next[id] = s
      }

      return next
    })

    prevStatusesRef.current = { ...statuses }
  }, [statuses])

  useEffect(() => {
    return () => {
      for (const t of pendingTimeoutsRef.current.values()) {
        clearTimeout(t)
      }
      pendingTimeoutsRef.current.clear()
    }
  }, [])

  return useMemo(() => {
    if (!statuses) return null
    return visualStatuses ?? statuses
  }, [statuses, visualStatuses])
}
