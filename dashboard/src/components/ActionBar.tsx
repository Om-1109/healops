import { Loader2 } from "lucide-react"
import type { RefObject } from "react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { orchestratorToggleFailure } from "@/api/client"
import { useDashboardStore } from "@/store/useDashboardStore"
import type { ActionBarStatus } from "@/types"
import { cn } from "@/lib/utils"

export type InjectionTarget = {
  value: string
  label: string
}

const DEFAULT_INJECTION_TARGETS: InjectionTarget[] = [
  { value: "api_gateway", label: "API Gateway" },
  { value: "order_service", label: "Order Service" },
  { value: "payment_service", label: "Payment Service" },
  { value: "inventory_service", label: "Inventory Service" },
]

export type ActionBarProps = {
  status: ActionBarStatus
  /**
   * Called when the user picks a service so parents (e.g. graph demos) can sync.
   */
  onSelectedServiceChange?: (service: string) => void
  injectionTargets?: InjectionTarget[]
  /** POST toggle-failure on the selected microservice host. */
  onInjectFailure: (service: string) => void | Promise<void>
  injectPending?: boolean
  /** Scrolls into view after inject (request chain section). */
  chainRef?: RefObject<HTMLDivElement | null>
  className?: string
}

export function ActionBar({
  status: _statusForShell,
  onSelectedServiceChange,
  injectionTargets = DEFAULT_INJECTION_TARGETS,
  onInjectFailure,
  injectPending = false,
  chainRef,
  className,
}: ActionBarProps) {
  void _statusForShell
  const [selectedService, setSelectedService] = useState("api_gateway")

  return (
    <div
      className={cn(
        "flex flex-col items-stretch gap-5 sm:flex-row sm:items-end",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex min-w-[200px] flex-1 flex-col gap-2 sm:max-w-xs">
          <span className="text-xs font-medium text-muted-foreground">
            Inject failure
          </span>
          {injectPending ? (
            <div className="space-y-2" aria-busy="true" aria-label="Injecting failure">
              <Skeleton className="h-9 w-full border-border" />
              <div className="flex gap-2">
                <Skeleton className="h-2 flex-1 rounded-full" />
                <Skeleton className="h-2 w-12 rounded-full" />
              </div>
            </div>
          ) : (
            <Select
              value={selectedService}
              onValueChange={(value) => {
                setSelectedService(value)
                onSelectedServiceChange?.(value)
              }}
            >
              <SelectTrigger
                id="inject-failure-target"
                aria-label="Inject failure: choose target service"
                className="h-9 w-full border-border bg-background"
              >
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent align="start" sideOffset={4}>
                {injectionTargets.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              className="h-9 min-w-[9.5rem]"
              disabled={!selectedService || injectPending}
              onClick={async () => {
                if (!selectedService) return
                console.log("Injecting:", selectedService)
                useDashboardStore.getState().beginInjectFailureTimer()
                try {
                  await orchestratorToggleFailure(selectedService)
                } catch (err) {
                  console.error("Inject request failed:", err)
                }
                await useDashboardStore.getState().refreshAll()
                chainRef?.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                })
                void onInjectFailure(selectedService)
              }}
            >
              {injectPending ? (
                <>
                  <Loader2
                    className="size-4 animate-spin"
                    strokeWidth={2}
                    aria-hidden
                  />
                  Injecting…
                </>
              ) : (
                "Inject failure"
              )}
            </Button>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Choose a service, then inject. The orchestrator toggles that
            microservice and tracks it for RCA, timeline, and remediation.
          </p>
        </div>
      </div>
    </div>
  )
}
