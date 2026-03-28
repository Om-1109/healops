import type { ReactNode } from "react"
import { createContext, useContext, useMemo } from "react"
import { useShallow } from "zustand/react/shallow"

import { useStabilizedServiceStatuses } from "@/hooks/useStabilizedServiceStatuses"
import { mapServiceHealthToGraphProps } from "@/lib/serviceHealthView"
import { useDashboardStore } from "@/store/useDashboardStore"
import type {
  DependencyGraphServiceId,
  DependencyGraphStatus,
} from "@/types"

const ServiceVisualStatusContext = createContext<Record<
  DependencyGraphServiceId,
  DependencyGraphStatus
> | null | undefined>(undefined)

export function ServiceVisualStatusProvider({ children }: { children: ReactNode }) {
  const servicesStatus = useDashboardStore(useShallow((s) => s.servicesStatus))

  const rawStatuses = useMemo(() => {
    if (!servicesStatus?.services?.length) return null
    return mapServiceHealthToGraphProps(servicesStatus.services).statuses
  }, [servicesStatus])

  const displayStatuses = useStabilizedServiceStatuses(rawStatuses)

  return (
    <ServiceVisualStatusContext.Provider value={displayStatuses}>
      {children}
    </ServiceVisualStatusContext.Provider>
  )
}

/** Shared stabilized statuses for the service chain graph and impacted service cards. */
export function useServiceVisualStatuses(): Record<
  DependencyGraphServiceId,
  DependencyGraphStatus
> | null {
  const ctx = useContext(ServiceVisualStatusContext)
  if (ctx === undefined) {
    throw new Error(
      "useServiceVisualStatuses must be used within ServiceVisualStatusProvider",
    )
  }
  return ctx
}
