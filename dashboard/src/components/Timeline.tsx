import { AlertTriangle, Brain, CheckCircle, Wrench } from "lucide-react"
import { useMemo } from "react"
import { useShallow } from "zustand/react/shallow"

import { formatServiceLabel } from "@/lib/logStreamUtils"
import { cn } from "@/lib/utils"
import { useDashboardStore } from "@/store/useDashboardStore"
import type { TimelineEventType } from "@/types"

export type { TimelineEvent, TimelineEventType } from "@/types"

const EVENT_TYPE_TO_ICON: Record<string, TimelineEventType> = {
  failure_injected: "alert",
  anomaly_detected: "anomaly",
  remediation_started: "fix",
  remediation_complete: "success",
}

const iconMap: Record<
  TimelineEventType,
  { Icon: typeof AlertTriangle; className: string }
> = {
  alert: {
    Icon: AlertTriangle,
    className: "text-amber-400",
  },
  anomaly: {
    Icon: Brain,
    className: "text-primary",
  },
  fix: {
    Icon: Wrench,
    className: "text-sky-400",
  },
  success: {
    Icon: CheckCircle,
    className: "text-emerald-400",
  },
}

function formatEventTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return iso
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(d)
}

export type TimelineProps = {
  className?: string
  /** Stagger between rows in ms (fade-in). */
  staggerMs?: number
}

export function Timeline({ className, staggerMs = 70 }: TimelineProps) {
  const timeline = useDashboardStore(useShallow((s) => s.timeline))

  const sortedTimeline = useMemo(() => {
    const safeTimeline = Array.isArray(timeline) ? timeline : []
    return [...safeTimeline].sort((a, b) => {
      const t1 = new Date(a?.timestamp || 0).getTime()
      const t2 = new Date(b?.timestamp || 0).getTime()
      const n1 = Number.isFinite(t1) ? t1 : 0
      const n2 = Number.isFinite(t2) ? t2 : 0
      return n2 - n1
    })
  }, [timeline])

  if (sortedTimeline.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No events yet.
      </p>
    )
  }

  return (
    <div className={cn("relative", className)}>
      <div
        className="absolute left-[17px] top-3 bottom-3 w-px bg-border"
        aria-hidden
      />
      <ul className="relative space-y-0" role="list">
        {sortedTimeline.map((event, index) => {
          const iconKind = EVENT_TYPE_TO_ICON[event.type] ?? "anomaly"
          const { Icon, className: iconClass } = iconMap[iconKind]
          const serviceLabel =
            event.service != null && event.service.trim() !== ""
              ? formatServiceLabel(event.service)
              : "—"
          return (
            <li
              key={`${event.timestamp}-${index}-${event.type}`}
              className="animate-timeline-enter"
              style={{
                animationDelay: `${index * staggerMs}ms`,
              }}
            >
              <div className="flex gap-4 py-4 first:pt-0 last:pb-0">
                <div
                  className="relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border border-white/[0.1] bg-card/95 shadow-elevation-sm ring-2 ring-background backdrop-blur-sm"
                  aria-hidden
                >
                  <Icon className={cn("size-4", iconClass)} strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="font-mono text-xs font-semibold leading-tight text-foreground">
                        {event.type}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        · {serviceLabel}
                      </span>
                    </div>
                    <time
                      className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground"
                      dateTime={event.timestamp}
                    >
                      {formatEventTime(event.timestamp)}
                    </time>
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
