import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  ServerCrash,
  TrendingDown,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type ServiceCardStatus =
  | "healthy"
  | "degraded"
  | "critical"
  | "recovering"

export type ServiceCardProps = {
  name: string
  status: ServiceCardStatus
  latency: number
  error_rate: number
  request_count: number
  /** 0–1 typical (values above 1 are clamped). */
  anomaly_score: number
  className?: string
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.min(1, Math.max(0, n))
}

const statusConfig: Record<
  ServiceCardStatus,
  {
    label: string
    border: string
    labelClass: string
    barClass: string
  }
> = {
  healthy: {
    label: "Healthy",
    border: "border-l-2 border-l-emerald-500",
    labelClass: "text-emerald-400",
    barClass: "bg-emerald-500",
  },
  degraded: {
    label: "Degraded",
    border: "border-l-2 border-l-amber-500",
    labelClass: "text-amber-400",
    barClass: "bg-amber-500",
  },
  critical: {
    label: "Critical",
    border: "border-l-2 border-l-red-500",
    labelClass: "text-red-400",
    barClass: "bg-red-500",
  },
  recovering: {
    label: "Recovering",
    border: "border-l-2 border-l-sky-500",
    labelClass: "text-sky-400",
    barClass: "bg-sky-500",
  },
}

function StatusIcon({ status }: { status: ServiceCardStatus }) {
  const iconClass = "size-5 shrink-0"
  switch (status) {
    case "healthy":
      return <CheckCircle2 className={cn(iconClass, "text-emerald-400")} aria-hidden />
    case "degraded":
      return <AlertTriangle className={cn(iconClass, "text-amber-400")} aria-hidden />
    case "critical":
      return <ServerCrash className={cn(iconClass, "text-red-400")} aria-hidden />
    case "recovering":
      return (
        <Loader2
          className={cn(iconClass, "animate-spin text-sky-400")}
          aria-hidden
        />
      )
  }
}

export function ServiceCard({
  name,
  status,
  latency,
  error_rate,
  request_count,
  anomaly_score,
  className,
}: ServiceCardProps) {
  const cfg = statusConfig[status]
  const isCritical = status === "critical"
  const pct = clamp01(anomaly_score) * 100

  return (
    <Card
      className={cn(
        "premium-surface border border-white/[0.08] bg-card transition-[border-left-color,background-color,box-shadow,transform] duration-500 ease-smooth",
        cfg.border,
        isCritical && "animate-critical-glow",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 p-5 pb-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <StatusIcon status={status} />
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-semibold leading-tight tracking-tight text-foreground">
              {name}
            </h3>
            <p
              className={cn(
                "mt-1 inline-flex text-sm font-medium capitalize",
                cfg.labelClass,
              )}
            >
              {cfg.label}
            </p>
          </div>
        </div>
        <Activity
          className="size-4 shrink-0 text-muted-foreground opacity-60"
          aria-hidden
        />
      </CardHeader>

      <CardContent className="space-y-4 p-5 pt-0">
        <dl className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-md bg-muted/30 px-2 py-2 transition-[background-color,transform] duration-300 ease-out motion-safe:hover:bg-muted/45 motion-safe:hover:scale-[1.02] motion-reduce:hover:scale-100">
            <dt className="flex items-center gap-1 text-muted-foreground">
              <Clock className="size-3.5 shrink-0" aria-hidden />
              Latency
            </dt>
            <dd className="mt-0.5 font-mono font-medium tabular-nums text-foreground">
              {latency.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}{" "}
              <span className="text-muted-foreground">ms</span>
            </dd>
          </div>
          <div className="rounded-md bg-muted/30 px-2 py-2 transition-[background-color,transform] duration-300 ease-out motion-safe:hover:bg-muted/45 motion-safe:hover:scale-[1.02] motion-reduce:hover:scale-100">
            <dt className="flex items-center gap-1 text-muted-foreground">
              <TrendingDown className="size-3.5 shrink-0" aria-hidden />
              Errors
            </dt>
            <dd className="mt-0.5 font-mono font-medium tabular-nums text-foreground">
              {error_rate.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
              <span className="text-muted-foreground">%</span>
            </dd>
          </div>
          <div className="rounded-md bg-muted/30 px-2 py-2 transition-[background-color,transform] duration-300 ease-out motion-safe:hover:bg-muted/45 motion-safe:hover:scale-[1.02] motion-reduce:hover:scale-100">
            <dt className="text-muted-foreground">Requests</dt>
            <dd className="mt-0.5 font-mono font-medium tabular-nums text-foreground">
              {request_count.toLocaleString()}
            </dd>
          </div>
        </dl>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Anomaly</span>
            <span className="font-mono tabular-nums text-foreground">
              {(clamp01(anomaly_score) * 100).toFixed(0)}%
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pct)}
            aria-label="Anomaly score"
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-700 ease-smooth",
                pct > 0 && pct < 100 && status !== "healthy" && "progress-fill-shine",
                cfg.barClass,
                pct > 0 && "min-w-0.5",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
