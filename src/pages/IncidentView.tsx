import React from "react";
import {
  AlertTriangle,
  Terminal,
  Code2,
  GitBranch,
  Crosshair,
  FileText,
  Wrench,
} from "lucide-react";
import { Incident } from "../types";
import { fetchIncident, fetchMetrics, fetchServices, fetchTrace } from "../lib/api";
import { usePageData, AsyncPage } from "../components/primitives/AsyncPage";
import { usePolling } from "../lib/usePolling";
import { formatTime } from "../lib/format";
import { StatusBadge } from "../components/primitives/StatusBadge";
import { SeverityBadge } from "../components/primitives/SeverityBadge";
import { Panel } from "../components/primitives/Panel";
import { Barcode } from "../components/primitives/Barcode";
import { Odometer } from "../components/primitives/Odometer";
import { SectionDivider } from "../components/primitives/SectionDivider";
import { PipelineStep } from "../components/incident/PipelineStep";
import { ErrorCard } from "../components/incident/ErrorCard";
import { StackTraceCard } from "../components/incident/StackTraceCard";
import { CodeCard } from "../components/incident/CodeCard";
import { GitChangesCard } from "../components/incident/GitChangesCard";
import { RootCauseCard } from "../components/incident/RootCauseCard";
import { ImpactedFilesCard } from "../components/incident/ImpactedFilesCard";
import { SuggestedActionsCard } from "../components/incident/SuggestedActionsCard";
import { CrashChart } from "../components/charts/CrashChart";
import { ServiceGraph } from "../components/charts/ServiceGraph";

// The watcher never captures spans: its incidents carry a placeholder trace id
// ("tr_local") that has no trace row behind it. A missing trace degrades to a
// trace-less view — it must never fail the whole page as API OFFLINE.
const PLACEHOLDER_TRACE_IDS = new Set(["tr_000", "tr_local"]);
const CRASH_WINDOW_MS = 30 * 60_000;
const FALLBACK_POINTS = 60;

type LoadedTrace = Awaited<ReturnType<typeof fetchTrace>> | null;

function loadTrace(traceId: string): Promise<LoadedTrace> {
  if (!traceId || PLACEHOLDER_TRACE_IDS.has(traceId)) return Promise.resolve(null);
  return fetchTrace(traceId).catch(() => null);
}

interface Loaded {
  incident: Incident;
  trace: LoadedTrace;
  metrics: Awaited<ReturnType<typeof fetchMetrics>>;
  services: Awaited<ReturnType<typeof fetchServices>>;
}

interface IncidentViewProps {
  incidentId: string;
  onViewTrace: (traceId: string, spanId?: string) => void;
  onBack: () => void;
}

export const IncidentView: React.FC<IncidentViewProps> = ({
  incidentId,
  onViewTrace,
  onBack,
}) => {
  // Services and metrics are static — one-shot. The incident itself is fetched
  // once to learn its status; crashed incidents then poll so occurrences stay
  // fresh, keeping the trace/metrics loaded with the first response.
  const state = usePageData(() =>
    Promise.all([fetchIncident(incidentId), fetchServices(), fetchMetrics()]).then(
      ([incident, services, metrics]) =>
        loadTrace(incident.traceId).then((trace) => ({ incident, trace, metrics, services }))
    )
  );

  if (state.phase === "loaded" && state.data.incident.status === "crashed") {
    return <PollingBody incidentId={incidentId} initial={state.data} onViewTrace={onViewTrace} onBack={onBack} />;
  }

  return (
    <AsyncPage state={state}>
      {(data) => (
        <Body
          incident={data.incident}
          trace={data.trace}
          metrics={data.metrics}
          services={data.services}
          onViewTrace={onViewTrace}
          onBack={onBack}
        />
      )}
    </AsyncPage>
  );
};

const PollingBody: React.FC<{
  incidentId: string;
  initial: Loaded;
  onViewTrace: (traceId: string, spanId?: string) => void;
  onBack: () => void;
}> = ({ incidentId, initial, onViewTrace, onBack }) => {
  const polled = usePolling(() => fetchIncident(incidentId), 2000);
  const incident = polled.data ?? initial.incident;
  return (
    <Body
      incident={incident}
      trace={initial.trace}
      metrics={initial.metrics}
      services={initial.services}
      onViewTrace={onViewTrace}
      onBack={onBack}
    />
  );
};

interface BodyProps extends Loaded {
  onViewTrace: (traceId: string, spanId?: string) => void;
  onBack: () => void;
}

