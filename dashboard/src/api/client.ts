import axios from "axios"

import type {
  InsightsApi,
  MetricsSeriesPoint,
  OrchestratorLogEntry,
  OrchestratorTimelineEvent,
  ServicesStatusResponse,
  SystemStatusApi,
} from "@/types"

/** Local dev URLs for direct service toggles (`/toggle-failure`). Docker maps these ports. */
export const SERVICE_TOGGLE_ORIGINS: Record<string, string> = {
  api_gateway:
    import.meta.env.VITE_API_GATEWAY_URL ?? "http://localhost:8000",
  order_service:
    import.meta.env.VITE_ORDER_SERVICE_URL ?? "http://localhost:8001",
  payment_service:
    import.meta.env.VITE_PAYMENT_SERVICE_URL ?? "http://localhost:8002",
  inventory_service:
    import.meta.env.VITE_INVENTORY_SERVICE_URL ?? "http://localhost:8003",
}

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

/** RCA payload (`GET /api/rca`). */
export const getInsights = () => API.get<InsightsApi>("/api/rca")

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

export async function getServicesStatus(): Promise<ServicesStatusResponse> {
  const { data } = await API.get<ServicesStatusResponse>(
    "/api/services/status",
  )
  return data
}

export type ToggleFailureResult = {
  service: string
  status?: string
  fail_mode?: boolean
}

/** POST `{origin}/toggle-failure?service={service}` on the target microservice. */
export async function postToggleFailure(
  service: string,
): Promise<ToggleFailureResult> {
  const origin = SERVICE_TOGGLE_ORIGINS[service]
  if (!origin) {
    throw new Error(`Unknown service for toggle: ${service}`)
  }
  const { data } = await axios.post<ToggleFailureResult>(
    `${origin}/toggle-failure`,
    null,
    {
      params: { service },
      timeout: 15_000,
    },
  )
  return data
}

/** POST orchestrator `/api/toggle-failure` — sets global RCA + toggles the target microservice. */
export async function orchestratorToggleFailure(
  service: string,
): Promise<OrchestratorMutationResult> {
  const { data } = await API.post<OrchestratorMutationResult>(
    "/api/toggle-failure",
    null,
    {
      params: { service },
      timeout: 15_000,
    },
  )
  return data
}

export async function injectFailure(
  service: string,
  _type: string,
): Promise<OrchestratorMutationResult> {
  void _type
  const { data } = await API.post<OrchestratorMutationResult>(
    "/api/inject-failure",
    { service },
  )
  return data
}

export async function autoFix(
  service: string,
): Promise<OrchestratorMutationResult> {
  const { data } = await API.post<OrchestratorMutationResult>(
    "/api/auto-fix",
    { service },
  )
  return data
}
