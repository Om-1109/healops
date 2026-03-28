import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useShallow } from "zustand/react/shallow"

import { autoFix } from "@/api/client"
import { ServiceVisualStatusProvider } from "@/context/ServiceVisualStatusContext"
import { ActionBar } from "@/components/ActionBar"
import { AnomalyGauge } from "@/components/AnomalyGauge"
import { DashboardLayout } from "@/components/DashboardLayout"
import { RemediationPanel } from "@/components/RemediationPanel"
import { Header } from "@/components/Header"
import { LogStream } from "@/components/LogStream"
import { MetricsChart } from "@/components/MetricsChart"
import { RCAPanel } from "@/components/RCAPanel"
import { ServiceDependencyGraph } from "@/components/ServiceDependencyGraph"
import { SystemStatusBar } from "@/components/SystemStatusBar"
import { Timeline } from "@/components/Timeline"
import {
  apiStatusToSystemStatus,
  headerRootCauseDisplay,
} from "@/lib/orchestratorViewMappers"
import { useDashboardStore } from "@/store/useDashboardStore"
import type { ActionBarStatus } from "@/types"

const RECOVERED_RESET_MS = 3_500

function App() {
  const [actionStatus, setActionStatus] = useState<ActionBarStatus>("monitoring")
  const [injectPending, setInjectPending] = useState(false)
  const recoveredTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const serviceChainRef = useRef<HTMLDivElement>(null)

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

  const handleInjectFailure = useCallback(async () => {
    clearRecoveredTimer()
    setInjectPending(true)
    try {
      setActionStatus("monitoring")
    } finally {
      setInjectPending(false)
    }
  }, [clearRecoveredTimer])

  const handleAutoFix = useCallback(async () => {
    clearRecoveredTimer()
    setActionStatus("fixing")
    try {
      const st = useDashboardStore.getState()
      const target =
        st.currentIncident?.service?.trim() ||
        st.insights?.service?.trim() ||
        st.servicesStatus?.services?.find((s) => s.status === "critical")
          ?.name?.trim()
      if (!target) {
        setActionStatus("monitoring")
        return
      }
      await autoFix(target)
      await useDashboardStore.getState().refreshAll()
      await useDashboardStore.getState().fetchServicesStatus()
      setActionStatus("recovered")
      scheduleMonitoringAfterRecovered()
    } catch {
      setActionStatus("monitoring")
    }
  }, [clearRecoveredTimer, scheduleMonitoringAfterRecovered])

  useEffect(() => {
    const syncSecondary = () => {
      const st = useDashboardStore.getState()
      void st.fetchServicesStatus()
      void st.fetchLogs()
      void st.fetchMetrics()
    }

    const run = async () => {
      await useDashboardStore.getState().refreshAll()
      syncSecondary()
    }

    void run()

    const intervalId = setInterval(() => {
      void run()
    }, 2000)

    return () => {
      clearInterval(intervalId)
    }
  }, [])

  const { systemStatus, insights, currentIncident } = useDashboardStore(
    useShallow((s) => ({
      systemStatus: s.systemStatus,
      insights: s.insights,
      currentIncident: s.currentIncident,
    })),
  )

  const statusBarRootCause = useMemo(
    () => headerRootCauseDisplay(currentIncident, insights, systemStatus),
    [currentIncident, insights, systemStatus],
  )

  const apiStatus = systemStatus?.status
  const systemStatusVariant = useMemo(
    () => apiStatusToSystemStatus(apiStatus),
    [apiStatus],
  )

  return (
    <ServiceVisualStatusProvider>
    <DashboardLayout
      serviceChainRef={serviceChainRef}
      header={<Header />}
      topStatusBar={
        <SystemStatusBar
          systemStatus={systemStatusVariant}
          rootCauseService={statusBarRootCause}
          autoFixState={actionStatus}
        />
      }
      middleCenter={<AnomalyGauge embedded />}
      middleRight={<RCAPanel embedded />}
      metricsChart={<MetricsChart height={240} />}
      timeline={<Timeline staggerMs={75} />}
      logStream={<LogStream compact />}
      serviceDependencyGraph={<ServiceDependencyGraph height={300} />}
      remediation={
        <RemediationPanel embedded onTriggerAutoFix={handleAutoFix} />
      }
      actionBar={
        <ActionBar
          status={actionStatus}
          chainRef={serviceChainRef}
          onInjectFailure={handleInjectFailure}
          injectPending={injectPending}
        />
      }
    />
    </ServiceVisualStatusProvider>
  )
}

export default App
