import React from "react";
import { Activity, AlertOctagon, GitBranch, Network, Settings } from "lucide-react";
import { LiveTicker } from "./LiveTicker";

interface SidebarProps {
  activeNav: string;
  onNavigate: (nav: string) => void;
}

const navItems = [
  { id: "live", label: "Live", icon: Activity },
  { id: "incidents", label: "Incidents", icon: AlertOctagon },
  { id: "traces", label: "Traces", icon: GitBranch },
  { id: "services", label: "Services", icon: Network },
  { id: "settings", label: "Settings", icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeNav, onNavigate }) => {
  return (
    <aside className="w-[240px] shrink-0 h-full bg-paper border-r-2 border-ink flex flex-col select-none">
      {/* Logo block */}
      <div className="flex items-center gap-3 p-4 pb-4">
        <div className="w-8 h-8 bg-ink border-2 border-ink flex items-center justify-center font-bold text-paper t-body shrink-0">
          T
        </div>
        <div className="min-w-0">
          <div className="t-body font-bold tracking-tight text-ink leading-tight">
            TraceRoot
          </div>
          <div className="label">RUNTIME TRACING</div>
        </div>
      </div>

      {/* Live ticker strip */}
      <div className="px-4 pb-4">
        <LiveTicker />
      </div>

      {/* Nav */}
      <nav className="space-y-2 px-4 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 t-body font-bold text-left transition-none border-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[4px] active:translate-y-[4px] active:shadow-none ${
                isActive
                  ? "bg-ink text-paper border-ink shadow-brut"
                  : "bg-transparent text-ink border-transparent hover:bg-white hover:border-ink hover:shadow-brut"
              }`}
            >
              <Icon
                size={16}
                strokeWidth={2.25}
                className={isActive ? "text-paper" : "text-ink"}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Watcher status strip */}
      <div className="m-4 border-2 border-ink bg-paper p-3 flex items-center gap-2.5">
        <span className="w-1.5 h-1.5 bg-ok shrink-0" />
        <span className="label text-ink">WATCHER ONLINE · V0.0.1</span>
      </div>
    </aside>
  );
};
