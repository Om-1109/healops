import type { ReactNode } from "react"

import { IncidentFlow } from "@/components/IncidentFlow"
import type { IncidentFlowStep } from "@/components/IncidentFlow"

export type NormalViewProps = {
  steps: IncidentFlowStep[]
  /** Which incident steps start expanded. */
  defaultOpenIds?: string[]
  className?: string
  children?: ReactNode
}

/**
 * Default incident narrative: full `IncidentFlow` accordion (used for normal and incident follow-on steps).
 */
export function NormalView({
  steps,
  defaultOpenIds,
  className,
}: NormalViewProps) {
  return (
    <IncidentFlow
      className={className}
      defaultOpenIds={defaultOpenIds}
      steps={steps}
    />
  )
}
