import { AlertTriangle, Brain, Network, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatServiceLabel } from "@/lib/logStreamUtils"
import { cn } from "@/lib/utils"
import { useDashboardStore } from "@/store/useDashboardStore"

export type RCAPanelProps = {
  /** Omit card chrome header when nested in a parent step. */
  embedded?: boolean
  className?: string
}

function clampConfidencePercent(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.min(100, Math.max(0, n))
}

/** API may send 0–1 or 0–100 */
function confidenceToPercent(raw: number): number {
  if (Number.isNaN(raw)) return 0
  const scaled = raw > 1 ? raw : raw * 100
  return clampConfidencePercent(Math.round(scaled))
}

function emphasizeInText(text: string, phrases: string[]): ReactNode {
  const unique = [...new Set(phrases.filter(Boolean))]
  if (unique.length === 0) {
    return text
  }

  const escaped = [...unique]
    .sort((a, b) => b.length - a.length)
    .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))

  const re = new RegExp(`(${escaped.join("|")})`, "gi")
  const parts = text.split(re)

  return (
    <>
      {parts.map((part, i) => {
        const matched = unique.find(
          (p) => p.toLowerCase() === part.toLowerCase(),
        )
        if (matched) {
          return (
            <strong
              key={`${i}-${part.slice(0, 12)}`}
              className="font-semibold text-foreground"
            >
              {part}
            </strong>
          )
        }
        return <span key={`${i}-${part.slice(0, 8)}`}>{part}</span>
      })}
    </>
  )
}

function Section({
  icon: Icon,
  label,
  children,
  iconClassName,
}: {
  icon: LucideIcon
  label: string
  children: ReactNode
  iconClassName?: string
}) {
  return (
    <div className="rounded-lg bg-muted/25 px-4 py-3">
      <div className="mb-2 flex items-center gap-2">
        <Icon
          className={cn("size-3.5 shrink-0 opacity-80", iconClassName)}
          aria-hidden
        />
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="text-sm leading-relaxed text-foreground">{children}</div>
    </div>
  )
}

export function RCAPanel({ embedded = false, className }: RCAPanelProps) {
  const currentIncident = useDashboardStore((s) => s.currentIncident)
  const systemStatus = useDashboardStore((s) => s.systemStatus)
  const isHealthy =
    systemStatus?.status?.toLowerCase() === "healthy"

  if (!currentIncident?.service?.trim()) {
    return (
      <Card
        className={cn(
          "h-full min-h-0 border-white/[0.08] bg-card text-card-foreground transition-[border-color,background-color] duration-500",
          !embedded && "premium-surface min-h-[280px] border-l-2 border-l-primary/55 shadow-elevation-sm",
          embedded && "border-0 bg-transparent shadow-none",
          className,
        )}
      >
        {!embedded ? (
          <CardHeader className="space-y-1 border-b border-white/[0.06] p-6 pb-4">
            <div className="flex items-start gap-3">
              <Brain
                className="mt-0.5 size-5 shrink-0 text-primary opacity-90"
                aria-hidden
              />
              <div>
                <CardTitle className="text-base font-medium leading-snug tracking-tight">
                  Root cause analysis
                </CardTitle>
                <CardDescription className="mt-1 text-xs leading-relaxed">
                  Human-readable correlation and impact.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        ) : null}
        <CardContent className={cn(embedded ? "p-0" : "p-6 pt-5")}>
          <p className="py-6 text-center text-sm font-medium text-muted-foreground">
            No incident yet
          </p>
        </CardContent>
      </Card>
    )
  }

  const serviceName = formatServiceLabel(currentIncident.service)
  const affectedServices = (currentIncident.affected ?? []).map((s) =>
    formatServiceLabel(s),
  )
  const explanation = currentIncident.rca_text
  const confidencePercent = confidenceToPercent(currentIncident.confidence)
  const emphasizedTerms = [
    serviceName,
    ...affectedServices,
    "downstream",
  ]

  return (
    <Card
      className={cn(
        "h-full min-h-0 border-white/[0.08] bg-card text-card-foreground transition-[border-color,background-color] duration-500",
        !embedded && "premium-surface min-h-[280px] border-l-2 border-l-primary/55 shadow-elevation-sm",
        embedded && "border-0 bg-transparent shadow-none",
        className,
      )}
    >
      {!embedded ? (
        <CardHeader className="space-y-1 border-b border-white/[0.06] p-6 pb-4">
          <div className="flex items-start gap-3">
            <Brain
              className="mt-0.5 size-5 shrink-0 text-primary opacity-90"
              aria-hidden
            />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base font-medium leading-snug tracking-tight">
                  Root cause analysis
                </CardTitle>
                {isHealthy ? (
                  <span className="inline-flex rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
                    Recovered
                  </span>
                ) : null}
              </div>
              <CardDescription className="mt-1 text-xs leading-relaxed">
                Human-readable correlation and impact.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      ) : null}

      <CardContent
        className={cn(
          "space-y-3 text-sm",
          embedded ? "p-0" : "p-6 pt-5",
        )}
      >
        {embedded && isHealthy ? (
          <span className="inline-flex rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
            Recovered
          </span>
        ) : null}
        <Section icon={AlertTriangle} label="Impacted service" iconClassName="text-amber-400">
          <p>
            The primary fault is attributed to{" "}
            <strong className="font-semibold text-foreground">{serviceName}</strong>
            .
          </p>
        </Section>

        <Section icon={Network} label="Affected services" iconClassName="text-sky-400/90">
          {affectedServices.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {affectedServices.map((name) => (
                <li
                  key={name}
                  className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5"
                >
                  <span className="size-1.5 rounded-full bg-primary" aria-hidden />
                  <strong className="font-semibold text-foreground">{name}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No upstream or peer services listed.</p>
          )}
        </Section>

        <Section icon={Brain} label="Explanation">
          <p className="text-muted-foreground">
            {emphasizeInText(explanation, emphasizedTerms)}
          </p>
        </Section>

        <div className="rounded-lg bg-muted/25 px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Confidence
            </span>
            <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
              {confidencePercent}%
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={confidencePercent}
            aria-label="RCA confidence"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-smooth"
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
