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

// v1 list endpoints return { items, nextCursor, hasMore }; the UI unwraps the
// first page here. `from`/`to` are unix ms, which lets the crash chart ask for
// exactly the window it draws instead of the newest rows (limit max: 500).
export function fetchIncidents(opts?: {
  from?: number;
  to?: number;
  limit?: number;
  status?: string;
}): Promise<Incident[]> {
  const query = new URLSearchParams();
  if (opts?.from !== undefined) query.set("from", String(Math.round(opts.from)));
  if (opts?.to !== undefined) query.set("to", String(Math.round(opts.to)));
  if (opts?.limit !== undefined) query.set("limit", String(opts.limit));
  if (opts?.status) query.set("status", opts.status);
  const suffix = query.toString();
  return get<{ items: Incident[] }>(`/incidents${suffix ? `?${suffix}` : ""}`).then(
    (page) => page.items
  );
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

// Server-side aggregate; unlike counting one page of rows this has no ceiling.
export function fetchIncidentStats(): Promise<{
  open: number;
  total: number;
  critical: number;
  affected: number;
}> {
  return get("/incidents/stats");
}

export async function clearIncidents(): Promise<{ cleared: number }> {
  const res = await fetch(`${BASE}/incidents`, { method: "DELETE" });
  if (!res.ok) throw new ApiError(res.status, `${res.status} DELETE /incidents`);
  return res.json() as Promise<{ cleared: number }>;
}
