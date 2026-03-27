import {
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
} from "recharts"

import { cn } from "@/lib/utils"

export type AnomalyGaugeProps = {
  /** Anomaly level 0–100 (%). */
  percentage: number
  /** Omit outer title block when nested (e.g. incident flow step). */
  embedded?: boolean
  className?: string
}

function clampPct(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.min(100, Math.max(0, n))
}

function colorForPercentage(pct: number): string {
  if (pct < 30) return "#22c55e"
  if (pct <= 70) return "#eab308"
  return "#ef4444"
}

const CHART_DATA_KEY = "value"

export function AnomalyGauge({
  percentage,
  embedded = false,
  className,
}: AnomalyGaugeProps) {
  const pct = clampPct(percentage)
  const barColor = colorForPercentage(pct)
  const isCritical = pct > 70
  const data = [{ name: "anomaly", [CHART_DATA_KEY]: pct, fill: barColor }]

  return (
    <div
      className={cn(
        "premium-surface relative w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-card/80 shadow-elevation-sm backdrop-blur-xl transition-[opacity,transform,box-shadow,background-color] duration-300 ease-out supports-[backdrop-filter]:bg-card/68",
        isCritical && "animate-critical-glow",
        className,
      )}
    >
      {!embedded ? (
        <header className="border-b border-white/[0.06] px-6 py-5">
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
            Anomaly detection
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            Composite risk across services and the process chain.
          </p>
        </header>
      ) : null}
      <div
        className={cn(
          "relative mx-auto aspect-square w-full max-w-[280px] px-6 sm:max-w-[300px]",
          embedded ? "pb-4 pt-2" : "pb-6 pt-5",
        )}
      >
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            data={data}
            startAngle={90}
            endAngle={-270}
            innerRadius="58%"
            outerRadius="100%"
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              angleAxisId={0}
              tick={false}
              axisLine={false}
            />
            <RadialBar
              angleAxisId={0}
              dataKey={CHART_DATA_KEY}
              cornerRadius={10}
              background={{
                fill: "hsl(220 11% 18% / 0.65)",
              }}
              fill={barColor}
              isAnimationActive
              animationBegin={0}
              animationDuration={900}
              animationEasing="ease-out"
            />
          </RadialBarChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-2">
          <span
            className="text-[2.75rem] font-bold leading-none tracking-tight tabular-nums sm:text-[3.25rem]"
            style={{ color: barColor }}
          >
            {Math.round(pct)}
            <span className="text-[0.45em] font-semibold opacity-90">%</span>
          </span>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Live score
          </p>
        </div>
      </div>
    </div>
  )
}
