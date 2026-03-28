import { create } from "zustand"

import {
  getInsights,
  getLogs,
  getMetrics,
  getServicesStatus,
  getSystemStatus,
  getTimeline,
} from "@/api/client"
import type {
  CurrentIncident,
  InsightsApi,
  MetricsSeriesPoint,
  OrchestratorLogEntry,
  OrchestratorTimelineEvent,
  ServicesStatusResponse,
  SystemStatusApi,
} from "@/types"

export type DashboardState = {
  /** `GET /api/system-status` body */
  systemStatus: SystemStatusApi | null
  /** `GET /api/services/status` body; `null` until first fetch settles */
  servicesStatus: ServicesStatusResponse | null
  /** `GET /api/rca` body (mirrors API; use `currentIncident` for authoritative UI) */
  insights: InsightsApi | null
  /** GET /api/rca — single source of truth for chain + RCA; only replaced when a new RCA payload arrives */
  currentIncident: CurrentIncident | null
  /** `GET /api/timeline` → `events` */
  timeline: OrchestratorTimelineEvent[]
  /** Client `Date.now()` when user injects failure; cleared when system status is healthy. */
  failureStartTime: number | null
  /** Seconds from inject click to healthy status (client clock only). */
  mttr: string | null
  /** `GET /api/logs` → `logs` */
  logs: OrchestratorLogEntry[]
  /** `GET /api/metrics` → `metrics` */
  metrics: MetricsSeriesPoint[]
}

type DashboardActions = {
  setCurrentIncident: (incident: CurrentIncident) => void
  clearCurrentIncident: () => void
  /** Call before inject API — starts real-time MTTR window. */
  beginInjectFailureTimer: () => void
  /** System status + RCA + timeline in one await (orchestrated sync). */
  refreshAll: () => Promise<void>
  fetchSystemStatus: () => Promise<void>
  fetchServicesStatus: () => Promise<void>
  fetchInsights: () => Promise<void>
  fetchTimeline: () => Promise<void>
  fetchLogs: () => Promise<void>
  fetchMetrics: () => Promise<void>
}

const initialState: DashboardState = {
  systemStatus: null,
  servicesStatus: null,
  insights: null,
  currentIncident: null,
  timeline: [],
  failureStartTime: null,
  mttr: null,
  logs: [],
  metrics: [],
}

export const useDashboardStore = create<DashboardState & DashboardActions>(
  (set, get) => ({
    ...initialState,

    setCurrentIncident: (incident: CurrentIncident) => {
      set({ currentIncident: incident })
    },

    clearCurrentIncident: () => {
      set({ currentIncident: null, insights: null })
    },

    beginInjectFailureTimer: () => {
      set({ failureStartTime: Date.now(), mttr: null })
    },

    refreshAll: async () => {
      const s = get()
      await Promise.all([
        s.fetchSystemStatus(),
        s.fetchInsights(),
        s.fetchTimeline(),
      ])
    },

    fetchSystemStatus: async () => {
      try {
        const { data } = await getSystemStatus()
        const healthy =
          typeof data.status === "string" &&
          data.status.toLowerCase() === "healthy"
        const { failureStartTime } = get()

        if (healthy && failureStartTime != null) {
          const mttr = ((Date.now() - failureStartTime) / 1000).toFixed(2)
          set({
            systemStatus: data,
            mttr,
            failureStartTime: null,
          })
        } else {
          set({ systemStatus: data })
        }
      } catch {
        /* keep previous */
      }
    },

    fetchServicesStatus: async () => {
      try {
        const data = await getServicesStatus()
        set({ servicesStatus: data })
      } catch {
        set((s) => ({
          servicesStatus: s.servicesStatus ?? { services: [], rca_text: "" },
        }))
      }
    },

    fetchInsights: async () => {
      try {
        const { data } = await getInsights()
        const svc = data?.service?.trim()
        if (svc) {
          const incident: CurrentIncident = {
            service: data.service,
            confidence: data.confidence ?? 0,
            affected: data.affected_services ?? [],
            rca_text: data.rca_text ?? "",
          }
          set({ insights: data, currentIncident: incident })
        }
        /* Empty RCA: keep last incident + insights sticky until a new injection returns data */
      } catch {
        /* keep previous */
      }
    },

    fetchTimeline: async () => {
      try {
        const { data } = await getTimeline()
        set({ timeline: data.events ?? [] })
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
