import React from "react";
import { Panel } from "../components/primitives/Panel";
import { SectionDivider } from "../components/primitives/SectionDivider";
import { SeverityBadge } from "../components/primitives/SeverityBadge";
import { AsyncPage, usePageData } from "../components/primitives/AsyncPage";
import { ServiceGraph } from "../components/charts/ServiceGraph";
import { fetchServices } from "../lib/api";
import { pushRailEvent } from "../lib/railFeed";
import { formatDuration } from "../lib/format";
import { ServiceNode } from "../types";

interface ServiceMapProps {
  selectedId?: string;
  onSelect: (id: string) => void;
}

function severityFromErrorRate(n: number) {
  if (n >= 0.2) return "critical" as const;
  if (n >= 0.05) return "high" as const;
  if (n > 0) return "medium" as const;
  return "low" as const;
}

export const ServiceMap: React.FC<ServiceMapProps> = ({ selectedId, onSelect }) => {
  const state = usePageData(() =>
    fetchServices().then((data) => {
      // §3: the rail mirrors topology health on load.
      const degraded = data.nodes.filter((n) => n.health !== "healthy").length;
      pushRailEvent({
        type: degraded > 0 ? "WARN" : "OK",
        id: "svc_mesh",
        delta: `${degraded} DEGRADED`,
      });
      return data;
    })
  );

  return (
    <AsyncPage state={state}>
      {({ nodes, edges }) => {
        const nameOf = (id: string) => nodes.find((s) => s.id === id)?.name ?? id;
        const degraded = nodes.filter((s: ServiceNode) => s.health !== "healthy");

        return (
          <div className="pb-8">
            {/* §14: full-bleed topology — no inner padding, grid behind the nodes.
                The Panel renders the frame; the graph sits flush inside it. */}
            <Panel title="SERVICE TOPOLOGY" brackets className="shadow-none" bodyClassName="p-0">
              <ServiceGraph nodes={nodes} edges={edges} selectedId={selectedId} onSelect={onSelect} height={520} />
            </Panel>

            <SectionDivider name="SERVICE EDGES" />

            <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6 p-6">
              {/* Edge table */}
              <Panel title="SERVICE EDGES">
                <div>
                  <div className="grid grid-cols-[1fr_1fr_100px_100px_100px] items-center px-4 py-3 border-b-2 border-ink label text-ink/70">
                    <span>FROM</span>
                    <span>TO</span>
                    <span>CALLS</span>
                    <span>ERRORS</span>
                    <span>P95</span>
                  </div>
                  {edges.map((e) => (
                    <div
                      key={`${e.from}->${e.to}`}
                      className="grid grid-cols-[1fr_1fr_100px_100px_100px] items-center px-4 py-3 border-b border-grid last:border-b-0"
                    >
                      <span className="mono t-body text-ink truncate">{nameOf(e.from)}</span>
                      <span className="mono t-body text-ink truncate">{nameOf(e.to)}</span>
                      <span className="mono t-body text-ink tabular-nums">{e.calls}</span>
                      <span className={`mono t-body tabular-nums ${e.errors > 0 ? "text-danger font-bold" : "text-ink"}`}>
                        {e.errors}
                      </span>
                      <span className="mono t-body text-muted tabular-nums">
                        {e.p95 > 0 ? formatDuration(e.p95) : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </Panel>

              {/* Degraded services */}
              <Panel title="DEGRADED SERVICES">
                <div className="divide-y divide-ink">
                  {degraded.map((s) => (
                    <div key={s.id} className="p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mono t-body font-bold text-ink truncate">{s.name}</div>
                        <div className="mono label tabular-nums mt-0.5">
                          {s.health.toUpperCase()} · ERR {(s.errorRate * 100).toFixed(1)}% · P95 {formatDuration(s.p95)}
                        </div>
                      </div>
                      <SeverityBadge severity={severityFromErrorRate(s.errorRate)} />
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </div>
        );
      }}
    </AsyncPage>
  );
};
