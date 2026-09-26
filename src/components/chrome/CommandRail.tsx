import React, { useEffect, useRef } from "react";
import { pushRailEvent, useRailFeed, RailEvent, RailEventType } from "../../lib/railFeed";
import { cn } from "../../lib/cn";

const TYPE_COLOR: Record<RailEventType, string> = {
  ERR: "text-danger",
  OK: "text-ok",
  SPAN: "text-info",
  WARN: "text-warn",
};

const SERVICES = ["api", "cart", "payment", "identity", "inventory", "worker"];

function hex4(): string {
  return Math.random().toString(16).slice(2, 6);
}

// SIM generator (§3): 1–3 events per second so the stream is never empty
// during a demo. Display-only; every row is labeled SIM.
function emitSim(): void {
  const n = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    const roll = Math.random();
    const svc = SERVICES[Math.floor(Math.random() * SERVICES.length)];
    if (roll < 0.18) {
      pushRailEvent({ type: "ERR", id: `tr_${hex4()}`, delta: `+${(Math.random() * 2).toFixed(2)}%`, sim: true });
    } else if (roll < 0.38) {
      pushRailEvent({ type: "WARN", id: `svc_${svc.slice(0, 3)}`, delta: `p99 ${Math.round(80 + Math.random() * 400)}ms`, sim: true });
    } else if (roll < 0.66) {
      pushRailEvent({ type: "SPAN", id: `sp_${hex4()}`, delta: `+${Math.round(2 + Math.random() * 60)}ms`, sim: true });
    } else {
      pushRailEvent({ type: "OK", id: `svc_${svc.slice(0, 3)}`, delta: `+${Math.round(1 + Math.random() * 40)}/s`, sim: true });
    }
  }
}

const RailRow: React.FC<{ ev: RailEvent; animate: boolean }> = ({ ev, animate }) => {
  return (
    <div
      className={cn(
        "flex h-[20px] shrink-0 items-center gap-2 px-3 whitespace-pre mono text-[10px] leading-none",
        ev.sim && "text-ink/55"
      )}
      style={
        animate
          ? {
              animation:
                "rail-enter 150ms ease-out both, rail-flash 2s steps(1) forwards",
              ["--flash" as string]:
                ev.type === "ERR" ? "rgba(255, 77, 77, 0.16)" : "rgba(10, 10, 10, 0.07)",
            }
          : undefined
      }
    >
      <span className="text-ink/55 shrink-0">{ev.time}</span>
      <span className={cn("font-bold shrink-0 w-[30px]", TYPE_COLOR[ev.type])}>{ev.type}</span>
      <span className="text-ink/55 shrink-0 truncate">{ev.id}</span>
      <span className="flex-1" />
      <span className="font-bold text-ink tabular-nums shrink-0">{ev.delta}</span>
      {ev.sim && <span className="text-ink/40 shrink-0">SIM</span>}
    </div>
  );
};

/**
 * Command rail (Layer 3 §3) — the Bloomberg column. 320px, right edge,
 * above the fold: header strip, raw event list, footer readouts. Real
 * events arrive via railFeed (pushed by page polling loops); SIM events
 * keep the stream alive between polls.
 */
export const CommandRail: React.FC = () => {
  const events = useRailFeed();
  const listRef = useRef<HTMLDivElement>(null);
  const mountAt = useRef(Date.now());

  useEffect(() => {
    const id = setInterval(emitSim, 1000);
    return () => clearInterval(id);
  }, []);

  // Newest at top: snap to top only if the user is already reading the head.
  useEffect(() => {
    const el = listRef.current;
    if (el && el.scrollTop < 60) el.scrollTop = 0;
  }, [events.length]);

  const oneMinAgo = Date.now() - 60_000;
  const evtPerMin = events.filter((e) => e.at >= oneMinAgo).length;

  return (
    <aside className="w-[320px] shrink-0 h-full flex flex-col bg-paper border-l-2 border-ink select-none">
      {/* Header strip — 32px */}
      <div className="h-8 shrink-0 border-b-2 border-ink px-3 flex items-center justify-between">
        <span className="label text-ink">EVENT STREAM</span>
        <span className="w-1.5 h-1.5 bg-ok animate-pulse" />
      </div>

      {/* Raw event list */}
      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex flex-col">
          {[...events].reverse().map((ev) => (
            <RailRow key={ev.key} ev={ev} animate={ev.at >= mountAt.current} />
          ))}
        </div>
      </div>

      {/* Footer strip — 28px */}
      <div className="h-7 shrink-0 border-t-2 border-ink px-3 flex items-center justify-between mono text-[9px] tracking-[0.15em] uppercase text-ink/55">
        <span>
          EVT/MIN <b className="text-ink font-bold">{evtPerMin}</b>
        </span>
        <span>
          BUF <b className="text-ink font-bold">512/512</b>
        </span>
      </div>
    </aside>
  );
};
