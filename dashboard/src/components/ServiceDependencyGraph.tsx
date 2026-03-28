import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react"
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ServerCrash,
} from "lucide-react"
import { memo, useEffect, useMemo } from "react"
import { useShallow } from "zustand/react/shallow"

import { useServiceVisualStatuses } from "@/context/ServiceVisualStatusContext"
import { mapServiceHealthToGraphProps } from "@/lib/serviceHealthView"
import {
  matchDependencyGraphServiceId,
  normalizeServiceId,
} from "@/lib/serviceIdNormalize"
import { cn } from "@/lib/utils"
import { useDashboardStore } from "@/store/useDashboardStore"
import type {
  DependencyGraphServiceId,
  DependencyGraphStatus,
} from "@/types"

export type ServiceDependencyGraphProps = {
  className?: string
  /** Canvas height in px */
  height?: number
}

const SERVICE_IDS = [
  "api_gateway",
  "order_service",
  "payment_service",
  "inventory_service",
] as const satisfies readonly DependencyGraphServiceId[]

const LABELS: Record<DependencyGraphServiceId, string> = {
  api_gateway: "API Gateway",
  order_service: "Order Service",
  payment_service: "Payment Service",
  inventory_service: "Inventory Service",
}

const EDGES: {
  id: string
  source: DependencyGraphServiceId
  target: DependencyGraphServiceId
}[] = [
  { id: "gw-order", source: "api_gateway", target: "order_service" },
  { id: "order-pay", source: "order_service", target: "payment_service" },
  { id: "pay-inv", source: "payment_service", target: "inventory_service" },
]

const NODE_X_GAP = 200

type ServiceNodeData = {
  label: string
  status: DependencyGraphStatus
  latencyMs: number
  isFailureOrigin: boolean
}

type ServiceGraphNode = Node<ServiceNodeData, "service">

function StatusIcon({ status }: { status: DependencyGraphStatus }) {
  const c = "size-4 shrink-0"
  switch (status) {
    case "healthy":
      return <CheckCircle2 className={cn(c, "text-emerald-400")} aria-hidden />
    case "degraded":
      return <AlertTriangle className={cn(c, "text-amber-400")} aria-hidden />
    case "critical":
      return <ServerCrash className={cn(c, "text-red-400")} aria-hidden />
    default:
      return <Loader2 className={cn(c, "animate-spin text-sky-400")} aria-hidden />
  }
}

