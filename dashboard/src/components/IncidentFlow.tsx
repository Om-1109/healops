import type { LucideIcon } from "lucide-react"
import { ChevronDown } from "lucide-react"
import type { ReactNode } from "react"
import { useCallback, useState } from "react"

import { cn } from "@/lib/utils"

export type IncidentFlowStep = {
  id: string
  title: string
  description?: string
  icon: LucideIcon
  content: ReactNode
}

export type IncidentFlowProps = {
  steps: IncidentFlowStep[]
  /**
   * Step ids that are open on first paint. Defaults to all steps open
   * so the incident reads as one story top to bottom.
   */
  defaultOpenIds?: string[]
  className?: string
}

function useExpandedState(
  steps: IncidentFlowStep[],
  defaultOpenIds: string[] | undefined,
) {
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    if (defaultOpenIds != null && defaultOpenIds.length > 0) {
      for (const s of steps) {
        initial[s.id] = defaultOpenIds.includes(s.id)
      }
      return initial
    }
    for (const s of steps) {
      initial[s.id] = true
    }
    return initial
  })

  const toggle = useCallback((id: string) => {
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  return { open, toggle }
}

export function IncidentFlow({
  steps,
  defaultOpenIds,
  className,
}: IncidentFlowProps) {
  const { open, toggle } = useExpandedState(steps, defaultOpenIds)

  return (
    <div className={cn("w-full", className)}>
      <header className="mb-10 max-w-xl space-y-2">
        <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">
          Incident flow
        </h2>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Follow each stage from detection through recovery. Expand or collapse
          steps as you triage.
        </p>
      </header>

      <ol className="m-0 list-none p-0" aria-label="Incident stages">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isOpen = open[step.id]
          const isLast = index === steps.length - 1

          return (
            <li
              key={step.id}
              className={cn(
                "animate-flow-step-in opacity-0 [animation-fill-mode:forwards]",
              )}
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <div className="flex items-stretch gap-5">
                <div className="flex w-11 shrink-0 flex-col items-center">
                  <div
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full border-2 bg-card/90 backdrop-blur-sm transition-all duration-300 ease-out",
                      isOpen
                        ? "border-primary text-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.14)]"
                        : "border-white/[0.12] text-muted-foreground",
                    )}
                    aria-hidden
                  >
                    <Icon className="size-4" strokeWidth={1.75} />
                  </div>
                  {!isLast ? (
                    <div
                      className="mt-0.5 w-px min-h-8 flex-1 bg-gradient-to-b from-border via-border to-primary/25 transition-opacity duration-500"
                      aria-hidden
                    />
                  ) : null}
                </div>

                <div className={cn("min-w-0 flex-1", !isLast && "pb-10")}>
                  <div className="premium-surface overflow-hidden rounded-2xl border border-white/[0.08] bg-card/78 shadow-elevation-sm backdrop-blur-xl transition-[box-shadow,transform,border-color,background-color] duration-300 ease-smooth supports-[backdrop-filter]:bg-card/62">
                    <button
                      type="button"
                      id={`${step.id}-trigger`}
                      aria-expanded={isOpen}
                      aria-controls={`${step.id}-panel`}
                      onClick={() => {
                        toggle(step.id)
                      }}
                      className={cn(
                        "flex w-full items-start gap-4 p-5 text-left sm:p-6",
                        "transition-colors duration-300 ease-smooth",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      )}
                    >
                      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-muted/60 font-mono text-[11px] font-semibold text-muted-foreground tabular-nums">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold tracking-tight text-foreground">
                          {step.title}
                        </span>
                        {step.description ? (
                          <span className="mt-1 block text-[13px] leading-relaxed text-muted-foreground">
                            {step.description}
                          </span>
                        ) : null}
                      </span>
                      <ChevronDown
                        className={cn(
                          "mt-0.5 size-5 shrink-0 text-muted-foreground transition-transform duration-300 ease-out",
                          isOpen && "rotate-180",
                        )}
                        aria-hidden
                      />
                    </button>

                    <div
                      id={`${step.id}-panel`}
                      role="region"
                      aria-labelledby={`${step.id}-trigger`}
                      className={cn(
                        "grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
                        isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                      )}
                    >
                      <div className="min-h-0">
                        <div className="border-t border-white/[0.06] px-5 pb-5 pt-1 sm:px-6 sm:pb-6">
                          <div
                            className={cn(
                              "pt-3 transition-opacity duration-300 ease-out motion-reduce:transition-none",
                              isOpen ? "opacity-100" : "opacity-0",
                            )}
                          >
                            {step.content}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
