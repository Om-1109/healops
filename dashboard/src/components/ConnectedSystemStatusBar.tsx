import { useMemo } from "react"
import { useShallow } from "zustand/react/shallow"

import {
  apiStatusToSystemStatus,
  headerRootCauseDisplay,
} from "@/lib/orchestratorViewMappers"
import { useDashboardStore } from "@/store/useDashboardStore"
import type { ActionBarStatus } from "@/types"

import { SystemStatusBar } from "./SystemStatusBar"

/** Status strip driven only by `useDashboardStore` (orchestrator API). */
export function ConnectedSystemStatusBar() {
  const { systemStatus, insights, currentIncident } = useDashboardStore(
    useShallow((s) => ({
      systemStatus: s.systemStatus,
      insights: s.insights,
      currentIncident: s.currentIncident,
    })),
  )

  const rootCauseService = useMemo(
    () => headerRootCauseDisplay(currentIncident, insights, systemStatus),
    [currentIncident, insights, systemStatus],
  )

  const systemStatusVariant = useMemo(
    () => apiStatusToSystemStatus(systemStatus?.status),
    [systemStatus?.status],
  )

  const autoFixState: ActionBarStatus = useMemo(() => {
    const af = systemStatus?.auto_fix?.toLowerCase() ?? ""
    if (af === "running") return "fixing"
    return "monitoring"
  }, [systemStatus?.auto_fix])

  return (
    <SystemStatusBar
      systemStatus={systemStatusVariant}
      rootCauseService={rootCauseService}
      autoFixState={autoFixState}
    />
  )
}
