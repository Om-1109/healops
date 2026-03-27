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

import { cn } from "@/lib/utils"
import type {
  DependencyGraphServiceId,
  DependencyGraphStatus,
} from "@/types"

export type ServiceDependencyGraphProps = {
  /** Live status per service — drives color, edge animation, and pulse. */
  statuses?: Partial<Record<DependencyGraphServiceId, DependencyGraphStatus>>
  /** Optional latency (ms) shown on each node. */
  latenciesMs?: Partial<Record<DependencyGraphServiceId, number>>
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

const DEFAULT_STATUSES: Record<DependencyGraphServiceId, DependencyGraphStatus> =
  {
    api_gateway: "healthy",
    order_service: "degraded",
    payment_service: "critical",
    inventory_service: "recovering",
  }

const DEFAULT_LATENCIES: Record<DependencyGraphServiceId, number> = {
  api_gateway: 38,
  order_service: 812,
  payment_service: 3200,
  inventory_service: 156,
}

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
  const { label, status, latencyMs, isFailureOrigin } = data

  return (
    <div
      className={cn(
        "relative min-w-[148px] rounded-xl border bg-card px-3 py-2.5 shadow-sm transition-all duration-300",
        status === "healthy" && "border-border ring-1 ring-border/80",
        status === "degraded" &&
          "border-amber-500/40 bg-amber-500/[0.06] ring-1 ring-amber-500/25",
        status === "critical" &&
          "border-red-500/50 bg-red-500/[0.1] ring-2 ring-red-500/40 shadow-[0_0_24px_-6px_rgb(239_68_68/0.45)]",
        status === "recovering" &&
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
        <StatusIcon status={status} />
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
              status === "healthy" && "text-emerald-400/90",
              status === "degraded" && "text-amber-400/90",
              status === "critical" && "text-red-400/90",
              status === "recovering" && "text-sky-400/90",
            )}
          >
            {status.replace("_", " ")}
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

function resolveStatuses(
  input?: Partial<Record<DependencyGraphServiceId, DependencyGraphStatus>>,
): Record<DependencyGraphServiceId, DependencyGraphStatus> {
  return { ...DEFAULT_STATUSES, ...input }
}

function resolveLatencies(
  input?: Partial<Record<DependencyGraphServiceId, number>>,
): Record<DependencyGraphServiceId, number> {
  return { ...DEFAULT_LATENCIES, ...input }
}

/** First service in call chain that is critical (root cause), else worst degraded. */
function failureOriginId(
  statuses: Record<DependencyGraphServiceId, DependencyGraphStatus>,
): DependencyGraphServiceId | null {
  const order: DependencyGraphServiceId[] = [
    "payment_service",
    "order_service",
    "api_gateway",
    "inventory_service",
  ]
  const critical = order.find((id) => statuses[id] === "critical")
  if (critical) return critical
  return (
    order.find((id) => statuses[id] === "degraded") ??
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
    fitView({ padding: 0.2, duration: 280 })
  }, [fitView, layoutKey])
  return null
}

function GraphCanvas({
  statuses: statusesProp,
  latenciesMs: latenciesProp,
  className,
  height = 280,
}: ServiceDependencyGraphProps) {
  const statuses = useMemo(
    () => resolveStatuses(statusesProp),
    [statusesProp],
  )
  const latencies = useMemo(
    () => resolveLatencies(latenciesProp),
    [latenciesProp],
  )

  const origin = useMemo(() => failureOriginId(statuses), [statuses])

  const layoutKey = useMemo(
    () =>
      `${SERVICE_IDS.map((id) => `${id}:${statuses[id]}:${latencies[id]}`).join("|")}|${origin}`,
    [statuses, latencies, origin],
  )

  const initialNodes = useMemo(
    () => buildNodes(statuses, latencies, origin),
    [statuses, latencies, origin],
  )
  const initialEdges = useMemo(
    () => buildEdges(statuses, origin),
    [statuses, origin],
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  useEffect(() => {
    setNodes(buildNodes(statuses, latencies, origin))
    setEdges(buildEdges(statuses, origin))
  }, [statuses, latencies, origin, setNodes, setEdges])

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
