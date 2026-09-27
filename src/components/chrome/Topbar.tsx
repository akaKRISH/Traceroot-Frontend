import React, { useEffect, useState } from "react";
import { Bell, Search } from "lucide-react";
import { useConnectionStatus, ConnStatus } from "../../lib/connection";
import { cn } from "../../lib/cn";

interface TopbarProps {
  title: string;
  subtitle: string;
}

function utcClock(): string {
  const d = new Date();
  const p = (v: number) => String(v).padStart(2, "0");
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} UTC`;
}

// 12px numeric ruler (§11): 1px ticks every 4px, 4px ticks every 20px.
// 56 ticks over 224px input height 28 → calibrated-instrument vocabulary.
const RulerTicks: React.FC = () => {
  const ticks = [];
  for (let i = 0; i <= 56; i++) {
    const major = i % 5 === 0;
    ticks.push(
      <span
        key={i}
        className={cn("absolute w-px", major ? "bg-ink/60 h-1" : "bg-ink/40 h-px")}
        style={{ left: i * 4 }}
      />
    );
  }
  return (
    <span className="relative block w-3 self-stretch shrink-0" aria-hidden="true">
      {ticks}
    </span>
  );
};

const STATUS_TEXT: Record<ConnStatus, string> = {
  live: "LIVE",
  retry: "RETRY",
  offline: "OFFLINE",
};
const STATUS_BG: Record<ConnStatus, string> = {
  live: "bg-ok text-ok status-dot",
  retry: "bg-danger text-danger status-dot",
  offline: "bg-muted text-muted status-dot",
};

export const Topbar: React.FC<TopbarProps> = ({ title, subtitle }) => {
  const [clock, setClock] = useState(utcClock());
  const status = useConnectionStatus();

  useEffect(() => {
    const id = setInterval(() => setClock(utcClock()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="h-[56px] border-b-2 border-ink bg-paper px-6 flex items-center justify-between shrink-0 select-none">
      {/* Left: title + subtitle */}
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="t-body font-bold tracking-tight text-ink uppercase truncate">{title}</h1>
        <span className="text-ink/40 t-body">/</span>
        <span className="label text-ink/70 truncate">{subtitle}</span>
      </div>

      {/* Right: ruler + search, UTC clock, bell, connection indicator */}
      <div className="flex items-center gap-4 shrink-0">
        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex items-stretch border-2 border-ink bg-paper shadow-brut"
        >
          <RulerTicks />
          <span className="pl-2 pr-1 text-ink/50 flex items-center">
            <Search size={14} strokeWidth={2.25} />
          </span>
          <input
            type="text"
            placeholder="search traces, errors…"
            className="px-2 py-1 bg-transparent mono t-body text-ink placeholder:text-ink/40 focus:outline-none w-44"
          />
        </form>

        <span className="mono t-body font-bold text-ink tabular-nums">{clock}</span>

        <button
          type="button"
          aria-label="Notifications"
          className="relative w-8 h-8 border-2 border-ink bg-paper shadow-brut flex items-center justify-center transition-none hover:bg-ink/[0.06] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[4px] active:translate-y-[4px] active:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <Bell size={16} strokeWidth={2.25} className="text-ink" />
          <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-danger border border-ink" />
        </button>

        {/* Connection indicator (§13) — ok square + LIVE / RETRY / OFFLINE */}
        <div className="flex flex-col items-center gap-1 w-14" title={`connection: ${status}`}>
          <span className={cn("w-1.5 h-1.5 shrink-0", STATUS_BG[status])} />
          <span className="mono label leading-none">{STATUS_TEXT[status]}</span>
        </div>
      </div>
    </header>
  );
};
