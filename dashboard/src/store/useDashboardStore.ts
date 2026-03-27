import { create } from "zustand"

import {
  getInsights,
  getLogs,
  getMetrics,
  getSystemStatus,
  getTimeline,
} from "@/api/client"
import type {
  InsightsApi,
  MetricsSeriesPoint,
  OrchestratorLogEntry,
  OrchestratorTimelineEvent,
  SystemStatusApi,
} from "@/types"

export type DashboardState = {
  /** `GET /api/system-status` body */
  systemStatus: SystemStatusApi | null
  /** `GET /api/insights` body */
  insights: InsightsApi | null
  /** `GET /api/timeline` → `events` */
  timeline: OrchestratorTimelineEvent[]
  /** Seconds from first `failure_injected` to `remediation_complete`, or null */
  mttr: string | null
  /** `GET /api/logs` → `logs` */
  logs: OrchestratorLogEntry[]
  /** `GET /api/metrics` → `metrics` */
  metrics: MetricsSeriesPoint[]
}

type DashboardActions = {
  fetchSystemStatus: () => Promise<void>
  fetchInsights: () => Promise<void>
  fetchTimeline: () => Promise<void>
  fetchLogs: () => Promise<void>
  fetchMetrics: () => Promise<void>
}

const initialState: DashboardState = {
  systemStatus: null,
  insights: null,
  timeline: [],
  mttr: null,
  logs: [],
  metrics: [],
}

export const useDashboardStore = create<DashboardState & DashboardActions>(
  (set) => ({
    ...initialState,

    fetchSystemStatus: async () => {
      try {
        const { data } = await getSystemStatus()
        set({ systemStatus: data })
      } catch {
        /* keep previous */
      }
    },

    fetchInsights: async () => {
      try {
        const { data } = await getInsights()
        set({ insights: data })
      } catch {
        /* keep previous */
      }
    },

    fetchTimeline: async () => {
      try {
        const { data } = await getTimeline()
        const events = data.events ?? []

        const failure = events.find((e) => e.type === "failure_injected")
        const recovery = events.find((e) => e.type === "remediation_complete")

        let mttr: string | null = null

        if (failure && recovery) {
          const start = new Date(failure.timestamp)
          const end = new Date(recovery.timestamp)

          mttr = ((end.getTime() - start.getTime()) / 1000).toFixed(2)
        }

        set({
          timeline: events,
          mttr,
        })
      } catch {
        /* keep previous */
      }
    },

    fetchLogs: async () => {
      try {
        const { data } = await getLogs()
        set({ logs: data.logs ?? [] })
      } catch {
        /* keep previous */
      }
    },

    fetchMetrics: async () => {
      try {
        const { data } = await getMetrics()
        set({ metrics: data.metrics ?? [] })
      } catch {
        /* keep previous */
      }
    },
  }),
)
