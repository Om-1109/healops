import type { ReactNode, RefObject } from "react"
import { useEffect, useRef } from "react"
import { useShallow } from "zustand/react/shallow"

import { formatServiceLabel } from "@/lib/logStreamUtils"
import { cn } from "@/lib/utils"
import { useDashboardStore } from "@/store/useDashboardStore"

export type IncidentViewProps = {
  /** Compact anomaly visualization (e.g. `<AnomalyGauge embedded />`). */
  anomalySlot: ReactNode
  /** Request chain graph. */
  chainSlot: ReactNode
  /** Optional: align with ActionBar scroll-to-chain. */
  chainRef?: RefObject<HTMLDivElement | null>
  className?: string
}

/**
 * Split incident layout: compact anomaly (left) + request chain (right).
 * Scrolls into view when incident signals change.
 */
export function IncidentView({
  anomalySlot,
  chainSlot,
  chainRef,
  className,
}: IncidentViewProps) {
  const { systemStatus, currentIncident } = useDashboardStore(
    useShallow((s) => ({
      systemStatus: s.systemStatus,
      currentIncident: s.currentIncident,
    })),
  )

  const containerRef = useRef<HTMLDivElement>(null)
  const score = systemStatus?.anomaly_score
  const scoreLabel =
    typeof score === "number" && !Number.isNaN(score) ? `${Math.round(score)}%` : "—"
  const serviceHint = currentIncident?.service?.trim()
    ? formatServiceLabel(currentIncident.service)
    : null

  useEffect(() => {
    const id = window.setTimeout(() => {
      containerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    }, 300)
    return () => window.clearTimeout(id)
  }, [systemStatus?.status, systemStatus?.anomaly_score])

  return (
    <div
      ref={containerRef}
      className={cn(
        "animate-fade-in mt-6 flex flex-col gap-6 scroll-mt-20 md:flex-row md:items-stretch md:scroll-mt-24",
        className,
      )}
    >
      {/* LEFT — compact anomaly */}
      <div className="w-full flex-shrink-0 md:w-[35%]">
        <div
          className={cn(
            "flex h-full flex-col justify-between rounded-2xl border border-red-500/30 bg-[#0B1220]/90 p-5 shadow-elevation-sm",
            "shadow-[0_0_20px_rgba(255,0,0,0.2)] transition-all duration-500",
            "supports-[backdrop-filter]:bg-[#0B1220]/75",
          )}
        >
          <p className="text-sm text-muted-foreground">Anomaly score</p>
          <p className="mt-2 font-mono text-4xl font-bold tabular-nums text-red-400">
            {scoreLabel}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            {serviceHint
              ? `Issue detected in ${serviceHint}`
              : "Analyzing system…"}
          </p>
          <p className="mt-4 text-xs text-muted-foreground/80">
            Real-time anomaly from orchestrator status and chain probes.
          </p>
          <div className="mt-4 border-t border-white/[0.06] pt-4">{anomalySlot}</div>
        </div>
      </div>

      {/* RIGHT — request chain */}
      <div ref={chainRef} className="min-w-0 w-full md:w-[65%]">
        <div
          className={cn(
            "flex h-full min-h-0 flex-col justify-between rounded-2xl border border-white/[0.1] bg-[#0B1220]/90 p-5 shadow-elevation-sm",
            "transition-all duration-500 supports-[backdrop-filter]:bg-[#0B1220]/75",
          )}
        >
          <p className="mb-3 shrink-0 text-sm font-medium text-muted-foreground">
            Impacted request chain
          </p>
          <div className="min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-visible">
            <div className="min-w-[600px]">{chainSlot}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