const ServiceNodeInner = memo(function ServiceNodeInner({
  data,
}: NodeProps<ServiceGraphNode>) {
  const { label, status: visualStatus, latencyMs, isFailureOrigin } = data

  return (
    <div
      className={cn(
        "relative min-w-[148px] rounded-xl border bg-card px-3 py-2.5 shadow-sm transition-all duration-700 ease-in-out",
        visualStatus === "healthy" && "border-border ring-1 ring-border/80",
        visualStatus === "degraded" &&
          "border-amber-500/40 bg-amber-500/[0.06] ring-1 ring-amber-500/25",
        visualStatus === "critical" &&
          "border-red-500/50 bg-red-500/[0.1] ring-2 ring-red-500/40 shadow-[0_0_24px_-6px_rgb(239_68_68/0.45)] motion-safe:animate-pulse motion-reduce:animate-none",
        visualStatus === "recovering" &&
          "border-sky-500/35 bg-sky-500/[0.06] ring-1 ring-sky-500/25",
        isFailureOrigin && "dependency-graph-node--pulse",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!size-2 !border-border !bg-muted !opacity-0 [&+span]:hidden"
      />
      <div className="flex items-start gap-2">
        <StatusIcon status={visualStatus} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold leading-tight text-foreground">
            {label}
          </p>
          <p className="mt-0.5 flex items-center gap-1 font-mono text-[10px] tabular-nums text-muted-foreground">
            <Activity className="size-2.5 opacity-70" aria-hidden />
            {latencyMs.toLocaleString()} ms
          </p>
          <p
            className={cn(
              "mt-1 text-[10px] font-medium capitalize",
              visualStatus === "healthy" && "text-emerald-400/90",
              visualStatus === "degraded" && "text-amber-400/90",
              visualStatus === "critical" && "text-red-400/90",
              visualStatus === "recovering" && "text-sky-400/90",
            )}
          >
            {visualStatus.replace("_", " ")}
          </p>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!size-2 !border-border !bg-muted !opacity-0"
      />
    </div>
  )
})

const nodeTypes = {
  service: ServiceNodeInner,
}

/** Request path order (upstream → downstream); used when inferring origin without RCA. */
const CHAIN_ORDER: DependencyGraphServiceId[] = [
  "api_gateway",
  "order_service",
  "payment_service",
  "inventory_service",
]

/** Node colors from GET /api/rca → `currentIncident` only (chain index: root = critical, downstream = degraded, upstream = healthy). */
function statusesFromCurrentIncident(incident: {
  service: string
}): Record<DependencyGraphServiceId, DependencyGraphStatus> | null {
  const root = normalizeServiceId(incident.service)
  if (!root) return null
  const rootIndex = CHAIN_ORDER.findIndex(
    (id) => normalizeServiceId(id) === root,
  )
  if (rootIndex === -1) return null
  const out = {} as Record<DependencyGraphServiceId, DependencyGraphStatus>
  CHAIN_ORDER.forEach((id, index) => {
    const isRoot = normalizeServiceId(id) === root
    const isAffected = rootIndex !== -1 && index >= rootIndex
    out[id] = isRoot ? "critical" : isAffected ? "degraded" : "healthy"
  })
  return out
}

/** When no `currentIncident`, infer origin from API-derived statuses (chain order). */
function resolveFailureOrigin(
  statuses: Record<DependencyGraphServiceId, DependencyGraphStatus>,
  rootHint: string | undefined | null,
): DependencyGraphServiceId | null {
  const rca = matchDependencyGraphServiceId(rootHint)
  if (rca != null) {
    const st = statuses[rca]
    if (st === "critical" || st === "degraded") {
      return rca
    }
    const anyIncident = CHAIN_ORDER.some(
      (id) => statuses[id] === "critical" || statuses[id] === "degraded",
    )
    if (anyIncident) {
      return rca
    }
  }
  const critical = CHAIN_ORDER.find((id) => statuses[id] === "critical")
  if (critical) return critical
  return (
    CHAIN_ORDER.find((id) => statuses[id] === "degraded") ??
    (Object.entries(statuses).find(([, s]) => s === "degraded")?.[0] as
      | DependencyGraphServiceId
      | undefined) ??
    null
  )
}

function buildNodes(
  statuses: Record<DependencyGraphServiceId, DependencyGraphStatus>,
  latencies: Record<DependencyGraphServiceId, number>,
  origin: DependencyGraphServiceId | null,
): Node<ServiceNodeData, "service">[] {
  return SERVICE_IDS.map((id, i) => ({
    id,
    type: "service",
    position: { x: 24 + i * NODE_X_GAP, y: 24 },
    data: {
      label: LABELS[id],
      status: statuses[id],
      latencyMs: latencies[id],
      isFailureOrigin: origin === id && statuses[id] === "critical",
    },
    draggable: false,
    selectable: false,
  }))
}

function buildEdges(
  statuses: Record<DependencyGraphServiceId, DependencyGraphStatus>,
  origin: DependencyGraphServiceId | null,
): Edge[] {
  const hasIncident =
    origin != null &&
    (statuses[origin] === "critical" || statuses[origin] === "degraded")

  return EDGES.map((e, idx) => {
    const touches =
      hasIncident &&
      (e.source === origin ||
        e.target === origin ||
        statuses[e.source] === "critical" ||
        statuses[e.target] === "critical" ||
        statuses[e.source] === "degraded" ||
        statuses[e.target] === "degraded")

    const originIsCritical = origin != null && statuses[origin] === "critical"
    const stroke = touches
      ? originIsCritical ||
          statuses[e.source] === "critical" ||
          statuses[e.target] === "critical"
        ? "#ef4444"
        : "#f59e0b"
      : "hsl(220 10% 28%)"

    return {
      id: e.id,
      source: e.source,
      target: e.target,
      animated: Boolean(touches),
      style: {
        stroke,
        strokeWidth: touches ? 2.25 : 1.5,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 18,
        height: 18,
        color: stroke,
      },
      className: touches ? `edge-propagate edge-propagate-${idx % 3}` : undefined,
    }
  })
}

function FitViewEffect({ layoutKey }: { layoutKey: string }) {
  const { fitView } = useReactFlow()
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      void fitView({ padding: 0.2, duration: 280 })
    })
    return () => cancelAnimationFrame(id)
  }, [fitView, layoutKey])
  return null
}

