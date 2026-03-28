import { useMemo } from "react"
import { useShallow } from "zustand/react/shallow"
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { TooltipPayload } from "recharts"

import { mapMetricsToChartData } from "@/lib/orchestratorViewMappers"
import { cn } from "@/lib/utils"
import { useDashboardStore } from "@/store/useDashboardStore"
import type { MetricsDatum } from "@/types"

export type { MetricsDatum } from "@/types"

/** Theme — align with CSS variables / dark shell */
const GRID_STROKE = "hsl(222 14% 18%)"
const AXIS_TICK = { fill: "hsl(220 9% 52%)", fontSize: 11 }
const TOOLTIP_BG = "hsl(220 14% 9%)"
const TOOLTIP_BORDER = "hsl(220 10% 20%)"

const LINE_LATENCY = "hsl(250 72% 68%)"
const LINE_ERROR = "hsl(160 55% 48%)"
const PEAK_LAT = "hsl(38 96% 54%)"
const PEAK_ERR = "hsl(12 85% 58%)"

const ANIMATION_MS = 1100

type EnrichedDatum = MetricsDatum & {
  latPeak: boolean
  errPeak: boolean
}

function isLocalMax(
  values: number[],
  i: number,
): boolean {
  const n = values.length
  if (n <= 1) return false
  const v = values[i]
  if (i === 0) return v > values[1]
  if (i === n - 1) return v > values[i - 1]
  return v >= values[i - 1] && v >= values[i + 1] && (v > values[i - 1] || v > values[i + 1])
}

/** ms — sharp step-up vs previous bucket (synthetic anomaly marker). */
const LAT_JUMP_MIN = 45
/** % — sharp error step-up */
const ERR_JUMP_MIN = 0.18

function enrichData(
  data: MetricsDatum[],
  latencyWarn: number,
  errorWarn: number,
): EnrichedDatum[] {
  const lat = data.map((d) => d.latency)
  const err = data.map((d) => d.error_rate)
  return data.map((d, i) => {
    const latJump =
      i > 0 &&
      d.latency - data[i - 1].latency >= LAT_JUMP_MIN &&
      d.latency >= latencyWarn
    const errJump =
      i > 0 &&
      d.error_rate - data[i - 1].error_rate >= ERR_JUMP_MIN &&
      d.error_rate >= errorWarn
    const latPeak =
      (isLocalMax(lat, i) && d.latency >= latencyWarn) || latJump
    const errPeak =
      (isLocalMax(err, i) && d.error_rate >= errorWarn) || errJump
    return { ...d, latPeak, errPeak }
  })
}

function MetricsTooltip({
  active,
  payload,
  label,
  latencyCrit,
  latencyWarn,
  errorCrit,
  errorWarn,
}: {
  active?: boolean
  label?: string | number
  payload?: TooltipPayload
  latencyCrit: number
  latencyWarn: number
  errorCrit: number
  errorWarn: number
}) {
  if (!active || !payload?.length) {
    return null
  }

  const row = payload[0]?.payload as EnrichedDatum | undefined
  const lat = payload.find((p) => String(p.dataKey) === "latency")
  const err = payload.find((p) => String(p.dataKey) === "error_rate")

  const latVal = typeof lat?.value === "number" ? lat.value : null
  const errVal = typeof err?.value === "number" ? err.value : null

  const latSeverity =
    latVal != null
      ? latVal >= latencyCrit
        ? "critical"
        : latVal >= latencyWarn
          ? "warn"
          : "ok"
      : null
  const errSeverity =
    errVal != null
      ? errVal >= errorCrit
        ? "critical"
        : errVal >= errorWarn
          ? "warn"
          : "ok"
      : null

  return (
    <div
      className="max-w-[280px] rounded-lg border px-3.5 py-3 text-xs shadow-xl"
      style={{
        backgroundColor: TOOLTIP_BG,
        borderColor: TOOLTIP_BORDER,
        boxShadow: "0 12px 40px rgb(0 0 0 / 0.45)",
      }}
    >
      <p className="mb-2 font-medium tabular-nums text-foreground">{label}</p>

      <ul className="space-y-2 border-b border-border/60 pb-2.5">
        {lat && (
          <li className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Latency</span>
              <span
                className={cn(
                  "font-mono font-medium tabular-nums",
                  latSeverity === "critical" && "text-red-400",
                  latSeverity === "warn" && "text-amber-400",
                  latSeverity === "ok" && "text-[hsl(250_72%_72%)]",
                )}
              >
                {typeof lat.value === "number"
                  ? `${lat.value.toLocaleString()} ms`
                  : lat.value}
              </span>
            </div>
            {latSeverity === "critical" ? (
              <span className="text-[10px] font-medium uppercase tracking-wide text-red-400/90">
                Above critical SLO
              </span>
            ) : latSeverity === "warn" ? (
              <span className="text-[10px] font-medium uppercase tracking-wide text-amber-400/90">
                Above warning threshold
              </span>
            ) : null}
          </li>
        )}
        {err && (
          <li className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Error rate</span>
              <span
                className={cn(
                  "font-mono font-medium tabular-nums",
                  errSeverity === "critical" && "text-red-400",
                  errSeverity === "warn" && "text-amber-400",
                  errSeverity === "ok" && "text-emerald-400/90",
                )}
              >
                {typeof err.value === "number"
                  ? `${err.value.toFixed(2)}%`
                  : err.value}
              </span>
            </div>
            {errSeverity === "critical" ? (
              <span className="text-[10px] font-medium uppercase tracking-wide text-red-400/90">
                Error budget burn
              </span>
            ) : errSeverity === "warn" ? (
              <span className="text-[10px] font-medium uppercase tracking-wide text-amber-400/90">
                Elevated errors
              </span>
            ) : null}
          </li>
        )}
      </ul>

      {row?.latPeak || row?.errPeak ? (
        <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-amber-400/85">
          {row.latPeak && row.errPeak
            ? "Latency & error peak"
            : row.latPeak
              ? "Latency peak"
              : "Error rate peak"}
        </p>
      ) : null}

      {row?.insight ? (
        <p className="mt-2 leading-relaxed text-[11px] text-muted-foreground">
          {row.insight}
        </p>
      ) : (
        <p className="mt-2 text-[11px] italic text-muted-foreground/80">
          Within expected range for this window.
        </p>
      )}
    </div>
  )
}

