import React, { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Gauge, Zap, AlertOctagon } from "lucide-react";
import { StatTile } from "../components/primitives/StatTile";
import { Panel } from "../components/primitives/Panel";
import { StatusBadge } from "../components/primitives/StatusBadge";
import { SeverityBadge } from "../components/primitives/SeverityBadge";
import { AsyncPage } from "../components/primitives/AsyncPage";
import { SectionDivider } from "../components/primitives/SectionDivider";
import {
  CrashChart,
  CrashAnnotation,
  CHART_WINDOW_MS,
  chartDomainEnd,
} from "../components/charts/CrashChart";
import { LatencyBands } from "../components/charts/LatencyBands";
import { ErrorHeatmap } from "../components/charts/ErrorHeatmap";
import { Histogram } from "../components/charts/Histogram";
import {
  fetchHeatmap,
  fetchIncidentCount,
  fetchIncidentStats,
  fetchIncidents,
  fetchMetrics,
} from "../lib/api";
import { usePolling } from "../lib/usePolling";
import { pushRailEvent } from "../lib/railFeed";
import { formatDelta } from "../lib/format";
import { Incident, MetricPoint } from "../types";

interface LiveDashboardProps {
  onSelectIncident: (id: string) => void;
  onSelectCrash: () => void;
}

interface DashData {
  metrics: MetricPoint[];
  heatmap: Awaited<ReturnType<typeof fetchHeatmap>>;
  incidents: Incident[];
  /** Incidents inside the chart's 24h window, for the annotation lane. */
  annotationIncidents: Incident[];
  counts: { open: number; total: number };
}

export const LiveDashboard: React.FC<LiveDashboardProps> = ({
  onSelectIncident,
  onSelectCrash,
}) => {
  // Poll the moving data; services are fetched one-shot by pages that use them.
  // Layer 3: poll outcomes feed the command rail (§3) — no extra API calls.
  const metricsState = usePolling(fetchMetrics, 2000, (ok) => {
    if (!ok) return;
    void fetchMetrics().then((ms) => {
      const last = ms[ms.length - 1];
      if (!last) return;
      pushRailEvent({
        type: last.errorRate > 0.05 ? "WARN" : "OK",
        id: "svc_api",
        delta: `${(last.errorRate * 100).toFixed(2)}% ERR`,
      });
    });
  });
  const heatmapState = usePolling(fetchHeatmap, 2000);
  const incidentsState = usePolling(fetchIncidents, 2000, (ok) => {
    if (!ok) return;
    void fetchIncidents().then((is) => {
      const latest = is[0];
      if (!latest) return;
      pushRailEvent({
        type: latest.status === "crashed" ? "ERR" : "OK",
        id: `#${latest.id}`.slice(0, 8),
        delta: latest.status.toUpperCase(),
      });
    });
  });
  const countState = usePolling(fetchIncidentCount, 2000);
  // §12: the open count is an aggregate over every incident, not over the
  // page of rows above — counting the page pinned the tile at its page size.
  const statsState = usePolling(fetchIncidentStats, 2000);

  // The chart's axis ends at the present, so its annotations come from a fetch
  // over exactly that window — separate from (and much slower than) the table's
  // poll. usePolling captures its fetcher once, so the window is read through a
  // ref that every render refreshes.
  const annotationWindow = useRef({ from: 0, to: 0 });
  const windowEnd = chartDomainEnd();
  annotationWindow.current = { from: windowEnd - CHART_WINDOW_MS, to: windowEnd };
  const annotationsState = usePolling(
    () =>
      fetchIncidents({
        from: annotationWindow.current.from,
        to: annotationWindow.current.to,
        limit: 200,
      }),
    10_000
  );

  const loading =
    metricsState.loading ||
    heatmapState.loading ||
    incidentsState.loading ||
    statsState.loading;

  const state =
    loading ||
    !metricsState.data ||
    !heatmapState.data ||
    !incidentsState.data ||
    !countState.data ||
    !statsState.data
      ? ({ phase: "loading" } as const)
      : ({
          phase: "loaded",
          data: {
            metrics: metricsState.data,
            heatmap: heatmapState.data,
            incidents: incidentsState.data,
            // Annotations are supplementary: an empty first tick just means an
            // empty lane for a moment, never API OFFLINE.
            annotationIncidents: annotationsState.data ?? [],
            counts: {
              // crashed + investigating, straight from /incidents/stats.
              open: statsState.data.open,
              total: countState.data.count,
            },
          },
        } as const);

  return (
    <AsyncPage<DashData> state={state}>
      {(data) => (
        <DashboardBody
          metrics={data.metrics}
          heatmap={data.heatmap}
          incidents={data.incidents}
          annotationIncidents={data.annotationIncidents}
          counts={data.counts}
          onSelectIncident={onSelectIncident}
          onSelectCrash={onSelectCrash}
        />
      )}
    </AsyncPage>
  );
};

