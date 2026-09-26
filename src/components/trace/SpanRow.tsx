import React from "react";
import { Span } from "../../types";
import { formatDuration } from "../../lib/format";
import { serviceColor } from "../../lib/svg";
import { cn } from "../../lib/cn";

interface SpanRowProps {
  span: Span;
  depth: number;
  selected: boolean;
  /** Playhead is inside [startMs, startMs+durationMs] — ink@6% flash (§6). */
  active?: boolean;
  onSelect?: (id: string) => void;
  maxDurationMs: number;
  containerWidth: number;
}

export const SpanRow: React.FC<SpanRowProps> = ({
  span,
  depth,
  selected,
  active = false,
  onSelect,
  maxDurationMs,
  containerWidth,
}) => {
  const leftPct = (span.startMs / maxDurationMs) * 100;
  const widthPct = Math.max((span.durationMs / maxDurationMs) * 100, 0.6);
  const barColor = span.status === "error" ? "#ff4d4d" : serviceColor(span.service);

  return (
    <button
      type="button"
      onClick={() => onSelect?.(span.id)}
      className={cn(
        "w-full text-left flex items-stretch transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        selected
          ? "bg-white border-l-4 border-l-ink"
          : active
            ? "bg-ink/[0.06] border-l-4 border-l-transparent hover:bg-white"
            : "bg-paper border-l-4 border-l-transparent hover:bg-white"
      )}
    >
      {/* Left column: indented operation + service */}
      <div className="w-[320px] shrink-0 px-3 py-2 border-r-2 border-ink overflow-hidden">
        <div className="flex items-center gap-2" style={{ paddingLeft: depth * 16 }}>
          <span className="w-1.5 h-1.5 bg-ink shrink-0" />
          <span className="mono t-body font-bold text-ink truncate">{span.operation}</span>
        </div>
        <div className="label mt-0.5 truncate" style={{ paddingLeft: depth * 16 + 14 }}>
          {span.service}
        </div>
      </div>

      {/* Right column: timing bar */}
      <div className="flex-1 relative flex items-center" style={{ minWidth: containerWidth / 4 }}>
        <div className="relative w-full h-full">
          {/* absolute position tick */}
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-ink/60"
            style={{ left: `${leftPct}%` }}
          />
          {/* duration bar */}
          <div
            className="absolute top-1/2 -translate-y-1/2 h-[12px] border border-ink"
            style={{ left: `${leftPct}%`, width: `${widthPct}%`, background: barColor }}
            title={`${formatDuration(span.durationMs)} @ +${span.startMs}ms`}
          />
        </div>
      </div>
    </button>
  );
};
