import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react"
import { useMemo } from "react"
import { useShallow } from "zustand/react/shallow"

import { cn } from "@/lib/utils"
import { useDashboardStore } from "@/store/useDashboardStore"

export function RecoveryFromStore({ className }: { className?: string }) {
  const { systemStatus, mttr } = useDashboardStore(
    useShallow((s) => ({
      systemStatus: s.systemStatus,
      mttr: s.mttr,
    })),
  )

  const st = systemStatus?.status?.toLowerCase() ?? ""

  const body = useMemo(() => {
    if (!systemStatus) {
      return {
        variant: "loading" as const,
        title: "Recovery status",
        detail: "Loading orchestrator state…",
      }
    }
    if (st === "healthy" && mttr != null) {
      return {
        variant: "success" as const,
        title: "Incident cleared",
        detail: `Process chain reported healthy. Last measured MTTR: ${mttr}s.`,
      }
    }
    if (st === "healthy") {
      return {
        variant: "neutral" as const,
        title: "No recent recovery window",
        detail:
          "System status is healthy. MTTR appears when failure and remediation events exist on the timeline.",
      }
    }
    if (st === "critical" || st === "degraded") {
      return {
        variant: "active" as const,
        title: "Incident in progress",
        detail:
          "Follow remediation and live service health until the orchestrator reports healthy.",
      }
    }
    return {
      variant: "neutral" as const,
      title: "Recovery",
      detail: "Awaiting status from the orchestrator.",
    }
  }, [systemStatus, st, mttr])

  const isSuccess = body.variant === "success"
  const isLoading = body.variant === "loading"
  const isActive = body.variant === "active"

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        isSuccess && "border-emerald-500/20 bg-emerald-500/[0.06]",
        isActive && "border-amber-500/25 bg-amber-500/[0.06]",
        !isSuccess && !isActive && "border-border bg-muted/15",
        className,
      )}
    >
      <div className="flex gap-3">
        {isLoading ? (
          <Loader2
            className="size-5 shrink-0 animate-spin text-muted-foreground"
            strokeWidth={1.75}
            aria-hidden
          />
        ) : isActive ? (
          <AlertTriangle
            className="size-5 shrink-0 text-amber-400"
            strokeWidth={1.75}
            aria-hidden
          />
        ) : (
          <CheckCircle2
            className={cn(
              "size-5 shrink-0",
              isSuccess && "text-emerald-400",
              !isSuccess && "text-muted-foreground",
            )}
            strokeWidth={1.75}
            aria-hidden
          />
        )}
        <div>
          <p className="text-sm font-semibold tracking-tight text-foreground">
            {body.title}
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            {body.detail}
          </p>
        </div>
      </div>
    </div>
  )
}
