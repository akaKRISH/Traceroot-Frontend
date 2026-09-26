import React, { useEffect, useMemo, useState } from "react";
import { formatDelta, formatErrorRate } from "../../lib/format";
import { Odometer } from "../primitives/Odometer";
import { cn } from "../../lib/cn";

// Anchored to the API's crash-window rate. Step 4's watcher replaces the
// anchor with POSTed incidents; the walk already reacts to the anchor value.
export const LiveTicker: React.FC<{ anchorErrPct?: number }> = ({ anchorErrPct = 34.19 }) => {
  const [errPct, setErrPct] = useState(anchorErrPct);
  const [prev, setPrev] = useState(anchorErrPct);

  useEffect(() => {
    setErrPct(anchorErrPct);
    setPrev(anchorErrPct);
  }, [anchorErrPct]);

  useEffect(() => {
    const id = setInterval(() => {
      setErrPct((p) => {
        setPrev(p);
        const drift = (Math.random() - 0.45) * 0.6;
        const pulled = p + (anchorErrPct - p) * 0.15;
        return Math.max(0, pulled + drift);
      });
    }, 1000);
    return () => clearInterval(id);
  }, [anchorErrPct]);

  const delta = useMemo(() => {
    const d = prev !== 0 ? ((errPct - prev) / prev) * 100 : 0;
    return formatDelta(d);
  }, [errPct, prev]);

  const alert = errPct > 5;

  return (
    <div
      className={cn(
        "h-12 border-2 border-ink bg-paper px-3 flex items-center gap-3",
        alert && "bg-danger/[0.08]"
      )}
    >
      <span
        className={cn("w-1.5 h-1.5 shrink-0 animate-pulse", alert ? "bg-danger" : "bg-ok")}
      />
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="label">ERR/S</span>
          <Odometer value={formatErrorRate(errPct)} size="sm" className="font-bold text-ink" />
        </div>
        <div
          className={cn(
            "mono text-[9px] font-bold tabular-nums tracking-[0.05em]",
            delta.positive ? "text-ok" : "text-danger"
          )}
        >
          {delta.text}
        </div>
      </div>
    </div>
  );
};
