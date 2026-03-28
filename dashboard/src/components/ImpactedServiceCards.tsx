import { useShallow } from "zustand/react/shallow"

import { useServiceVisualStatuses } from "@/context/ServiceVisualStatusContext"
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatServiceLabel } from "@/lib/logStreamUtils"
import { GRAPH_SERVICE_ORDER, mapServiceHealthToCardProps } from "@/lib/serviceHealthView"
import { cn } from "@/lib/utils"
import { useDashboardStore } from "@/store/useDashboardStore"
import type { DependencyGraphServiceId } from "@/types"

import { ServiceCard, type ServiceCardStatus } from "./ServiceCard"

function ServiceCardLoadingShell({ className }: { className?: string }) {
  return (
    <Card
      className={cn(
        "premium-surface border border-white/[0.08] bg-card transition-[border-left-color,background-color,box-shadow] duration-500 ease-smooth border-l-2 border-l-muted",
        className,
      )}
    >
      <CardHeader className="space-y-0 p-5 pb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-5 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-3/5 max-w-[140px]" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="size-4 shrink-0 rounded" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-5 pt-0">
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[52px] rounded-md" />
          ))}
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </CardContent>
    </Card>
  )
}

function ServiceCardEmptySlot({ id }: { id: DependencyGraphServiceId }) {
  const label = formatServiceLabel(id)
  return (
    <Card className="premium-surface border border-dashed border-border bg-card/40">
      <CardHeader className="p-5 pb-2">
        <p className="text-[15px] font-semibold text-foreground">{label}</p>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        <p className="text-xs text-muted-foreground">No health row for this service yet.</p>
      </CardContent>
    </Card>
  )
}

export function ImpactedServiceCards({ className }: { className?: string }) {
  const servicesStatus = useDashboardStore(
    useShallow((s) => s.servicesStatus),
  )
  const displayStatuses = useServiceVisualStatuses()

  if (servicesStatus === null) {
    return (
      <>
        {GRAPH_SERVICE_ORDER.map((id) => (
          <ServiceCardLoadingShell key={id} />
        ))}
      </>
    )
  }

  if (servicesStatus.services.length === 0) {
    return (
      <div
        className={cn(
          "col-span-full flex min-h-[140px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/15 px-4 py-8 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        No service health data from the orchestrator yet.
      </div>
    )
  }

  return (
    <>
      {GRAPH_SERVICE_ORDER.map((id) => {
        const props = mapServiceHealthToCardProps(id, servicesStatus.services)
        if (!props) {
          return <ServiceCardEmptySlot key={id} id={id} />
        }
        const visualStatus = (displayStatuses?.[id] ??
          props.status) as ServiceCardStatus
        return (
          <ServiceCard key={id} {...props} status={visualStatus} />
        )
      })}
    </>
  )
}
