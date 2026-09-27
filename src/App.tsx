import React, { useState } from "react";
import { Sidebar } from "./components/chrome/Sidebar";
import { Topbar } from "./components/chrome/Topbar";
import { CommandRail } from "./components/chrome/CommandRail";
import { SectionDivider } from "./components/primitives/SectionDivider";
import { Panel } from "./components/primitives/Panel";
import { StatusBadge } from "./components/primitives/StatusBadge";
import { SeverityBadge } from "./components/primitives/SeverityBadge";
import { AsyncPage, usePageData } from "./components/primitives/AsyncPage";
import { LiveDashboard } from "./pages/LiveDashboard";
import { IncidentView } from "./pages/IncidentView";
import { TraceExplorer } from "./pages/TraceExplorer";
import { ServiceMap } from "./pages/ServiceMap";
import { fetchIncidents } from "./lib/api";

type View =
  | { type: "live" }
  | { type: "incidents" }
  | { type: "incident"; id: string }
  | { type: "traces"; traceId?: string; spanId?: string }
  | { type: "services" }
  | { type: "settings" };

const TITLES: Record<View["type"], { title: string; subtitle: string; section: string }> = {
  live: { title: "LIVE", subtitle: "production · all services", section: "LIVE" },
  incidents: { title: "INCIDENTS", subtitle: "all environments", section: "INCIDENTS" },
  incident: { title: "INCIDENT", subtitle: "post-mortem pipeline", section: "ROOT CAUSE" },
  traces: { title: "TRACE EXPLORER", subtitle: "spans · flame graph · waterfall", section: "TRACE" },
  services: { title: "SERVICES", subtitle: "topology · health", section: "TOPOLOGY" },
  settings: { title: "SETTINGS", subtitle: "workspace", section: "SETTINGS" },
};

// Pages with the command rail (Layer 3 §3): the main column narrows by 320px.
const RAIL_VIEWS: ReadonlySet<View["type"]> = new Set(["live", "incident", "traces", "services"]);

export const App: React.FC = () => {
  const [view, setView] = useState<View>({ type: "live" });

  const navKey = view.type === "incident" ? "incidents" : view.type;
  const meta = TITLES[view.type];
  const withRail = RAIL_VIEWS.has(view.type);

  return (
    <div className="flex h-full w-full bg-paper overflow-hidden">
      <Sidebar activeNav={navKey} onNavigate={(nav) => setView({ type: nav } as View)} />

      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <Topbar title={meta.title} subtitle={meta.subtitle} />

        <div className="flex-1 min-h-0 flex">
          <main
            className={
              view.type === "traces"
                ? "flex-1 min-w-0 min-h-0 overflow-hidden"
                : "flex-1 min-w-0 overflow-y-auto"
            }
          >
            {view.type === "live" && (
              <PageDivider section={meta.section}>
                <LiveDashboard
                  onSelectIncident={(id) => setView({ type: "incident", id })}
                  onSelectCrash={() => setView({ type: "incident", id: "1842" })}
                />
              </PageDivider>
            )}

            {view.type === "incidents" && (
              <PageDivider section={meta.section}>
                <IncidentsList onSelect={(id) => setView({ type: "incident", id })} />
              </PageDivider>
            )}

            {view.type === "incident" && (
              <PageDivider section={meta.section}>
                <IncidentView
                  incidentId={view.id}
                  onViewTrace={(traceId, spanId) => setView({ type: "traces", traceId, spanId })}
                  onBack={() => setView({ type: "incidents" })}
                />
              </PageDivider>
            )}

            {view.type === "traces" && (
              <PageDivider section={meta.section}>
                <TraceExplorer
                  traceId={view.traceId}
                  spanId={view.spanId}
                  onSelectSpan={(spanId) =>
                    setView((v) =>
                      v.type === "traces" ? { ...v, spanId } : { type: "traces", spanId }
                    )
                  }
                  onViewIncident={(id) => setView({ type: "incident", id })}
                />
              </PageDivider>
            )}

            {view.type === "services" && (
              <PageDivider section={meta.section}>
                <ServiceMap
                  onSelect={(id) =>
                    setView((v) => (v.type === "services" ? { ...v, selectedId: id } : v))
                  }
                />
              </PageDivider>
            )}

            {view.type === "settings" && (
              <div className="px-8 py-8">
                <Panel title="SETTINGS">
                  <div className="p-6 label">NOTHING TO CONFIGURE YET</div>
                </Panel>
              </div>
            )}
          </main>

          {withRail && <CommandRail />}
        </div>
      </div>
    </div>
  );
};

// §12: every page opens with a marquee strip naming the section.
const PageDivider: React.FC<{ section: string; children: React.ReactNode }> = ({
  section,
  children,
}) => (
  <div className="flex flex-col min-h-full">
    <SectionDivider name={section} />
    <div className="flex-1 min-h-0">{children}</div>
  </div>
);

const IncidentsList: React.FC<{ onSelect: (id: string) => void }> = ({ onSelect }) => {
  const state = usePageData(() => fetchIncidents());

  return (
    <div className="px-8 py-8">
      <AsyncPage state={state}>
        {(incidents) => (
          <Panel title="ALL INCIDENTS">
            <div>
              {incidents.map((inc) => (
                <button
                  key={inc.id}
                  type="button"
                  onClick={() => onSelect(inc.id)}
                  className="w-full text-left flex items-center gap-4 px-4 py-3.5 bg-paper border-b border-grid last:border-b-0 transition-none hover:bg-ink/[0.08] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-brut active:translate-x-[4px] active:translate-y-[4px] active:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  <span className="mono t-body font-bold text-ink tabular-nums w-14 shrink-0">
                    #{inc.id}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block t-body font-semibold text-ink truncate">
                      {inc.title}
                    </span>
                    <span className="block mono label truncate mt-0.5">
                      {inc.error.message}
                    </span>
                  </span>
                  <span className="mono label text-ink w-36 shrink-0 truncate">
                    {inc.service}
                  </span>
                  <StatusBadge status={inc.status} />
                  <SeverityBadge severity={inc.severity} />
                  <span className="mono label text-muted w-16 text-right shrink-0">
                    {inc.relativeTime}
                  </span>
                </button>
              ))}
            </div>
          </Panel>
        )}
      </AsyncPage>
    </div>
  );
};
