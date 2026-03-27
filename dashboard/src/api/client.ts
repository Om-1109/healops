import axios from "axios"

import type {
  InsightsApi,
  MetricsSeriesPoint,
  OrchestratorLogEntry,
  OrchestratorTimelineEvent,
  ServiceHealth,
  ServicesStatusResponse,
  SystemStatusApi,
} from "@/types"

/** Axios instance for the orchestrator at http://localhost:9000 */
export const API = axios.create({
  baseURL: "http://localhost:9000",
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
})

export const apiClient = API

export const getSystemStatus = () =>
  API.get<SystemStatusApi>("/api/system-status")

export const getInsights = () => API.get<InsightsApi>("/api/insights")

export const getTimeline = () =>
  API.get<{ events: OrchestratorTimelineEvent[] }>("/api/timeline")

export const getLogs = () =>
  API.get<{ logs: OrchestratorLogEntry[] }>("/api/logs")

export const getMetrics = () =>
  API.get<{ metrics: MetricsSeriesPoint[] }>("/api/metrics")

/** Orchestrator mutation responses (`/api/inject-failure`, `/api/auto-fix`). */
export type OrchestratorMutationResult = {
  success: boolean
  service: string
  mttr_ms: number
  fail_mode?: boolean | null
  note?: string
}

const envMockDefault = import.meta.env.VITE_API_USE_MOCK === "true"

let mockOverride: boolean | undefined

/** Read-only: mock is on when `VITE_API_USE_MOCK=true` unless overridden. */
export function isApiMockEnabled(): boolean {
  return mockOverride ?? envMockDefault
}

/** Toggle mock mode at runtime (`undefined` restores env default). */
export function setApiMockEnabled(enabled: boolean | undefined): void {
  mockOverride = enabled
}

const MOCK_STATUS: ServicesStatusResponse = {
  services: [
    {
      name: "api_gateway",
      status: "healthy",
      latency_ms: 42,
      error: false,
      anomaly_score: 0.12,
    },
    {
      name: "order_service",
      status: "degraded",
      latency_ms: 240,
      error: false,
      anomaly_score: 0.48,
    },
    {
      name: "payment_service",
      status: "critical",
      latency_ms: 1200,
      error: true,
      anomaly_score: 0.9,
    },
    {
      name: "inventory_service",
      status: "healthy",
      latency_ms: 88,
      error: false,
      anomaly_score: 0.15,
    },
  ] satisfies ServiceHealth[],
  rca_text:
    "Payment Service failure detected. Order Service likely impacted.",
}

export async function getServicesStatus(): Promise<ServicesStatusResponse> {
  if (isApiMockEnabled()) {
    return structuredClone(MOCK_STATUS)
  }
  const { data } = await API.get<ServicesStatusResponse>(
    "/api/services/status",
  )
  return data
}

export async function injectFailure(
  service: string,
  type: string,
): Promise<OrchestratorMutationResult> {
  if (isApiMockEnabled()) {
    return {
      success: true,
      service,
      mttr_ms: 16,
      fail_mode: true,
      note: `[mock] failure_type=${type}`,
    }
  }
  const { data } = await API.post<OrchestratorMutationResult>(
    "/api/inject-failure",
    { service },
  )
  return data
}

export async function autoFix(
  service: string,
): Promise<OrchestratorMutationResult> {
  if (isApiMockEnabled()) {
    return {
      success: true,
      service,
      mttr_ms: 52,
      fail_mode: false,
    }
  }
  const { data } = await API.post<OrchestratorMutationResult>(
    "/api/auto-fix",
    { service },
  )
  return data
}
