import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ActionBarStatus } from "@/types"
import { cn } from "@/lib/utils"

export type InjectionTarget = {
  value: string
  label: string
}

const DEFAULT_INJECTION_TARGETS: InjectionTarget[] = [
  { value: "payment_service", label: "Payment Service" },
  { value: "api_gateway", label: "API Gateway" },
  { value: "order_service", label: "Order Service" },
  { value: "inventory_service", label: "Inventory Service" },
]

export type ActionBarProps = {
  status: ActionBarStatus
  /**
   * Target for inject failure (controlled). Use empty string until the user
   * picks a service — first selection runs inject.
   */
  injectTarget: string
  onInjectTargetChange: (value: string) => void
  injectionTargets?: InjectionTarget[]
  onInjectFailure: (service: string) => void | Promise<void>
  onTriggerAutoFix: () => void | Promise<void>
  injectPending?: boolean
  autoFixPending?: boolean
  className?: string
}

export function ActionBar({
  status: _statusForShell,
  injectTarget,
  onInjectTargetChange,
  injectionTargets = DEFAULT_INJECTION_TARGETS,
  onInjectFailure,
  onTriggerAutoFix,
  injectPending = false,
  autoFixPending = false,
  className,
}: ActionBarProps) {
  void _statusForShell

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
              value={injectTarget || undefined}
              onValueChange={(value) => {
                onInjectTargetChange(value)
                if (!injectPending && !autoFixPending) {
                  void onInjectFailure(value)
                }
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
          <p className="text-xs leading-relaxed text-muted-foreground">
            Selecting a service triggers inject for that target.
          </p>
        </div>

        <Button
          type="button"
          variant="default"
          className="h-9 shrink-0 min-w-[9.5rem]"
          disabled={injectPending || autoFixPending}
          onClick={() => {
            void onTriggerAutoFix()
          }}
        >
          {autoFixPending ? (
            <>
              <Loader2
                className="size-4 animate-spin"
                strokeWidth={2}
                aria-hidden
              />
              Fixing…
            </>
          ) : (
            "Trigger Auto-Fix"
          )}
        </Button>
      </div>
    </div>
  )
}
