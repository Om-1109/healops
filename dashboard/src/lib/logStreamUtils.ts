import type { LogLine } from "@/types"

/** Normalize service key for grouping and filters. */
export function inferServiceId(line: LogLine): string {
  if (line.service?.trim()) {
    return line.service.trim().toLowerCase().replace(/\s+/g, "_")
  }
  const m = line.message.match(/^([a-z0-9_-]+)\s*:/i)
  return m ? m[1].toLowerCase() : "platform"
}

export function formatServiceLabel(id: string): string {
  if (id === "platform") return "Platform"
  return id
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

/** Deterministic “AI-style” bullets from raw log lines (demo / offline). */
export function buildLogEventSummary(lines: LogLine[]): string[] {
  if (lines.length === 0) {
    return ["No log lines in this window."]
  }

  const errors = lines.filter((l) => l.level === "ERROR")
  const warns = lines.filter((l) => l.level === "WARN")
  const bullets: string[] = []

  if (errors.length > 0) {
    const e = errors[0]
    const svc = formatServiceLabel(inferServiceId(e))
    const snippet =
      e.message.length > 140 ? `${e.message.slice(0, 137)}…` : e.message
    bullets.push(
      `**${errors.length} error${errors.length > 1 ? "s" : ""}** — worst in **${svc}**: ${snippet}`,
    )
  }

  if (warns.length > 0) {
    const svcSet = new Set(warns.map((l) => formatServiceLabel(inferServiceId(l))))
    const names = [...svcSet].slice(0, 4).join(", ")
    const more = svcSet.size > 4 ? ` (+${svcSet.size - 4} more)` : ""
    bullets.push(
      `**${warns.length} warning${warns.length > 1 ? "s" : ""}** involving ${names}${more}.`,
    )
  }

  if (errors.length === 0 && warns.length === 0) {
    bullets.push(
      "**Healthy window** — only informational events; no warnings or errors.",
    )
  } else {
    const lastInfo = [...lines]
      .reverse()
      .find((l) => l.level === "INFO")
    if (lastInfo) {
      bullets.push(
        `Latest stable signal: **${formatServiceLabel(inferServiceId(lastInfo))}** — ${lastInfo.message.length > 100 ? `${lastInfo.message.slice(0, 97)}…` : lastInfo.message}`,
      )
    }
  }

  return bullets.slice(0, 5)
}