export type MetricsChartProps = {
  className?: string
  /** Chart height in px */
  height?: number
  /** Latency warning reference (ms). */
  latencyWarnMs?: number
  /** Latency critical / SLO reference (ms). */
  latencyCritMs?: number
  /** Error rate warning threshold (%). */
  errorWarnPct?: number
  /** Error rate critical threshold (%). */
  errorCritPct?: number
}

export function MetricsChart({
  className,
  height = 320,
  latencyWarnMs = 95,
  latencyCritMs = 380,
  errorWarnPct = 0.38,
  errorCritPct = 1.0,
}: MetricsChartProps) {
  const metrics = useDashboardStore(useShallow((s) => s.metrics))

  const data = useMemo(
    () => mapMetricsToChartData(metrics),
    [metrics],
  )

  const enriched = useMemo(
    () => enrichData(data, latencyWarnMs, errorWarnPct),
    [data, latencyWarnMs, errorWarnPct],
  )

  const latencyPeaks = enriched.filter((d) => d.latPeak)
  const errorPeaks = enriched.filter((d) => d.errPeak)

  const maxLat =
    data.length > 0
      ? Math.max(...data.map((d) => d.latency), latencyCritMs) * 1.08
      : latencyCritMs
  const maxErr =
    data.length > 0
      ? Math.max(...data.map((d) => d.error_rate), errorCritPct) * 1.12
      : errorCritPct

  if (data.length === 0) {
    return (
      <div
        className={cn(
          "flex w-full min-w-0 items-center justify-center rounded-lg border border-dashed border-border bg-muted/15 px-4 text-center",
          className,
        )}
        style={{ height, minHeight: height }}
      >
        <p className="max-w-sm text-sm text-muted-foreground">
          No metrics data yet. Polls will populate the chart from the orchestrator.
        </p>
      </div>
    )
  }

  return (
    <div
      className={cn("w-full min-w-0", className)}
      style={{ height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={enriched}
          margin={{ top: 10, right: 8, left: 0, bottom: 4 }}
        >
          <defs>
            <linearGradient id="metricsLatencyArea" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="hsl(250 72% 58%)"
                stopOpacity={0.32}
              />
              <stop
                offset="55%"
                stopColor="hsl(250 72% 58%)"
                stopOpacity={0.08}
              />
              <stop
                offset="100%"
                stopColor="hsl(250 72% 58%)"
                stopOpacity={0}
              />
            </linearGradient>
            <linearGradient id="metricsLatencyStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="hsl(250 65% 58%)" />
              <stop offset="50%" stopColor="hsl(265 75% 68%)" />
              <stop offset="100%" stopColor="hsl(280 72% 62%)" />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke={GRID_STROKE}
            vertical={false}
          />

          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={AXIS_TICK}
            dy={6}
            interval={0}
          />

          <YAxis
            yAxisId="latency"
            axisLine={false}
            tickLine={false}
            tick={AXIS_TICK}
            width={48}
            domain={[0, maxLat]}
            tickFormatter={(v) =>
              v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`
            }
            label={{
              value: "Latency (ms)",
              position: "insideTopLeft",
              offset: -2,
              fill: "hsl(220 9% 45%)",
              fontSize: 10,
            }}
          />

          <YAxis
            yAxisId="error"
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={AXIS_TICK}
            width={40}
            domain={[0, maxErr]}
            tickFormatter={(v) => `${v.toFixed(1)}%`}
            label={{
              value: "Errors (%)",
              position: "insideTopRight",
              offset: -2,
              fill: "hsl(220 9% 45%)",
              fontSize: 10,
            }}
          />

          <ReferenceLine
            yAxisId="latency"
            y={latencyWarnMs}
            stroke="hsl(38 90% 50%)"
            strokeDasharray="5 4"
            strokeOpacity={0.65}
            label={{
              value: `Warn ${latencyWarnMs} ms`,
              position: "insideBottomRight",
              fill: "hsl(38 85% 55%)",
              fontSize: 10,
            }}
          />
          <ReferenceLine
            yAxisId="latency"
            y={latencyCritMs}
            stroke="hsl(0 72% 52%)"
            strokeDasharray="6 4"
            strokeOpacity={0.75}
            label={{
              value: `SLO ${latencyCritMs} ms`,
              position: "insideTopRight",
              fill: "hsl(0 70% 58%)",
              fontSize: 10,
            }}
          />
          <ReferenceLine
            yAxisId="error"
            y={errorWarnPct}
            stroke="hsl(38 90% 50%)"
            strokeDasharray="5 4"
            strokeOpacity={0.55}
            label={{
              value: `Warn ${errorWarnPct}%`,
              position: "insideBottomLeft",
              fill: "hsl(38 85% 55%)",
              fontSize: 10,
            }}
          />
          <ReferenceLine
            yAxisId="error"
            y={errorCritPct}
            stroke="hsl(0 72% 52%)"
            strokeDasharray="6 4"
            strokeOpacity={0.65}
            label={{
              value: `Crit ${errorCritPct}%`,
              position: "insideTopLeft",
              fill: "hsl(0 70% 58%)",
              fontSize: 10,
            }}
          />

          <Tooltip
            content={(props) => (
              <MetricsTooltip
                {...props}
                latencyCrit={latencyCritMs}
                latencyWarn={latencyWarnMs}
                errorCrit={errorCritPct}
                errorWarn={errorWarnPct}
              />
            )}
            cursor={{
              stroke: "hsl(220 10% 35%)",
              strokeWidth: 1,
              strokeDasharray: "4 4",
            }}
            animationDuration={200}
          />

          <Legend
            verticalAlign="top"
            height={32}
            formatter={(value) => (
              <span className="text-[11px] text-muted-foreground">{value}</span>
            )}
          />

          <Area
            yAxisId="latency"
            type="monotone"
            dataKey="latency"
            name="Latency area"
            legendType="none"
            fill="url(#metricsLatencyArea)"
            stroke="none"
            isAnimationActive
            animationDuration={ANIMATION_MS}
            animationEasing="ease-in-out"
          />

          <Line
            yAxisId="latency"
            type="monotone"
            dataKey="latency"
            name="Latency"
            stroke="url(#metricsLatencyStroke)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{
              r: 6,
              strokeWidth: 2,
              stroke: "hsl(220 14% 10%)",
              fill: LINE_LATENCY,
            }}
            isAnimationActive
            animationDuration={ANIMATION_MS}
            animationEasing="ease-in-out"
          />

          <Line
            yAxisId="error"
            type="monotone"
            dataKey="error_rate"
            name="Error rate"
            stroke={LINE_ERROR}
            strokeWidth={2.25}
            dot={false}
            activeDot={{
              r: 5,
              strokeWidth: 2,
              stroke: "hsl(220 14% 10%)",
              fill: LINE_ERROR,
            }}
            isAnimationActive
            animationBegin={180}
            animationDuration={ANIMATION_MS}
            animationEasing="ease-in-out"
          />

          {latencyPeaks.map((d, i) => (
            <ReferenceDot
              key={`lat-peak-${String(d.label)}-${i}`}
              x={d.label}
              y={d.latency}
              yAxisId="latency"
              r={7}
              fill={PEAK_LAT}
              stroke="hsl(220 14% 8%)"
              strokeWidth={2}
              ifOverflow="hidden"
            />
          ))}
          {errorPeaks.map((d, i) => (
            <ReferenceDot
              key={`err-peak-${String(d.label)}-${i}`}
              x={d.label}
              y={d.error_rate}
              yAxisId="error"
              r={6}
              fill={PEAK_ERR}
              stroke="hsl(220 14% 8%)"
              strokeWidth={2}
              ifOverflow="hidden"
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
