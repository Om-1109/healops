import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useShallow } from "zustand/react/shallow"

import { autoFix, injectFailure } from "@/api/client"
import { ActionBar } from "@/components/ActionBar"
import { AnomalyGauge } from "@/components/AnomalyGauge"
import { DashboardLayout } from "@/components/DashboardLayout"
import { Header } from "@/components/Header"
import { LogStream } from "@/components/LogStream"
import { MetricsChart } from "@/components/MetricsChart"
import { RCAPanel } from "@/components/RCAPanel"
import { ServiceDependencyGraph } from "@/components/ServiceDependencyGraph"
import { SystemStatusBar } from "@/components/SystemStatusBar"
import { Timeline } from "@/components/Timeline"
import { SAMPLE_METRICS_DATA } from "@/data/sampleMetrics"
import {
  apiStatusToSystemStatus,
  formatHealthLabel,
  formatRootCauseLabel,
  insightsToRcaProps,
  mapMetricsToChartData,
  mapOrchestratorLogs,
  mapOrchestratorTimeline,
} from "@/lib/orchestratorViewMappers"
import {
  monitoringLatenciesForInjectTarget,
  monitoringStatusesForInjectTarget,
} from "@/lib/serviceDependencyGraphDemo"
import { useDashboardStore } from "@/store/useDashboardStore"
import type { ActionBarStatus } from "@/types"

const RECOVERED_RESET_MS = 3_500

function App() {
  const [actionStatus, setActionStatus] = useState<ActionBarStatus>("monitoring")
  const [injectTarget, setInjectTarget] = useState("")
  const [injectPending, setInjectPending] = useState(false)
  const [autoFixPending, setAutoFixPending] = useState(false)
  const recoveredTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearRecoveredTimer = useCallback(() => {
    if (recoveredTimerRef.current != null) {
      clearTimeout(recoveredTimerRef.current)
      recoveredTimerRef.current = null
    }
  }, [])

  const scheduleMonitoringAfterRecovered = useCallback(() => {
    clearRecoveredTimer()
    recoveredTimerRef.current = setTimeout(() => {
      setActionStatus("monitoring")
      recoveredTimerRef.current = null
    }, RECOVERED_RESET_MS)
  }, [clearRecoveredTimer])

  const handleInjectFailure = useCallback(
    async (service: string) => {
      clearRecoveredTimer()
      setInjectPending(true)
      try {
        await injectFailure(service, "simulated")
        setActionStatus("monitoring")
      } catch {
        setActionStatus("monitoring")
      } finally {
        setInjectPending(false)
      }
    },
    [clearRecoveredTimer],
  )

  const handleAutoFix = useCallback(async () => {
    clearRecoveredTimer()
    setAutoFixPending(true)
    setActionStatus("fixing")
    try {
      await autoFix("payment_service")
      setActionStatus("recovered")
      scheduleMonitoringAfterRecovered()
    } catch {
      setActionStatus("monitoring")
    } finally {
      setAutoFixPending(false)
    }
  }, [clearRecoveredTimer, scheduleMonitoringAfterRecovered])

  useEffect(() => {
    const {
      fetchSystemStatus,
      fetchInsights,
      fetchTimeline,
      fetchLogs,
      fetchMetrics,
    } = useDashboardStore.getState()

    const runFetches = () => {
      void fetchSystemStatus()
      void fetchInsights()
      void fetchTimeline()
      void fetchLogs()
      void fetchMetrics()
    }

    runFetches()

    const intervalId = setInterval(() => {
      runFetches()
    }, 3000)

    return () => {
      clearInterval(intervalId)
    }
  }, [])

  const { systemStatus, insights, timeline, logs, metrics } =
    useDashboardStore(
      useShallow((s) => ({
        systemStatus: s.systemStatus,
        insights: s.insights,
        timeline: s.timeline,
        logs: s.logs,
        metrics: s.metrics,
      })),
    )

  const headerRootCause = useMemo(() => {
    if (systemStatus?.root_cause != null && systemStatus.root_cause !== "") {
      return formatRootCauseLabel(systemStatus.root_cause)
    }
    if (insights?.service) {
      return formatRootCauseLabel(insights.service)
    }
    return null
  }, [systemStatus?.root_cause, insights?.service])

  const statusBarRootCause = useMemo(() => {
    const raw = systemStatus?.root_cause ?? insights?.service ?? ""
    return formatRootCauseLabel(raw || null)
  }, [systemStatus?.root_cause, insights?.service])

  const apiStatus = systemStatus?.status
  const systemStatusVariant = useMemo(
    () => apiStatusToSystemStatus(apiStatus),
    [apiStatus],
  )

  const timelineEvents = useMemo(
    () => mapOrchestratorTimeline(timeline),
    [timeline],
  )

  const logLines = useMemo(() => mapOrchestratorLogs(logs), [logs])

  const chartData = useMemo(() => {
    const mapped = mapMetricsToChartData(metrics)
    return mapped.length > 0 ? mapped : SAMPLE_METRICS_DATA
  }, [metrics])

  const rcaProps = useMemo(() => insightsToRcaProps(insights), [insights])

  const anomalyGaugePct = systemStatus?.anomaly_score ?? 0

  const dependencyGraphProps = useMemo(() => {
    if (actionStatus === "recovered") {
      return {
        statuses: {
          api_gateway: "healthy" as const,
          order_service: "healthy" as const,
          payment_service: "healthy" as const,
          inventory_service: "healthy" as const,
        },
        latenciesMs: {
          api_gateway: 38,
          order_service: 95,
          payment_service: 88,
          inventory_service: 72,
        },
      }
    }
    if (actionStatus === "fixing") {
      return {
        statuses: {
          api_gateway: "healthy" as const,
          order_service: "degraded" as const,
          payment_service: "recovering" as const,
          inventory_service: "healthy" as const,
        },
        latenciesMs: {
          api_gateway: 40,
          order_service: 450,
          payment_service: 980,
          inventory_service: 80,
        },
      }
    }
    if (injectTarget) {
      return {
        statuses: monitoringStatusesForInjectTarget(injectTarget),
        latenciesMs: monitoringLatenciesForInjectTarget(injectTarget),
      }
    }
    return {}
  }, [actionStatus, injectTarget])

  return (
    <DashboardLayout
      header={
        <Header
          status={systemStatusVariant}
          healthLabel={formatHealthLabel(apiStatus)}
          rootCause={headerRootCause}
        />
      }
      topStatusBar={
        <SystemStatusBar
          systemStatus={systemStatusVariant}
          rootCauseService={statusBarRootCause}
          autoFixState={actionStatus}
        />
      }
      middleCenter={
        <AnomalyGauge percentage={anomalyGaugePct} embedded />
      }
      middleRight={<RCAPanel embedded {...rcaProps} />}
      metricsChart={<MetricsChart data={chartData} height={240} />}
      timeline={<Timeline events={timelineEvents} staggerMs={75} />}
      logStream={
        <LogStream lines={logLines} compact />
      }
      serviceDependencyGraph={
        <ServiceDependencyGraph height={300} {...dependencyGraphProps} />
      }
      actionBar={
        <ActionBar
          status={actionStatus}
          injectTarget={injectTarget}
          onInjectTargetChange={setInjectTarget}
          onInjectFailure={handleInjectFailure}
          onTriggerAutoFix={handleAutoFix}
          injectPending={injectPending}
          autoFixPending={autoFixPending}
        />
      }
    />
  )
}

export default App
