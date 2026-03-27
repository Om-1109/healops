import type { ReactNode } from "react"

import {
  Activity,
  Brain,
  CheckCircle2,
  Boxes,
  Wrench,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AnomalyGauge } from "@/components/AnomalyGauge"
import { Header } from "@/components/Header"
import { IncidentFlow } from "@/components/IncidentFlow"
import { LogStream } from "@/components/LogStream"
import { RCAPanel } from "@/components/RCAPanel"
import { RemediationPanel } from "@/components/RemediationPanel"
import { ServiceCard } from "@/components/ServiceCard"
import { ServiceDependencyGraph } from "@/components/ServiceDependencyGraph"
import { SystemStatusBar } from "@/components/SystemStatusBar"
import { Timeline } from "@/components/Timeline"
import { ActionBar } from "@/components/ActionBar"
import { SAMPLE_LOG_LINES } from "@/data/sampleLogs"
import { SAMPLE_TIMELINE_EVENTS } from "@/data/sampleTimeline"
import { cn } from "@/lib/utils"

const SHELL =
  "healops-app-shell mx-auto w-full max-w-[1240px] px-5 pb-28 pt-10 sm:px-10"
const GRID_SERVICES =
  "grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4"

const DEFAULT_TOP_SERVICE_CARDS = (
  <>
    <ServiceCard
      name="API Gateway"
      status="healthy"
      latency={38.2}
      error_rate={0.08}
      request_count={12450}
      anomaly_score={0.12}
    />
    <ServiceCard
      name="Order Service"
      status="degraded"
      latency={812.5}
      error_rate={2.35}
      request_count={9021}
      anomaly_score={0.48}
    />
    <ServiceCard
      name="Payment Service"
      status="critical"
      latency={3200}
      error_rate={8.2}
      request_count={4102}
      anomaly_score={0.92}
    />
    <ServiceCard
      name="Inventory Service"
      status="recovering"
      latency={156.0}
      error_rate={0.5}
      request_count={6700}
      anomaly_score={0.28}
    />
  </>
)

const SERVICES_LEFT = ["Orchestrator", "Health probes", "Downstream deps"] as const

const DEFAULT_LEFT_CARDS = (
  <>
    {SERVICES_LEFT.map((name) => (
      <Card
        key={name}
        className="premium-surface border-white/[0.08] bg-card/90 supports-[backdrop-filter]:bg-card/75"
      >
        <CardHeader className="p-5 pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">
            {name}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0 text-xs leading-relaxed text-muted-foreground">
          Wire metrics from orchestrator.
        </CardContent>
      </Card>
    ))}
  </>
)

const DEFAULT_RECOVERY = (
  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
    <div className="flex gap-3">
      <CheckCircle2
        className="size-5 shrink-0 text-emerald-400"
        strokeWidth={1.75}
        aria-hidden
      />
      <div>
        <p className="text-sm font-semibold tracking-tight text-foreground">
          Incident cleared
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          Process chain is healthy again. Keep monitoring error budgets and
          downstream latency.
        </p>
      </div>
    </div>
  </div>
)

export type DashboardLayoutProps = {
  header?: ReactNode
  topStatusBar?: ReactNode
  topServiceCards?: ReactNode
  middleLeft?: ReactNode
  middleCenter?: ReactNode
  middleRight?: ReactNode
  recoveryContent?: ReactNode
  metricsChart?: ReactNode
  remediation?: ReactNode
  actionBar?: ReactNode
  timeline?: ReactNode
  logStream?: ReactNode
  /** Dependency / request-flow graph for impacted services (defaults to live demo graph). */
  serviceDependencyGraph?: ReactNode
  /** Which incident steps start expanded (ids: anomaly, rca, impacted, remediation, recovery). */
  incidentDefaultOpenIds?: string[]
  className?: string
}

