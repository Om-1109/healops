import { CheckCircle, Loader2, Wrench } from "lucide-react"
import { motion } from "framer-motion"
import { useState } from "react"
import { useShallow } from "zustand/react/shallow"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useDashboardStore } from "@/store/useDashboardStore"

/** Safe display name from RCA `insights.service`; never throws; defaults to em dash. */
function remediationServiceName(service: string | undefined | null): string {
  const raw = typeof service === "string" ? service.trim() : ""
  if (!raw) return "—"
  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
}

export type RemediationPanelState = "idle" | "fixing" | "success"

export type RemediationPanelProps = {
  /** Compact body only when nested in incident flow. */
  embedded?: boolean
  className?: string
  /** Orchestrator POST /api/auto-fix (same handler as former ActionBar control). */
  onTriggerAutoFix?: () => void | Promise<void>
}

const SLA_LIMIT = 15

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(100, Math.max(0, n))
}

export function RemediationPanel({
  embedded = false,
  className,
  onTriggerAutoFix,
}: RemediationPanelProps) {
  const [fixing, setFixing] = useState(false)

  const { currentIncident, insights, systemStatus, mttr } = useDashboardStore(
    useShallow((s) => ({
      currentIncident: s.currentIncident,
      insights: s.insights,
      systemStatus: s.systemStatus,
      mttr: s.mttr,
    })),
  )

  const autoFix = systemStatus?.auto_fix ?? "idle"
  const statusLower = systemStatus?.status?.toLowerCase() ?? "healthy"
  const serviceName = remediationServiceName(
    currentIncident?.service ?? insights?.service,
  )

  const showFix =
    statusLower === "critical" &&
    Boolean(
      currentIncident?.service?.trim() || insights?.service?.trim(),
    )
  const autoHealActive = autoFix !== "idle" && String(autoFix).trim() !== ""

  const state: RemediationPanelState =
    autoFix === "running" ? "fixing" : mttr != null ? "success" : "idle"

  const progressPct =
    state === "fixing" ? null : state === "success" ? 100 : 0
  const pct = progressPct == null ? null : clampPct(progressPct)

  const isIdle = state === "idle"
  const isFixing = state === "fixing"
  const isSuccess = state === "success"

  let action: string
  if (statusLower === "critical") {
    action = `Fixing ${serviceName}...`
  } else if (statusLower === "healthy" && mttr != null) {
    action = `Recovered in ${mttr}s`
  } else if (autoFix === "running") {
    action = `Fixing ${serviceName}...`
  } else if (mttr != null) {
    action = `Recovered in ${mttr}s`
  } else {
    action = `Monitoring ${serviceName}.`
  }

  const statusDisplay =
    systemStatus?.auto_fix != null && systemStatus.auto_fix !== ""
      ? systemStatus.auto_fix
      : "idle"

  const mttrValue =
    mttr != null && String(mttr).trim() !== ""
      ? parseFloat(String(mttr))
      : NaN
  const hasNumericMttr = Number.isFinite(mttrValue)
  const slaStatus =
    !hasNumericMttr
      ? "idle"
      : mttrValue === 0
        ? "idle"
        : mttrValue <= SLA_LIMIT
          ? "success"
          : "violation"
  const slaProgressPct = hasNumericMttr
    ? Math.min((mttrValue / SLA_LIMIT) * 100, 100)
    : 0

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
                className="size-8 scale-100 text-emerald-400 transition-transform duration-500 ease-out"
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
                  "inline-flex rounded-md px-2 py-0.5 font-mono text-xs font-medium uppercase tracking-wide transition-[color,background-color,box-shadow] duration-500 ease-out",
                  isIdle && "bg-muted text-muted-foreground",
                  isFixing && "bg-primary/15 text-primary shadow-sm shadow-primary/10",
                  isSuccess && "bg-emerald-500/15 text-emerald-400/95",
                )}
                title="systemStatus.auto_fix"
              >
                {statusDisplay}
              </span>
            </div>
            <p className="text-xs font-medium text-muted-foreground">
              <span className="sr-only">Service</span>
              <span className="text-foreground">{serviceName}</span>
            </p>
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
                "inline-flex rounded-md px-2 py-0.5 font-mono text-xs font-medium uppercase tracking-wide transition-colors duration-300",
                isIdle && "bg-muted text-muted-foreground",
                isFixing && "bg-primary/15 text-primary",
                isSuccess && "bg-emerald-500/15 text-emerald-400/95",
              )}
              title="systemStatus.auto_fix"
            >
              {statusDisplay}
            </span>
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            <span className="sr-only">Service</span>
            <span className="text-foreground">{serviceName}</span>
          </p>
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
              {pct == null ? "0%" : `${Math.round(pct)}%`}
            </span>
          </div>
          <div
            className="h-3 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct == null ? undefined : Math.round(pct)}
            aria-valuetext={pct == null ? "Indeterminate" : `${Math.round(pct)}%`}
            aria-busy={isFixing}
            aria-label="Remediation progress"
          >
            {isFixing && pct == null ? (
              <div className="h-full w-full rounded-full bg-primary/40 motion-safe:animate-pulse" />
            ) : (
              <motion.div
                className={cn(
                  "h-full rounded-full",
                  isIdle && "bg-muted-foreground/45",
                  isSuccess && "bg-emerald-500 shadow-sm shadow-emerald-500/25",
                )}
                initial={{ width: 0 }}
                animate={{
                  width: pct == null ? "0%" : `${pct}%`,
                }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            )}
          </div>
        </div>

        {showFix && onTriggerAutoFix ? (
          <div className="space-y-0">
            <Button
              type="button"
              disabled={fixing}
              onClick={async () => {
                setFixing(true)
                try {
                  await onTriggerAutoFix()
                } finally {
                  setFixing(false)
                }
              }}
              className="mt-4 w-full rounded-xl bg-purple-600 py-2 text-white transition hover:bg-purple-700 disabled:opacity-70"
            >
              {fixing ? (
                <>
                  <Loader2
                    className="mr-2 inline size-4 animate-spin"
                    strokeWidth={2}
                    aria-hidden
                  />
                  Fixing...
                </>
              ) : (
                "Trigger Auto-Fix"
              )}
            </Button>
            {autoHealActive ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Auto-healing enabled (manual override available)
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-2 rounded-lg bg-muted/25 px-3 py-2 text-sm transition-colors duration-300">
          {mttr != null ? (
            <>
              <p className="text-center font-medium tabular-nums text-emerald-400/95">
                Recovered in{" "}
                <motion.span
                  key={String(mttr)}
                  className="inline-block tabular-nums"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  {mttr}s
                </motion.span>
              </p>
              {slaStatus === "success" ? (
                <p className="text-center text-xs text-green-400">
                  ✔ Within SLA ({SLA_LIMIT}s)
                </p>
              ) : null}
              {slaStatus === "violation" ? (
                <p className="text-center text-xs text-red-400">
                  ✖ SLA Breached
                </p>
              ) : null}
              {hasNumericMttr && mttrValue > 0 ? (
                <div className="space-y-1 pt-0.5">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>SLA ({SLA_LIMIT}s)</span>
                    <span className="font-mono tabular-nums">
                      {slaProgressPct.toFixed(0)}%
                    </span>
                  </div>
                  <div
                    className="h-1 overflow-hidden rounded-full bg-muted"
                    role="meter"
                    aria-valuemin={0}
                    aria-valuemax={SLA_LIMIT}
                    aria-valuenow={
                      hasNumericMttr ? Math.min(mttrValue, SLA_LIMIT) : undefined
                    }
                    aria-label="Recovery time relative to SLA"
                  >
                    <motion.div
                      className={cn(
                        "h-full rounded-full",
                        slaStatus === "violation" && "bg-red-500",
                        slaStatus === "success" && "bg-emerald-500",
                        slaStatus === "idle" && "bg-muted-foreground/40",
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${slaProgressPct}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-center text-muted-foreground">
              {statusLower === "healthy" ? "Stable" : "Awaiting recovery"}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
