import type {
  Incident,
  MetricPoint,
  HeatmapCell,
  ServiceNode,
  ServiceEdge,
  Trace,
} from "../types";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4848";

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

export function fetchHealth(): Promise<{ ok: boolean; uptime: number; incidents: number }> {
  return get("/api/health");
}

export function fetchIncidents(): Promise<Incident[]> {
  return get("/api/incidents");
}

export function fetchIncident(id: string): Promise<Incident> {
  return get(`/api/incidents/${id}`);
}

export function fetchMetrics(): Promise<MetricPoint[]> {
  return get("/api/metrics");
}

export function fetchHeatmap(): Promise<HeatmapCell[]> {
  return get("/api/heatmap");
}

export function fetchServices(): Promise<{ nodes: ServiceNode[]; edges: ServiceEdge[] }> {
  return get("/api/services");
}

export function fetchTrace(id: string): Promise<Trace> {
  return get(`/api/traces/${id}`);
}

export function fetchIncidentCount(): Promise<{ count: number }> {
  return get("/api/incidents/count");
}

export async function clearIncidents(): Promise<{ cleared: number }> {
  const res = await fetch(`${BASE}/api/incidents`, { method: "DELETE" });
  if (!res.ok) throw new ApiError(res.status, `${res.status} DELETE /api/incidents`);
  return res.json() as Promise<{ cleared: number }>;
}
