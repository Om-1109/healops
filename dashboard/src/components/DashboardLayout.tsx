import type { ReactNode, RefObject } from "react"
import { useEffect, useMemo, useState } from "react"
import { useShallow } from "zustand/react/shallow"

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
import { ConnectedSystemStatusBar } from "@/components/ConnectedSystemStatusBar"
import { Header } from "@/components/Header"
import { ImpactedServiceCards } from "@/components/ImpactedServiceCards"
import { IncidentView } from "@/components/IncidentView"
import type { IncidentFlowStep } from "@/components/IncidentFlow"
import { NormalView } from "@/components/NormalView"
import { LogStream } from "@/components/LogStream"
import { RCAPanel } from "@/components/RCAPanel"
import { MetricsChart } from "@/components/MetricsChart"
import { RecoveryFromStore } from "@/components/RecoveryFromStore"
import { RemediationPanel } from "@/components/RemediationPanel"
import { ServiceDependencyGraph } from "@/components/ServiceDependencyGraph"
import { Timeline } from "@/components/Timeline"
import { cn } from "@/lib/utils"
import { useDashboardStore } from "@/store/useDashboardStore"

const SHELL =
  "healops-app-shell mx-auto w-full max-w-[1240px] px-5 pb-28 pt-10 sm:px-10"
const GRID_SERVICES =
  "grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4"

export type DashboardLayoutProps = {
  header?: ReactNode
  topStatusBar?: ReactNode
  topServiceCards?: ReactNode
  middleCenter?: ReactNode
  middleRight?: ReactNode
  recoveryContent?: ReactNode
  metricsChart?: ReactNode
  remediation?: ReactNode
  actionBar?: ReactNode
  timeline?: ReactNode
  logStream?: ReactNode
  /** Dependency / request-flow graph for impacted services (store-backed when omitted). */
  serviceDependencyGraph?: ReactNode
  /** Which incident steps start expanded (ids: anomaly, rca, impacted, remediation, recovery). */
  incidentDefaultOpenIds?: string[]
  /** Scroll target for “request chain” (graph + label). */
  serviceChainRef?: RefObject<HTMLDivElement | null>
  className?: string
}

type FlowMode = "normal" | "incident"

function buildIncidentFlowSteps(
  mode: FlowMode,
  args: {
    middleCenter?: ReactNode
    middleRight?: ReactNode
    topServiceCards?: ReactNode
    serviceDependencyGraph?: ReactNode
    remediation?: ReactNode
    recoveryContent?: ReactNode
    serviceChainRef?: RefObject<HTMLDivElement | null>
  },
): IncidentFlowStep[] {
  const {
    middleCenter,
    middleRight,
    topServiceCards,
    serviceDependencyGraph,
    remediation,
    recoveryContent,
    serviceChainRef,
  } = args

  const showChainInFlow = mode === "normal"

  const anomalyContent =
    mode === "incident" ? (
      <div className="rounded-lg border border-white/[0.08] bg-muted/20 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
        The <strong className="text-foreground">compact anomaly panel</strong> and{" "}
        <strong className="text-foreground">request chain</strong> are pinned above
        while this incident is active. Continue below for RCA, impacted services, and
        remediation.
      </div>
    ) : (
      middleCenter ?? <AnomalyGauge embedded />
    )

  return [
    {
      id: "anomaly",
      title: "Anomaly detected",
      description:
        "Elevated risk score from live telemetry and process-chain checks.",
      icon: Activity,
      content: anomalyContent,
    },
    {
      id: "rca",
      title: "Root cause analysis",
      description:
        "Inferred failure mode, blast radius, and confidence.",
      icon: Brain,
      content: middleRight ?? <RCAPanel embedded />,
    },
    {
      id: "impacted",
      title: "Impacted services",
      description:
        "Dependencies and service health across the stack.",
      icon: Boxes,
      content: (
        <div className="space-y-8">
          {showChainInFlow ? (
            <div
              ref={serviceChainRef}
              className="space-y-3 scroll-mt-24"
            >
              <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Request chain
              </p>
              {serviceDependencyGraph ?? (
                <ServiceDependencyGraph height={300} />
              )}
            </div>
          ) : null}
          <div className={GRID_SERVICES}>
            {topServiceCards ?? <ImpactedServiceCards />}
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
      content: remediation ?? <RemediationPanel embedded />,
    },
    {
      id: "recovery",
      title: "Recovery",
      description:
        "Verification that the incident is closed and stable.",
      icon: CheckCircle2,
      content: recoveryContent ?? <RecoveryFromStore />,
    },
  ]
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
  serviceChainRef,
  className,
}: DashboardLayoutProps) {
  const { systemStatus } = useDashboardStore(
    useShallow((s) => ({ systemStatus: s.systemStatus })),
  )

  const isIncident =
    systemStatus?.status === "critical" ||
    (typeof systemStatus?.anomaly_score === "number" &&
      systemStatus.anomaly_score > 50)

  /** Demo: keep split IncidentView visible ~6s so it is easy to see before unmounting. */
  const [incidentVisible, setIncidentVisible] = useState(false)

  useEffect(() => {
    if (!isIncident) {
      setIncidentVisible(false)
      return
    }
    setIncidentVisible(true)
    const t = window.setTimeout(() => {
      setIncidentVisible(false)
    }, 6000)
    return () => window.clearTimeout(t)
  }, [isIncident])

  const flowSteps = useMemo(
    () =>
      buildIncidentFlowSteps(isIncident ? "incident" : "normal", {
        middleCenter,
        middleRight,
        topServiceCards,
        serviceDependencyGraph,
        remediation,
        recoveryContent,
        serviceChainRef,
      }),
    [
      isIncident,
      middleCenter,
      middleRight,
      topServiceCards,
      serviceDependencyGraph,
      remediation,
      recoveryContent,
      serviceChainRef,
    ],
  )

  return (
    <div
      className={cn("min-h-screen w-full bg-background text-foreground", className)}
    >
      <div className={SHELL}>
        {header ?? <Header />}

        <div className="mt-6">
          {topStatusBar ?? <ConnectedSystemStatusBar />}
        </div>

        <div className="mt-14 flex flex-col gap-16">
          {incidentVisible ? (
            <IncidentView
              anomalySlot={middleCenter ?? <AnomalyGauge embedded />}
              chainSlot={
                serviceDependencyGraph ?? (
                  <ServiceDependencyGraph height={300} />
                )
              }
              chainRef={serviceChainRef}
            />
          ) : null}
          <NormalView
            defaultOpenIds={incidentDefaultOpenIds}
            steps={flowSteps}
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
                {metricsChart ?? <MetricsChart height={220} />}
              </CardContent>
            </Card>
          </PageSection>

          <PageSection id="actions" title="Actions">
            <div className="premium-surface rounded-2xl border border-white/[0.08] bg-card/80 p-6 shadow-elevation-sm backdrop-blur-xl transition-[box-shadow,border-color,background-color] duration-300 supports-[backdrop-filter]:bg-card/65">
              {actionBar ?? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Action controls load when this layout is composed with a live
                  shell (inject / auto-fix).
                </p>
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
                  {timeline ?? <Timeline staggerMs={75} />}
                </CardContent>
              </Card>

              <div className="min-h-0">
                {logStream ?? <LogStream compact />}
              </div>
            </div>
          </PageSection>
        </div>
      </div>
    </div>
  )
}