interface BodyProps {
  metrics: MetricPoint[];
  heatmap: Awaited<ReturnType<typeof fetchHeatmap>>;
  incidents: Incident[];
  annotationIncidents: Incident[];
  counts: { open: number; total: number };
  onSelectIncident: (id: string) => void;
  onSelectCrash: () => void;
}

const DashboardBody: React.FC<BodyProps> = ({
  metrics,
  heatmap,
  incidents,
  annotationIncidents,
  counts,
  onSelectIncident,
  onSelectCrash,
}) => {
  const last = metrics.at(-1);
  const hourAgo = metrics.length >= 61 ? metrics[metrics.length - 61] : metrics[0];
  const spark = (pick: (m: MetricPoint) => number) => metrics.slice(-60).map(pick);

  const delta = (
    pick: (m: MetricPoint) => number,
    fallback: { text: string; positive: boolean } = { text: "—", positive: true }
  ) => {
    if (!last || !hourAgo || hourAgo === last) return fallback;
    const prev = pick(hourAgo);
    if (!prev) return fallback;
    return formatDelta(((pick(last) - prev) / prev) * 100);
  };

  const errDelta = delta((m) => m.errorRate);
  const tputDelta = delta((m) => m.throughput);
  const p95Delta = delta((m) => m.p95);

  // Chart window, the same one the axis and the annotations fetch use.
  const domainEnd = chartDomainEnd();
  const domainStart = domainEnd - CHART_WINDOW_MS;

  // Crash marker = the newest crashed incident inside that window (data-driven,
  // so watcher POSTs move it automatically). If none qualifies, name the series'
  // worst error-rate point instead of drawing nothing at all.
  const newestCrashT = Date.parse(
    incidents
      .filter((i) => i.status === "crashed")
      .sort((a, b) => Date.parse(b.detectedAt) - Date.parse(a.detectedAt))[0]?.detectedAt ?? ""
  );
  const markerT =
    Number.isFinite(newestCrashT) && newestCrashT >= domainStart
      ? newestCrashT
      : metrics.reduce<MetricPoint | undefined>(
          (best, m) => (m.errorRate > (best?.errorRate ?? -1) ? m : best),
          undefined
        )?.t;

  // §9: annotation flags — the windowed fetch, not the table's page (page 1 is
  // all live rows, which is why the lane used to collapse into one column).
  const annotations: CrashAnnotation[] = useMemo(
    () =>
      annotationIncidents.map((i) => ({
        t: Date.parse(i.detectedAt),
        id: i.id,
        title: i.title,
      })),
    [annotationIncidents]
  );

  // Briefly highlight rows that appeared at the top since the last poll.
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const knownIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    const ids = new Set(incidents.map((i) => i.id));
    if (knownIds.current === null) {
      knownIds.current = ids; // first load: nothing is "new"
      return;
    }
    const appeared = [...ids].filter((id) => !knownIds.current!.has(id));
    knownIds.current = ids;
    if (appeared.length > 0) {
      setFreshIds((prev) => new Set([...prev, ...appeared]));
      const t = setTimeout(() => setFreshIds(new Set()), 3000);
      return () => clearTimeout(t);
    }
  }, [incidents]);

  // Latency distribution buckets for the last 60 minutes of p95 samples.
  const edges = [0, 50, 100, 200, 400, 800];
  const histBuckets = new Array(edges.length - 1).fill(0) as number[];
  for (const m of metrics.slice(-60)) {
    const idx = edges.findIndex((e, i) => i < edges.length - 1 && m.p95 >= e && m.p95 < edges[i + 1]);
    if (idx >= 0) histBuckets[idx]++;
  }
  const histLabels = ["<50", "50-99", "100-199", "200-399", "400-799", "800+"];

  const heatmapServices = [...new Set(heatmap.map((c) => c.service))];

  return (
    <div className="pb-8">
      {/* §14: the dash body itself is flush — tiles sit directly on the canvas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile
          label="ERROR RATE"
          value={(last?.errorRate ?? 0) * 100}
          delta={errDelta}
          icon={AlertOctagon}
          spark={spark((m) => m.errorRate * 100)}
        />
        <StatTile
          label="THROUGHPUT"
          value={last?.throughput ?? 0}
          delta={tputDelta}
          icon={Activity}
          spark={spark((m) => m.throughput)}
        />
        <StatTile
          label="P95 LATENCY"
          value={last?.p95 ?? 0}
          delta={p95Delta}
          icon={Gauge}
          spark={spark((m) => m.p95)}
        />
        <StatTile
          label="OPEN INCIDENTS"
          value={counts.open}
          delta={{ text: `${counts.total - counts.open} RESOLVED`, positive: true }}
          icon={Zap}
          spark={spark((m) => m.errorRate * 500)}
        />
        <StatTile
          label="TOTAL INCIDENTS (ALL TIME)"
          value={counts.total}
          delta={{ text: "PERSISTED", positive: true }}
          icon={Zap}
          spark={spark((m) => m.errorRate * 400)}
        />
      </div>

      {/* §14: hero charts float with brut-lg + 8px down-right offset */}
      <Panel
        title="ERROR RATE · LAST 24H"
        brackets
        className="m-6 shadow-brut-lg translate-x-[8px] translate-y-[8px]"
        bodyClassName="p-2"
      >
        <CrashChart
          data={metrics}
          height={280}
          windowMs={CHART_WINDOW_MS}
          markerT={markerT}
          annotations={annotations}
          sweep
          onSelectT={() => onSelectCrash()}
        />
      </Panel>

      <SectionDivider name="LATENCY" />

      {/* Two-column row: latency bands + histogram */}
      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6 p-6">
        <Panel title="LATENCY · P50 / P95 / P99" brackets>
          <div className="p-2">
            <LatencyBands data={metrics} height={240} />
          </div>
        </Panel>
        <Panel title="LATENCY DISTRIBUTION">
          <div className="p-4">
            <Histogram buckets={histBuckets} labels={histLabels} height={220} />
          </div>
        </Panel>
      </div>

      <SectionDivider name="ERROR DENSITY" />

      {/* Error heatmap */}
      <Panel title="ERROR DENSITY · BY SERVICE" className="m-6">
        <div className="p-4">
          <ErrorHeatmap cells={heatmap} services={heatmapServices} buckets={60} />
        </div>
      </Panel>

      <SectionDivider name="INCIDENTS" />

      {/* Incidents table */}
      <Panel title="INCIDENTS" className="mx-6">
        <div>
          <div className="grid grid-cols-[88px_1fr_160px_140px_120px_100px] items-center px-4 py-3 border-b-2 border-ink label text-ink/70">
            <span>ID</span>
            <span>ERROR</span>
            <span>SERVICE</span>
            <span>STATUS</span>
            <span>SEVERITY</span>
            <span className="text-right pr-2">AGE</span>
          </div>

          {incidents.map((incident: Incident) => (
            <button
              key={incident.id}
              type="button"
              onClick={() => onSelectIncident(incident.id)}
              className={`w-full text-left grid grid-cols-[88px_1fr_160px_140px_120px_100px] items-center px-4 py-3.5 bg-paper border-b border-grid last:border-b-0 transition-none hover:bg-white hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-brut active:translate-x-[4px] active:translate-y-[4px] active:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                freshIds.has(incident.id) ? "border-l-4 border-l-danger" : ""
              }`}
            >
              <span className="mono t-body font-bold text-ink tabular-nums">#{incident.id}</span>

              <div className="min-w-0 pr-4">
                <div className="t-body font-semibold text-ink truncate">{incident.title}</div>
                <div className="mono label truncate mt-0.5">{incident.error.message}</div>
              </div>

              <span className="mono label text-ink font-medium truncate">{incident.service}</span>

              <div>
                <StatusBadge status={incident.status} />
              </div>

              <div>
                <SeverityBadge severity={incident.severity} />
              </div>

              <span className="mono label text-muted text-right pr-2">{incident.relativeTime}</span>
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
};
