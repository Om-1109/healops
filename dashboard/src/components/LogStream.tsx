import { Sparkles } from "lucide-react"
import { useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  buildLogEventSummary,
  formatServiceLabel,
  inferServiceId,
} from "@/lib/logStreamUtils"
import { cn } from "@/lib/utils"
import type { LogLevel, LogLine } from "@/types"

export type { LogLevel, LogLine } from "@/types"

const levelRowBg: Record<LogLevel, string> = {
  ERROR: "bg-red-500/[0.06] hover:bg-red-500/[0.1]",
  WARN: "bg-yellow-500/[0.05] hover:bg-yellow-500/[0.09]",
  INFO: "bg-transparent hover:bg-muted/20",
}

/** Renders `**bold**` in summary bullets as strong. */
function SummaryBullet({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <p className="text-xs leading-relaxed text-muted-foreground">
      {parts.map((part, i) => {
        const m = part.match(/^\*\*([^*]+)\*\*$/)
        if (m) {
          return (
            <strong key={i} className="font-medium text-foreground">
              {m[1]}
            </strong>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </p>
  )
}

type SeverityFilter = "all" | "errors-warns" | "errors"

function passesSeverity(level: LogLevel, f: SeverityFilter): boolean {
  if (f === "all") return true
  if (f === "errors") return level === "ERROR"
  return level === "ERROR" || level === "WARN"
}

export type LogStreamProps = {
  lines: LogLine[]
  className?: string
  compact?: boolean
  /** Show shimmer placeholders instead of log rows (e.g. while fetching). */
  loading?: boolean
  /** Replace auto-generated “AI” summary bullets. */
  summaryBullets?: string[]
}

export function LogStream({
  lines,
  className,
  compact = false,
  loading = false,
  summaryBullets: summaryOverride,
}: LogStreamProps) {
  const logRef = useRef<HTMLDivElement>(null)
  const [serviceFilter, setServiceFilter] = useState<string>("all")
  const [severityFilter, setSeverityFilter] =
    useState<SeverityFilter>("all")

  const serviceOptions = useMemo(() => {
    const set = new Set(lines.map(inferServiceId))
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [lines])

  const summary = useMemo(
    () => summaryOverride ?? buildLogEventSummary(lines),
    [lines, summaryOverride],
  )

  const filtered = useMemo(() => {
    return lines.filter((l) => {
      const sid = inferServiceId(l)
      if (serviceFilter !== "all" && sid !== serviceFilter) return false
      return passesSeverity(l.level, severityFilter)
    })
  }, [lines, serviceFilter, severityFilter])

  const orderedLogs = useMemo(() => {
    return [...filtered].sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
    )
  }, [filtered])

  const clearFilters =
    serviceFilter !== "all" || severityFilter !== "all"

  return (
    <div
      className={cn(
        "premium-surface flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-card/82 shadow-elevation-sm backdrop-blur-xl supports-[backdrop-filter]:bg-card/70",
        className,
      )}
    >
      <div
        className={cn(
          "border-b border-white/[0.06] bg-muted/20 backdrop-blur-sm",
          compact ? "p-3" : "p-4",
        )}
      >
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/12 ring-1 ring-primary/20">
            <Sparkles
              className="size-4 text-primary"
              strokeWidth={1.75}
              aria-hidden
            />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
              AI Summary of Events
            </h3>
            <p className="text-[12px] leading-snug text-muted-foreground">
              Plain-language readout — not a live LLM in this demo
            </p>
          </div>
        </div>
        <ul className="mt-3 space-y-2.5" aria-label="Event summary">
          {loading
            ? Array.from({ length: 3 }, (_, i) => (
                <li key={i} className="flex gap-2">
                  <Skeleton className="mt-1.5 size-1 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-full max-w-md" />
                    <Skeleton className="h-3 w-4/5 max-w-sm opacity-80" />
                  </div>
                </li>
              ))
            : summary.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span
                    className="mt-1.5 size-1 shrink-0 rounded-full bg-primary/70"
                    aria-hidden
                  />
                  <SummaryBullet text={s} />
                </li>
              ))}
        </ul>
      </div>

      <div
        className={cn(
          "flex flex-col gap-3 border-b border-white/[0.06] sm:flex-row sm:items-center sm:justify-between",
          compact ? "px-3 py-2.5" : "px-4 py-3",
        )}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger
              aria-label="Filter by service"
              className="h-8 w-[160px] border-border bg-background text-xs"
            >
              <SelectValue placeholder="Service" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All services</SelectItem>
              {serviceOptions.map((id) => (
                <SelectItem key={id} value={id}>
                  {formatServiceLabel(id)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={severityFilter}
            onValueChange={(v) => setSeverityFilter(v as SeverityFilter)}
          >
            <SelectTrigger
              aria-label="Filter by severity"
              className="h-8 w-[180px] border-white/[0.1] bg-background/80 text-xs backdrop-blur-sm"
            >
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem value="errors-warns">Errors &amp; warnings</SelectItem>
              <SelectItem value="errors">Errors only</SelectItem>
            </SelectContent>
          </Select>

          {clearFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground"
              onClick={() => {
                setServiceFilter("all")
                setSeverityFilter("all")
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </div>
        <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {filtered.length}/{lines.length} events
        </p>
      </div>

      <div
        ref={logRef}
        className={cn(
          "h-64 overflow-y-auto overflow-x-auto",
          compact ? "bg-[#07080c]" : "bg-[#080a0f]",
        )}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {loading ? (
          <div className="space-y-0 px-4 py-3" aria-busy="true" aria-label="Loading logs">
            {Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                className="flex gap-3 border-b border-white/[0.06] py-3 last:border-b-0"
              >
                <Skeleton className="size-7 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                  <div className="flex gap-2">
                    <Skeleton className="h-4 w-14 rounded" />
                    <Skeleton className="h-4 w-20 rounded" />
                  </div>
                  <Skeleton className="h-3.5 w-[92%] max-w-xl" />
                  <Skeleton className="h-3.5 w-[70%] max-w-lg opacity-90" />
                </div>
              </div>
            ))}
          </div>
        ) : orderedLogs.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No events match your filters.
          </p>
        ) : (
          orderedLogs.map((log) => (
            <div
              key={`${log.at}::${inferServiceId(log)}::${log.message}`}
              className={cn(
                "border-b border-white/[0.06] px-4 py-2 text-sm leading-snug",
                levelRowBg[log.level],
                log.level === "ERROR" && "text-red-100/95",
                log.level === "WARN" && "text-yellow-100/92",
                log.level === "INFO" && "text-neutral-300",
              )}
            >
              {log.message}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
