export type Severity = "critical" | "high" | "medium" | "low";
export type IncidentStatus = "crashed" | "investigating" | "resolved" | "ignored";
export type RiskLevel = "high" | "medium" | "low";
export type SpanStatus = "ok" | "error" | "unset";
export type ServiceHealth = "healthy" | "degraded" | "down";

export interface MetricPoint {
  t: number; // unix ms
  errorRate: number; // 0..1
  throughput: number; // req/s
  p50: number; // ms
  p95: number;
  p99: number;
}

export interface SpanEvent {
  t: number; // ms offset from span start
  name: string;
  attributes: Record<string, string | number | boolean>;
}

export interface Span {
  id: string;
  parentId: string | null;
  service: string;
  operation: string;
  startMs: number; // offset from trace start
  durationMs: number;
  status: SpanStatus;
  errorMessage?: string;
  attributes: Record<string, string | number | boolean>;
  events: SpanEvent[];
  children: string[]; // span ids
}

export interface Trace {
  id: string;
  startedAt: number; // unix ms
  durationMs: number;
  rootSpanId: string;
  spans: Record<string, Span>;
  incidentId?: string;
}

export interface ServiceNode {
  id: string;
  name: string;
  health: ServiceHealth;
  errorRate: number;
  requests: number;
  p95: number;
  x: number; // 0..1 normalized layout coordinate
  y: number;
}

export interface ServiceEdge {
  from: string;
  to: string;
  calls: number;
  errors: number;
  p95: number;
}

export interface HeatmapCell {
  service: string;
  bucket: number; // minutes ago
  errors: number;
}

export interface StackFrame {
  function: string;
  file: string;
  line: number;
  column: number;
  inApp: boolean;
  durationMs?: number;
}

export interface CodeLine {
  number: number;
  content: string;
  highlight?: boolean;
}

export interface GitCommit {
  hash: string;
  shortHash: string;
  author: string;
  authorInitials: string;
  authorColor: string;
  message: string;
  relativeTime: string;
  filesChanged: number;
  additions: number;
  deletions: number;
}

export interface ImpactedFile {
  path: string;
  changes: number;
  risk: RiskLevel;
}

export interface SuggestedAction {
  id: string;
  label: string;
  description: string;
  variant: "primary" | "danger" | "default";
  icon: "revert" | "pr" | "test" | "dismiss";
}

export interface Incident {
  id: string;
  title: string;
  status: IncidentStatus;
  severity: Severity;
  environment: string;
  service: string;
  detectedAt: string;
  relativeTime: string;
  occurrences: number;
  usersAffected: number;
  traceId: string;
  error: { type: string; message: string; raw: string };
  stack: StackFrame[];
  code: { file: string; startLine: number; lines: CodeLine[] };
  gitChanges: GitCommit[];
  rootCause: { commit: GitCommit; confidence: number; reasoning: string[] };
  impactedFiles: ImpactedFile[];
  suggestedActions: SuggestedAction[];
}
