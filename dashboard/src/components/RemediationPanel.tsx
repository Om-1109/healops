import { CheckCircle, Wrench } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type RemediationPanelState = "idle" | "fixing" | "success"

export type RemediationPanelProps = {
  state: RemediationPanelState
  /** What the orchestrator / playbook is doing right now. */
  action: string
  /** 0–100 for the remediation progress bar. */
  progress: number
  /** Last or running MTTR in ms; omit or null when not applicable. */
  mttrMs?: number | null
  /** Compact body only when nested in incident flow. */
  embedded?: boolean
  className?: string
}

function clampPct(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.min(100, Math.max(0, n))
}

function formatMttr(ms: number | null | undefined): string {
  if (ms == null || Number.isNaN(ms)) {
    return "—"
  }
  return `${ms.toLocaleString(undefined, { maximumFractionDigits: 2 })} ms`
}

const STATUS_LABEL: Record<RemediationPanelState, string> = {
  idle: "Monitoring",
  fixing: "Fixing",
  success: "Recovered",
}

export function RemediationPanel({
  state,
  action,
  progress,
  mttrMs = null,
  embedded = false,
  className,
}: RemediationPanelProps) {
  const pct = clampPct(progress)
  const isIdle = state === "idle"
  const isFixing = state === "fixing"
  const isSuccess = state === "success"

  return (
    <Card
      className={cn(
        "overflow-hidden border-white/[0.08] bg-card transition-[border-color,background-color,box-shadow] duration-500 ease-out",
        !embedded && "premium-surface shadow-elevation-sm",
        isIdle && "border-white/[0.08]",
        isFixing && "border-primary/35 bg-primary/[0.05]",
        isSuccess && "border-emerald-400/25 bg-emerald-500/[0.06]",
        embedded && "border-0 bg-transparent shadow-none",
        className,
      )}
    >
      {!embedded ? (
        <CardHeader className="flex flex-row items-start gap-4 space-y-0 p-6 pb-4">
          <div
            className={cn(
              "rounded-lg p-3 transition-colors duration-300",
              isIdle && "bg-muted/50",
              isFixing && "bg-primary/10",
              isSuccess && "bg-emerald-500/10",
            )}
          >
            {isSuccess ? (
              <CheckCircle
                className="size-8 text-emerald-400 transition-transform duration-500 ease-out scale-100"
                aria-hidden
              />
            ) : (
              <Wrench
                className={cn(
                  "size-8 text-primary transition-all duration-300",
                  isFixing && "animate-[spin_2.75s_linear_infinite]",
                )}
                aria-hidden
              />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base font-medium">Remediation</CardTitle>
              <span
                className={cn(
                  "inline-flex rounded-md px-2 py-0.5 text-xs font-medium transition-[color,background-color,box-shadow] duration-500 ease-out",
                  isIdle && "bg-muted text-muted-foreground",
                  isFixing && "bg-primary/15 text-primary shadow-sm shadow-primary/10",
                  isSuccess && "bg-emerald-500/15 text-emerald-400/95",
                )}
              >
                {STATUS_LABEL[state]}
              </span>
            </div>
            <CardDescription className="text-balance text-sm leading-snug">
              {action}
            </CardDescription>
          </div>
        </CardHeader>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex rounded-md px-2 py-0.5 text-xs font-medium transition-colors duration-300",
                isIdle && "bg-muted text-muted-foreground",
                isFixing && "bg-primary/15 text-primary",
                isSuccess && "bg-emerald-500/15 text-emerald-400/95",
              )}
            >
              {STATUS_LABEL[state]}
            </span>
          </div>
          <CardDescription className="text-balance text-sm leading-snug text-foreground">
            {action}
          </CardDescription>
        </div>
      )}

      <CardContent className={cn("space-y-4", embedded ? "p-0 pt-4" : "p-6 pt-0")}>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">
              Progress
            </span>
            <span className="font-mono tabular-nums text-foreground">
              {Math.round(pct)}%
            </span>
          </div>
          <div
            className="h-3 overflow-hidden rounded-full bg-muted"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pct)}
            aria-label="Remediation progress"
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width,background-color,box-shadow] duration-700 ease-smooth",
                isFixing && pct > 0 && "progress-fill-shine",
                isIdle && "bg-muted-foreground/45",
                isFixing && "bg-primary shadow-sm shadow-primary/30",
                isSuccess && "bg-emerald-500 shadow-sm shadow-emerald-500/25",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-muted/25 px-3 py-2 text-sm transition-colors duration-300">
          <span className="text-muted-foreground">MTTR</span>
          <span className="font-mono font-medium tabular-nums text-foreground">
            {formatMttr(mttrMs)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
