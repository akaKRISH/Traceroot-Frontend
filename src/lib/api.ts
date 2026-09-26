import type {
  Incident,
  MetricPoint,
  HeatmapCell,
  ServiceNode,
  ServiceEdge,
  Trace,
} from "../types";

// Traceroot-Backend v1 (Express on 4848); override the host with VITE_API_URL.
const BASE = `${import.meta.env.VITE_API_URL ?? "http://localhost:4848"}/api/v1`;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new ApiError(res.status, `${res.status} ${path}`);
  return res.json() as Promise<T>;
}

export function fetchHealth(): Promise<{
  ok: boolean;
  version: string;
  uptime: number;
  incidents: number;
}> {
  return get("/health");
}

// v1 list endpoints return { items, nextCursor, hasMore }; the UI shows the
// first page only, so unwrap items here.
export function fetchIncidents(): Promise<Incident[]> {
  return get<{ items: Incident[] }>("/incidents").then((page) => page.items);
}

export function fetchIncident(id: string): Promise<Incident> {
  return get(`/incidents/${id}`);
}

// Every v1 metric endpoint returns the full MetricPoint series (errorRate,
// throughput, p50/p95/p99), so one call carries all three dashboard charts.
export function fetchMetrics(): Promise<MetricPoint[]> {
  return get("/metrics/errors");
}

export function fetchHeatmap(): Promise<HeatmapCell[]> {
  return get("/metrics/heatmap");
}

export function fetchServices(): Promise<{ nodes: ServiceNode[]; edges: ServiceEdge[] }> {
  return get("/services");
}

export function fetchTrace(id: string): Promise<Trace> {
  return get(`/traces/${id}`);
}

export function fetchIncidentCount(): Promise<{ count: number }> {
  return get("/incidents/count");
}

export async function clearIncidents(): Promise<{ cleared: number }> {
  const res = await fetch(`${BASE}/incidents`, { method: "DELETE" });
  if (!res.ok) throw new ApiError(res.status, `${res.status} DELETE /incidents`);
  return res.json() as Promise<{ cleared: number }>;
}
