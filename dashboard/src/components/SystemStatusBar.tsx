import type { ReactNode } from "react"

import type { ActionBarStatus } from "@/types"
import type { SystemStatus } from "@/components/Header"
import { cn } from "@/lib/utils"

const STATUS_LABEL: Record<SystemStatus, string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  critical: "Critical",
}

const STATUS_TEXT: Record<SystemStatus, string> = {
  healthy: "text-emerald-400/95",
  degraded: "text-amber-400/95",
  critical: "text-red-400/95",
}

const AUTOFIX_LABEL: Record<ActionBarStatus, string> = {
  monitoring: "Monitoring",
  fixing: "Fixing",
  recovered: "Recovered",
}

const AUTOFIX_TEXT: Record<ActionBarStatus, string> = {
  monitoring: "text-muted-foreground",
  fixing: "text-foreground",
  recovered: "text-emerald-400/95",
}

export type SystemStatusBarProps = {
  systemStatus: SystemStatus
  rootCauseService: string
  autoFixState: ActionBarStatus
  className?: string
}

function Cell({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex min-h-[72px] flex-col justify-center px-6 py-4 sm:min-h-0",
        className,
      )}
    >
      <span className="text-2xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <div className="mt-2 min-h-[1.25rem]">{children}</div>
    </div>
  )
}

export function SystemStatusBar({
  systemStatus,
  rootCauseService,
  autoFixState,
  className,
}: SystemStatusBarProps) {
  const root =
    rootCauseService.trim() !== "" ? rootCauseService : "—"

  return (
    <div
      className={cn(
        "premium-surface grid grid-cols-1 divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.08] bg-card/70 shadow-elevation-sm backdrop-blur-xl transition-[background-color,border-color] duration-500 sm:grid-cols-3 sm:divide-x sm:divide-y-0 supports-[backdrop-filter]:bg-card/55",
        className,
      )}
      role="region"
      aria-label="System overview"
    >
      <Cell label="System status">
        <span
          className={cn(
            "font-mono text-sm font-semibold tabular-nums tracking-tight transition-colors duration-500",
            STATUS_TEXT[systemStatus],
          )}
        >
          {STATUS_LABEL[systemStatus]}
        </span>
      </Cell>
      <Cell label="Root cause service">
        <span
          className="truncate font-mono text-sm font-semibold text-foreground"
          title={root}
        >
          {root}
        </span>
      </Cell>
      <Cell label="Auto-fix">
        <span
          className={cn(
            "font-mono text-sm font-semibold tabular-nums transition-colors duration-500",
            AUTOFIX_TEXT[autoFixState],
          )}
        >
          {AUTOFIX_LABEL[autoFixState]}
        </span>
      </Cell>
    </div>
  )
}
