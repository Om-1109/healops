import type { MetricsDatum } from "@/types"

/** Demo time series — replace with orchestrator / metrics API. */
export const SAMPLE_METRICS_DATA: MetricsDatum[] = [
  { label: "−30m", latency: 48, error_rate: 0.12 },
  { label: "−25m", latency: 55, error_rate: 0.18 },
  { label: "−20m", latency: 62, error_rate: 0.22 },
  {
    label: "−15m",
    latency: 118,
    error_rate: 0.45,
    insight:
      "Ramp begins: payment dependency p95 crossed warn threshold. Partial timeouts observed on retries.",
  },
  {
    label: "−10m",
    latency: 210,
    error_rate: 0.88,
    insight:
      "Cascade: order finalization blocked behind payment retries — queue depth rising, error rate climbing.",
  },
  {
    label: "−5m",
    latency: 890,
    error_rate: 2.1,
    insight:
      "Peak anomaly: simulated payment failure mode active; end-to-end latency spike aligns with critical SLO breach.",
  },
  {
    label: "Now",
    latency: 320,
    error_rate: 1.05,
    insight:
      "Post-remediation cooldown: latency recovering; errors elevated vs baseline until caches TTL.",
  },
]