function PageSection({
  id,
  title,
  description,
  children,
  className,
}: {
  id: string
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section aria-labelledby={id} className={cn("space-y-7", className)}>
      <header className="max-w-2xl space-y-1.5">
        <h2
          id={id}
          className="text-[15px] font-semibold tracking-[-0.02em] text-foreground"
        >
          {title}
        </h2>
        {description ? (
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </header>
      {children}
    </section>
  )
}

export function DashboardLayout({
  header,
  topStatusBar,
  topServiceCards,
  middleLeft,
  middleCenter,
  middleRight,
  recoveryContent,
  metricsChart,
  remediation,
  actionBar,
  timeline,
  logStream,
  serviceDependencyGraph,
  incidentDefaultOpenIds,
  className,
}: DashboardLayoutProps) {
  return (
    <div
      className={cn("min-h-screen w-full bg-background text-foreground", className)}
    >
      <div className={SHELL}>
        {header ?? <Header />}

        <div className="mt-6">
          {topStatusBar ?? (
            <SystemStatusBar
              systemStatus="healthy"
              rootCauseService="—"
              autoFixState="monitoring"
            />
          )}
        </div>

        <div className="mt-14 flex flex-col gap-16">
          <IncidentFlow
            defaultOpenIds={incidentDefaultOpenIds}
            steps={[
              {
                id: "anomaly",
                title: "Anomaly detected",
                description:
                  "Elevated risk score from live telemetry and process-chain checks.",
                icon: Activity,
                content:
                  middleCenter ?? (
                    <AnomalyGauge percentage={48} embedded />
                  ),
              },
              {
                id: "rca",
                title: "Root cause analysis",
                description:
                  "Inferred failure mode, blast radius, and confidence.",
                icon: Brain,
                content:
                  middleRight ?? (
                    <RCAPanel
                      embedded
                      serviceName="Payment Service"
                      failureType="Intermittent errors while completing the payment step in the process chain"
                      affectedServices={["Order Service", "API Gateway"]}
                      explanation="When Payment Service fails or returns errors, Order Service cannot finalize transactions, and API Gateway surfaces a failed end-to-end process. This pattern matches payment instability with downstream impact on orders and clients calling through the gateway."
                      confidencePercent={84}
                      emphasizedTerms={[
                        "process chain",
                        "downstream impact",
                        "end-to-end",
                      ]}
                    />
                  ),
              },
              {
                id: "impacted",
                title: "Impacted services",
                description:
                  "Dependencies and service health across the stack.",
                icon: Boxes,
                content: (
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Request chain
                      </p>
                      {serviceDependencyGraph ?? (
                        <ServiceDependencyGraph height={300} />
                      )}
                    </div>
                    <div className={GRID_SERVICES}>
                      {topServiceCards ?? DEFAULT_TOP_SERVICE_CARDS}
                    </div>
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                      {middleLeft ?? DEFAULT_LEFT_CARDS}
                    </div>
                  </div>
                ),
              },
              {
                id: "remediation",
                title: "Remediation",
                description:
                  "Automated or guided actions to stabilize the system.",
                icon: Wrench,
                content:
                  remediation ?? (
                    <RemediationPanel
                      embedded
                      state="fixing"
                      action="Calling payment service reset endpoint to clear simulated failure mode and restore the process chain."
                      progress={62}
                      mttrMs={156.8}
                    />
                  ),
              },
              {
                id: "recovery",
                title: "Recovery",
                description:
                  "Verification that the incident is closed and stable.",
                icon: CheckCircle2,
                content: recoveryContent ?? DEFAULT_RECOVERY,
              },
            ]}
          />

          <PageSection
            id="metrics"
            title="Metrics"
            description="Historical throughput and latency."
          >
            <Card className="premium-surface border-white/[0.08] bg-card/85">
              <CardHeader className="space-y-1.5 p-6 pb-4">
                <CardTitle className="text-[15px] font-semibold tracking-tight text-foreground">
                  Throughput and latency
                </CardTitle>
                <CardDescription className="text-[13px] leading-snug">
                  Lower priority than live detection signals.
                </CardDescription>
              </CardHeader>
              <CardContent className="min-h-[220px] p-6 pt-0">
                {metricsChart ?? (
                  <div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-xs text-muted-foreground">
                    Pass{" "}
                    <code className="mx-1 rounded bg-muted px-1 py-px font-mono text-[11px] text-foreground">
                      metricsChart
                    </code>{" "}
                    prop
                  </div>
                )}
              </CardContent>
            </Card>
          </PageSection>

          <PageSection id="actions" title="Actions">
            <div className="premium-surface rounded-2xl border border-white/[0.08] bg-card/80 p-6 shadow-elevation-sm backdrop-blur-xl transition-[box-shadow,border-color,background-color] duration-300 supports-[backdrop-filter]:bg-card/65">
              {actionBar ?? (
                <ActionBar
                  status="monitoring"
                  injectTarget=""
                  onInjectTargetChange={() => {}}
                  onInjectFailure={() => {}}
                  onTriggerAutoFix={() => {}}
                />
              )}
            </div>
          </PageSection>

          <PageSection
            id="timeline-logs"
            title="Events and logs"
            description="Activity history and recent output."
          >
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
              <Card className="premium-surface flex h-full flex-col border-white/[0.08] bg-card/85">
                <CardHeader className="p-6 pb-4">
                  <CardTitle className="text-[15px] font-semibold tracking-tight text-foreground">
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-6 pt-0">
                  {timeline ?? (
                    <Timeline events={SAMPLE_TIMELINE_EVENTS} staggerMs={75} />
                  )}
                </CardContent>
              </Card>

              <div className="min-h-0">
                {logStream ?? (
                  <LogStream lines={SAMPLE_LOG_LINES} compact />
                )}
              </div>
            </div>
          </PageSection>
        </div>
      </div>
    </div>
  )
}
