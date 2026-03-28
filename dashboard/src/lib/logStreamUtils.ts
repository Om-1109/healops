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
