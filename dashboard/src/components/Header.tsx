import { CheckCircle, Circle } from "lucide-react"

import { cn } from "@/lib/utils"
import { useDashboardStore } from "@/store/useDashboardStore"

export type SystemStatus = "healthy" | "critical" | "degraded"

export type HeaderProps = {
  status?: SystemStatus
  /** Display label next to live indicator, e.g. Healthy / Critical */
  healthLabel?: string
  /** Root cause summary from orchestrator */
  rootCause?: string | null
  className?: string
}

export function Header({
  status = "healthy",
  healthLabel,
  rootCause = null,
  className,
}: HeaderProps) {
  const mttr = useDashboardStore((s) => s.mttr)
  const isCritical = status === "critical"
  const isDegraded = status === "degraded"
  const stateLabel =
    healthLabel ??
    (isCritical ? "Critical" : isDegraded ? "Degraded" : "Healthy")

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
        <p className="mt-1.5 text-[13px] font-medium leading-snug text-muted-foreground">
          Operations control — live reliability workspace
        </p>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1.5 text-[13px]">
          <span
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs font-semibold tracking-wide",
              isCritical && "border-red-500/35 bg-red-500/10 text-red-200",
              isDegraded &&
                !isCritical &&
                "border-amber-500/35 bg-amber-500/10 text-amber-100",
              !isCritical && !isDegraded && "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
            )}
          >
            {stateLabel}
          </span>
          <p className="min-w-0 text-muted-foreground">
            <span className="font-medium text-foreground/80">Root cause:</span>{" "}
            <span className="text-foreground">
              {rootCause != null && rootCause.trim() !== ""
                ? rootCause
                : "—"}
            </span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="flex items-center gap-2.5" title="Live telemetry">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/40 opacity-75 motion-reduce:animate-none" />
            <Circle
              className="relative size-2 fill-emerald-400 text-emerald-400"
              strokeWidth={0}
              aria-hidden
            />
          </span>
          <span className="text-2xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Live
          </span>
        </div>
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