const Body: React.FC<BodyProps> = ({ incident, trace, metrics, services, onViewTrace, onBack }) => {
  const crashT = Date.parse(incident.detectedAt);
  const hasCrashT = Number.isFinite(crashT);

  // Compact crash chart: the ±30 min window when the metric series covers the
  // crash. Live incidents are detected after the series ends, so fall back to
  // the most recent hour — labelled with its real clock range, not "now".
  const crashWindow = React.useMemo(() => {
    const around =
      hasCrashT && metrics.length > 0
        ? metrics.filter((m) => m.t >= crashT - CRASH_WINDOW_MS && m.t <= crashT + CRASH_WINDOW_MS)
        : [];
    if (around.length > 1) return { data: around, title: "ERROR RATE · ±30 MIN AROUND CRASH" };
    const tail = metrics.slice(-FALLBACK_POINTS);
    if (tail.length < 2) return { data: tail, title: "ERROR RATE · NO DATA" };
    const span = (t: number) => formatTime(t).slice(0, 5);
    return {
      data: tail,
      title: `ERROR RATE · ${span(tail[0].t)} → ${span(tail[tail.length - 1].t)}`,
    };
  }, [metrics, crashT, hasCrashT]);

  // Blast radius: the incident's service node + its direct neighbors.
  const incidentService = services.nodes.find((s) => s.name === incident.service);
  const neighborIds = new Set<string>();
  if (incidentService) {
    neighborIds.add(incidentService.id);
    for (const e of services.edges) {
      if (e.from === incidentService.id) neighborIds.add(e.to);
      if (e.to === incidentService.id) neighborIds.add(e.from);
    }
  }
  const scopedNodes = services.nodes.filter((s) => neighborIds.has(s.id));
  const scopedEdges = services.edges.filter(
    (e) => neighborIds.has(e.from) && neighborIds.has(e.to)
  );

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="mono t-body font-bold text-ink mb-6 transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px]"
      >
        ← ALL INCIDENTS
      </button>

      {/* Incident meta panel — §14: brut-lg, the top elevation level */}
      <div className="border-2 border-ink shadow-brut-lg bg-paper p-6 mb-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="mono t-body font-bold text-ink tabular-nums">#{incident.id}</span>
            <StatusBadge status={incident.status} />
            <SeverityBadge severity={incident.severity} />
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="mono label">{incident.relativeTime}</span>
            {/* §10: the trace ID as a serialized artifact, top-right. No trace
                loaded (live watcher incident) → name the absence instead. */}
            {trace ? (
              <Barcode id={incident.traceId} />
            ) : (
              <span className="mono label text-muted">NO TRACE CAPTURED</span>
            )}
          </div>
        </div>

        <h1 className="t-kpi text-ink mt-4 tracking-tight">{incident.title}</h1>

        <div className="border-t-2 border-ink my-5" />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="label">ENVIRONMENT</div>
            <div className="mono t-body font-bold text-ink mt-1">{incident.environment}</div>
          </div>
          <div>
            <div className="label">SERVICE</div>
            <div className="mono t-body font-bold text-ink mt-1 truncate">{incident.service}</div>
          </div>
          <div>
            <div className="label">OCCURRENCES</div>
            <Odometer value={incident.occurrences} size="sm" className="font-bold text-ink mt-1" />
          </div>
          <div>
            <div className="label">USERS AFFECTED</div>
            <Odometer value={incident.usersAffected} size="sm" className="font-bold text-ink mt-1" />
          </div>
        </div>
      </div>

      {/* Compact crash chart — line + marker only, click opens the trace */}
      <Panel title={crashWindow.title} className="mb-0">
        <div className="p-2">
          <CrashChart
            data={crashWindow.data}
            compact
            showVolume={false}
            height={120}
            markerT={hasCrashT ? crashT : undefined}
            onSelectT={trace ? () => onViewTrace(incident.traceId) : undefined}
          />
        </div>
      </Panel>

      <SectionDivider name="POST-MORTEM PIPELINE" />

      {/* Vertical pipeline */}
      <div>
        <PipelineStep step={1} title="ERROR" subtitle="RUNTIME EXCEPTION" icon={AlertTriangle} accent="danger">
          <ErrorCard
            error={incident.error}
            occurrences={incident.occurrences}
            usersAffected={incident.usersAffected}
            onViewTrace={trace ? () => onViewTrace(incident.traceId) : undefined}
          />
        </PipelineStep>

        <PipelineStep step={2} title="STACK TRACE" subtitle="FRAME INSPECTION" icon={Terminal}>
          <StackTraceCard
            stack={incident.stack}
            onSelectFrame={
              trace
                ? (frame) => {
                    const span = Object.values(trace.spans).find(
                      (s) => String(s.attributes["code.filepath"]) === frame.file
                    );
                    onViewTrace(incident.traceId, span?.id);
                  }
                : undefined
            }
          />
        </PipelineStep>

        <PipelineStep step={3} title="AFFECTED CODE" subtitle="SOURCE CONTEXT" icon={Code2}>
          <CodeCard code={incident.code} />
        </PipelineStep>

        <PipelineStep step={4} title="RECENT GIT CHANGES" subtitle="FILE CORRELATION" icon={GitBranch}>
          <GitChangesCard gitChanges={incident.gitChanges} />
        </PipelineStep>

        {/* Inline blast radius panel between step 4 and step 5 */}
        <div className="flex items-stretch">
          <div className="w-10 flex flex-col items-center shrink-0">
            <div className="w-10 h-10 border-2 border-ink bg-warn flex items-center justify-center shrink-0">
              <Crosshair size={20} strokeWidth={2.25} className="text-ink" />
            </div>
            <div className="w-[2px] bg-ink flex-1" />
          </div>
          <div className="flex-1 min-w-0 pl-6 pb-10">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="label">BLAST RADIUS</span>
              <span className="label text-muted">DIRECT NEIGHBORS</span>
            </div>
            <div className="mt-4">
              <Panel title="SERVICE GRAPH · SCOPED" brackets>
                <ServiceGraph nodes={scopedNodes} edges={scopedEdges} height={280} />
              </Panel>
            </div>
          </div>
        </div>

        <PipelineStep step={5} title="SUSPECTED ROOT CAUSE" subtitle="COMMIT ATTRIBUTION" icon={Crosshair} accent="warning">
          <RootCauseCard rootCause={incident.rootCause} />
        </PipelineStep>

        <PipelineStep step={6} title="IMPACTED FILES" subtitle="PROPAGATION SCOPE" icon={FileText}>
          <ImpactedFilesCard impactedFiles={incident.impactedFiles} />
        </PipelineStep>

        <PipelineStep step={7} title="SUGGESTED ACTION" subtitle="REMEDIATION STEPS" icon={Wrench} accent="success" isLast>
          <SuggestedActionsCard actions={incident.suggestedActions} />
        </PipelineStep>
      </div>
    </div>
  );
};
