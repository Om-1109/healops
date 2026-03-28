import { CheckCircle, Circle } from "lucide-react"

import {
  apiStatusToSystemStatus,
  headerRootCauseDisplay,
} from "@/lib/orchestratorViewMappers"
import { cn } from "@/lib/utils"
import { useDashboardStore } from "@/store/useDashboardStore"

export type SystemStatus = "healthy" | "critical" | "degraded"

export type HeaderProps = {
  className?: string
}

export function Header({ className }: HeaderProps) {
  const systemStatus = useDashboardStore((s) => s.systemStatus)
  const insights = useDashboardStore((s) => s.insights)
  const currentIncident = useDashboardStore((s) => s.currentIncident)
  const mttr = useDashboardStore((s) => s.mttr)

  const apiStatus = systemStatus?.status
  const variant = apiStatusToSystemStatus(apiStatus)
  const isCritical = variant === "critical"
  const isDegraded = variant === "degraded"

  const statusDisplay =
    apiStatus != null && apiStatus.trim() !== ""
      ? apiStatus.trim().toUpperCase()
      : "—"

  const rootCauseDisplay = headerRootCauseDisplay(
    currentIncident,
    insights,
    systemStatus,
  )

  const autoFixDisplay =
    systemStatus?.auto_fix != null && systemStatus.auto_fix !== ""
      ? systemStatus.auto_fix
      : "idle"

  return (
    <header
      className={cn(
        "flex flex-col gap-6 rounded-2xl border border-white/[0.08] bg-card/55 p-6 shadow-elevation-sm backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between sm:p-7",
        "transition-[border-color,box-shadow,background-color] duration-500 ease-smooth",
        isCritical && "border-red-500/30 shadow-[0_0_0_1px_hsl(0_72%_52%/0.15)]",
        isDegraded &&
          !isCritical &&
          "border-amber-500/25 shadow-[0_0_0_1px_hsl(38_92%_50%/0.12)]",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <h1 className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-xl font-bold tracking-[-0.03em] text-transparent sm:text-2xl">
          HealOps
        </h1>

        <dl className="mt-3 grid gap-2.5 text-[13px]">
          <div className="flex flex-wrap items-center gap-2">
            <dt className="sr-only">Status</dt>
            <dd className="m-0">
              <span
                className={cn(
                  "inline-block rounded-md border px-2.5 py-1 text-xs font-semibold tracking-wide",
                  isCritical && "border-red-500/35 bg-red-500/10 text-red-200",
                  isDegraded &&
                    !isCritical &&
                    "border-amber-500/35 bg-amber-500/10 text-amber-100",
                  !isCritical &&
                    !isDegraded &&
                    "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
                )}
              >
                {statusDisplay}
              </span>
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="sr-only">Root cause</dt>
            <dd className="m-0 text-foreground">{rootCauseDisplay}</dd>
          </div>
          <div className="min-w-0 font-mono text-xs text-muted-foreground">
            <dt className="sr-only">Auto fix</dt>
            <dd className="m-0 break-all">{autoFixDisplay}</dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 sm:flex-col sm:items-end sm:gap-y-3">
        <span
          className="relative flex size-2 shrink-0"
          title="Telemetry active"
          aria-label="Telemetry active"
        >
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/40 opacity-75 motion-reduce:animate-none" />
          <Circle
            className="relative size-2 fill-emerald-400 text-emerald-400"
            strokeWidth={0}
            aria-hidden
          />
        </span>
        <div
          className={cn(
            "max-w-[14rem] text-right text-[11px] font-medium tabular-nums tracking-tight",
            mttr ? "text-emerald-400/90" : "text-muted-foreground",
          )}
          title={mttr ? `Mean time to recover: ${mttr} s` : "Awaiting recovery window"}
        >
          {mttr ? (
            <span
              key={mttr}
              className="inline-flex items-center justify-end gap-1.5 animate-flow-step-in motion-reduce:animate-none motion-reduce:translate-y-0 motion-reduce:opacity-100"
            >
              <span>{`Recovered in ${mttr}s`}</span>
              <CheckCircle
                className="size-3.5 shrink-0 text-emerald-400/95"
                strokeWidth={2}
                aria-hidden
              />
            </span>
          ) : (
            "Monitoring..."
          )}
        </div>
      </div>
    </header>
  )
}
