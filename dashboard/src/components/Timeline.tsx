import { AlertTriangle, Brain, CheckCircle, Wrench } from "lucide-react"
import { useMemo } from "react"

import { cn } from "@/lib/utils"
import type { TimelineEvent, TimelineEventType } from "@/types"

export type { TimelineEvent, TimelineEventType } from "@/types"

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

function sortNewestFirst(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  )
}

export type TimelineProps = {
  events: TimelineEvent[]
  className?: string
  /** Stagger between rows in ms (fade-in). */
  staggerMs?: number
}

export function Timeline({
  events,
  className,
  staggerMs = 70,
}: TimelineProps) {
  const sorted = useMemo(() => sortNewestFirst(events), [events])

  if (sorted.length === 0) {
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
        {sorted.map((event, index) => {
          const { Icon, className: iconClass } = iconMap[event.type]
          return (
            <li
              key={event.id}
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
                      <span className="font-semibold leading-tight text-foreground">
                        {event.description}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        · {event.serviceName}
                      </span>
                    </div>
                    <time
                      className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground"
                      dateTime={event.at}
                    >
                      {formatEventTime(event.at)}
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