function GraphCanvas({ className, height = 280 }: ServiceDependencyGraphProps) {
  const servicesStatus = useDashboardStore(
    useShallow((s) => s.servicesStatus),
  )
  const currentIncident = useDashboardStore((s) => s.currentIncident)

  const graphReady = useMemo(() => {
    if (!servicesStatus?.services?.length) {
      return null as
        | null
        | {
            statuses: Record<DependencyGraphServiceId, DependencyGraphStatus>
            latencies: Record<DependencyGraphServiceId, number>
          }
    }
    const { statuses, latenciesMs } = mapServiceHealthToGraphProps(
      servicesStatus.services,
    )
    return { statuses, latencies: latenciesMs }
  }, [servicesStatus])

  const statuses = graphReady?.statuses ?? null
  const latencies = graphReady?.latencies ?? null

  const stabilizedFromContext = useServiceVisualStatuses()
  const displayStatuses = useMemo(() => {
    if (!statuses) return null
    return stabilizedFromContext ?? statuses
  }, [statuses, stabilizedFromContext])

  const statusesForGraph = useMemo(() => {
    if (!displayStatuses) return null
    if (currentIncident?.service) {
      const fromIncident = statusesFromCurrentIncident(currentIncident)
      if (fromIncident) return fromIncident
    }
    return displayStatuses
  }, [displayStatuses, currentIncident])

  const origin = useMemo(() => {
    if (!statusesForGraph) return null
    if (currentIncident?.service) {
      return matchDependencyGraphServiceId(currentIncident.service)
    }
    return resolveFailureOrigin(statusesForGraph, null)
  }, [statusesForGraph, currentIncident])

  const layoutKey = useMemo(() => {
    if (!statusesForGraph || !latencies) return "empty"
    return `${SERVICE_IDS.map((id) => `${id}:${statusesForGraph[id]}:${latencies[id]}`).join("|")}|${origin ?? ""}|ci:${currentIncident?.service ?? ""}`
  }, [statusesForGraph, latencies, origin, currentIncident?.service])

  const initialNodes = useMemo(() => {
    if (!statusesForGraph || !latencies) return [] as Node<ServiceNodeData, "service">[]
    return buildNodes(statusesForGraph, latencies, origin)
  }, [statusesForGraph, latencies, origin])

  const initialEdges = useMemo(() => {
    if (!statusesForGraph) return [] as Edge[]
    return buildEdges(statusesForGraph, origin)
  }, [statusesForGraph, origin])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  useEffect(() => {
    if (!statusesForGraph || !latencies) {
      setNodes([])
      setEdges([])
      return
    }
    setNodes(buildNodes(statusesForGraph, latencies, origin))
    setEdges(buildEdges(statusesForGraph, origin))
  }, [statusesForGraph, latencies, origin, setNodes, setEdges])

  if (servicesStatus === null) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-[hsl(222_28%_6%/0.85)] px-4 text-center text-sm text-muted-foreground shadow-elevation-sm backdrop-blur-xl",
          className,
        )}
        style={{ height }}
      >
        <Loader2
          className="size-8 animate-spin text-muted-foreground"
          aria-hidden
        />
        <span>Loading service topology…</span>
      </div>
    )
  }

  if (!servicesStatus.services.length) {
    return (
      <div
        className={cn(
          "flex items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-[hsl(222_28%_6%/0.5)] px-4 text-center text-sm text-muted-foreground shadow-elevation-sm",
          className,
        )}
        style={{ height }}
      >
        No topology data from the orchestrator yet.
      </div>
    )
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-white/[0.08] bg-[hsl(222_28%_6%/0.85)] shadow-elevation-sm backdrop-blur-xl",
        className,
      )}
      style={{ height }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll
        zoomOnScroll
        zoomOnDoubleClick={false}
        minZoom={0.85}
        maxZoom={1.25}
        proOptions={{ hideAttribution: true }}
        className="!bg-[hsl(220_16%_7%)]"
      >
        <Background
          gap={20}
          size={1}
          color="hsl(220 10% 18%)"
          className="opacity-80"
        />
        <Controls
          showInteractive={false}
          className="!m-2 !border-border !bg-card !shadow-md [&_button]:!border-border [&_button]:!bg-card [&_button]:!text-foreground [&_button:hover]:!bg-muted"
        />
        <FitViewEffect layoutKey={layoutKey} />
      </ReactFlow>
    </div>
  )
}

export function ServiceDependencyGraph(props: ServiceDependencyGraphProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvas {...props} />
    </ReactFlowProvider>
  )
}
