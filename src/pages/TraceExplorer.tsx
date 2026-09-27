import React from "react";
import { fetchIncidents, fetchTrace } from "../lib/api";
import { usePageData, AsyncPage } from "../components/primitives/AsyncPage";
import { Panel } from "../components/primitives/Panel";
import { Barcode } from "../components/primitives/Barcode";
import { SectionDivider } from "../components/primitives/SectionDivider";
import { StatusBadge } from "../components/primitives/StatusBadge";
import { SpanTree } from "../components/trace/SpanTree";
import { AttributeTable } from "../components/trace/AttributeTable";
import { FlameGraph } from "../components/charts/FlameGraph";
import { TraceWaterfall } from "../components/charts/TraceWaterfall";
import { formatDuration, formatTime } from "../lib/format";
import { pushRailEvent } from "../lib/railFeed";
import { ArrowUpRight } from "lucide-react";

interface TraceExplorerProps {
  traceId?: string;
  spanId?: string;
  onSelectSpan: (spanId: string) => void;
  onViewIncident: (incidentId: string) => void;
}

export const TraceExplorer: React.FC<TraceExplorerProps> = ({
  traceId,
  spanId,
  onSelectSpan,
  onViewIncident,
}) => {
  const state = usePageData(() =>
    Promise.all([fetchIncidents(), fetchTrace(traceId ?? "tr_1842_root")]).then(
      ([incidents, trace]) => {
        // §3: one SPAN event per explorer load — the rail mirrors navigation.
        pushRailEvent({
          type: "SPAN",
          id: trace.id.slice(0, 8),
          delta: `${Object.keys(trace.spans).length} SPANS`,
        });
        return { incidents, trace };
      }
    )
  );

  return (
    <AsyncPage state={state}>
      {({ incidents, trace }) => (
        <Body
          trace={trace}
          incidents={incidents}
          spanId={spanId}
          onSelectSpan={onSelectSpan}
          onViewIncident={onViewIncident}
        />
      )}
    </AsyncPage>
  );
};

interface BodyProps {
  trace: Awaited<ReturnType<typeof fetchTrace>>;
  incidents: Awaited<ReturnType<typeof fetchIncidents>>;
  spanId?: string;
  onSelectSpan: (spanId: string) => void;
  onViewIncident: (incidentId: string) => void;
}

const Body: React.FC<BodyProps> = ({ trace, incidents, spanId, onSelectSpan, onViewIncident }) => {
  const span = trace.spans[spanId ?? trace.rootSpanId];
  const spanCount = Object.keys(trace.spans).length;

  const linkedIncident =
    incidents.find((i) => i.traceId === trace.id) ??
    (trace.incidentId ? incidents.find((i) => i.id === trace.incidentId) : undefined);

  if (!span) {
    return (
      <div className="p-8">
        <Panel title="TRACE EXPLORER">
          <div className="p-6 label">NO TRACE DATA</div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Left rail: span tree */}
      <div className="w-[280px] shrink-0 border-r-2 border-ink overflow-y-auto">
        <div className="border-b-2 border-ink px-4 py-3">
          <div className="label">TRACE</div>
          {/* §10: the trace ID as a serialized artifact */}
          <Barcode id={trace.id} className="mt-1.5" />
          <div className="mono label mt-1.5 tabular-nums">
            {formatTime(trace.startedAt)} · {formatDuration(trace.durationMs)}
          </div>
        </div>
        <SpanTree trace={trace} selectedSpanId={span.id} onSelectSpan={onSelectSpan} />
      </div>

      {/* Center: flame graph + waterfall */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="h-[40%] flex flex-col min-h-[420px]">
          <Panel
            title={`FLAME GRAPH · ${trace.id}`}
            className="border-0 shadow-none flex-1 flex flex-col"
            bodyClassName="flex-1 overflow-auto p-3"
            brackets
            right={
              <span className="mono label tabular-nums">
                {spanCount} SPANS · {formatDuration(trace.durationMs)}
              </span>
            }
          >
            <FlameGraph trace={trace} selectedSpanId={span.id} onSelectSpan={onSelectSpan} />
          </Panel>
        </div>

        <SectionDivider name="WATERFALL" />

        <div className="h-[60%] flex flex-col min-h-[500px]">
          <Panel
            title="WATERFALL"
            className="border-0 shadow-none flex-1 flex flex-col"
            bodyClassName="flex-1 overflow-auto"
            brackets
          >
            <TraceWaterfall trace={trace} selectedSpanId={span.id} onSelectSpan={onSelectSpan} />
          </Panel>
        </div>
      </div>

      {/* Right rail: span detail */}
      <div className="w-[340px] shrink-0 border-l-2 border-ink overflow-y-auto p-4 space-y-4">
        <Panel title="SPAN">
          <div className="p-4 space-y-2">
            <div className="mono t-body font-bold text-ink break-all">{span.operation}</div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="mono label">{span.service}</span>
              {span.status !== "unset" && <StatusBadge status={span.status === "error" ? "crashed" : "resolved"} />}
            </div>
            <div className="mono label text-ink tabular-nums">
              {formatDuration(span.durationMs)} · START +{span.startMs}MS
            </div>
          </div>
        </Panel>

        {span.status === "error" && (
          <Panel title="EXCEPTION" className="border-[3px]">
            <div className="p-4 space-y-3">
              <div className="mono t-body text-danger font-bold break-all">{span.errorMessage}</div>
              {linkedIncident && (
                <button
                  type="button"
                  onClick={() => onViewIncident(linkedIncident.id)}
                  className="w-full flex items-center justify-center gap-2 border-2 border-ink bg-ink text-paper mono t-body font-bold uppercase tracking-[0.1em] py-2 transition-none hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  <ArrowUpRight size={14} strokeWidth={2.25} />
                  VIEW INCIDENT #{linkedIncident.id}
                </button>
              )}
            </div>
          </Panel>
        )}

        <Panel title="ATTRIBUTES">
          <div className="p-3">
            <AttributeTable attributes={span.attributes} />
          </div>
        </Panel>

        <Panel title="EVENTS">
          <div className="p-4">
            {span.events.length === 0 ? (
              <div className="label">NO EVENTS</div>
            ) : (
              <ul className="space-y-2.5">
                {span.events.map((ev, i) => (
                  <li key={`${ev.name}-${i}`} className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 bg-ink shrink-0" />
                    <span className="mono text-[9px] text-muted tabular-nums shrink-0 tracking-[0.05em]">
                      +{ev.t}MS
                    </span>
                    <span className="mono t-body text-ink">{ev.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
};
