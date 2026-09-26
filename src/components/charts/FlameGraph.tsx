import React, { useMemo } from "react";
import { Trace } from "../../types";
import { serviceColor } from "../../lib/svg";
import { cn } from "../../lib/cn";

interface FlameGraphProps {
  trace: Trace;
  selectedSpanId?: string;
  onSelectSpan?: (id: string) => void;
  width?: number;
}

const ROW_H = 24;
const RECT_H = 20;

interface Row {
  depth: number;
  spans: { id: string; x: number; w: number; service: string; status: string; operation: string }[];
}

export const FlameGraph: React.FC<FlameGraphProps> = ({
  trace,
  selectedSpanId,
  onSelectSpan,
  width,
}) => {
  const rows = useMemo<Row[]>(() => {
    const grouped: Row[] = [];
    const walk = (id: string, depth: number) => {
      const span = trace.spans[id];
      if (!span) return;
      while (grouped.length <= depth) grouped.push({ depth: grouped.length, spans: [] });
      grouped[depth].spans.push({
        id,
        x: (span.startMs / trace.durationMs) * 100,
        w: Math.max((span.durationMs / trace.durationMs) * 100, 0.4),
        service: span.service,
        status: span.status,
        operation: span.operation,
      });
      for (const child of span.children) walk(child, depth + 1);
    };
    walk(trace.rootSpanId, 0);
    return grouped;
  }, [trace]);

  return (
    <div className="w-full overflow-x-auto">
      <div style={{ minWidth: width, width: width ?? "100%", position: "relative" }}>
        {rows.map((row) => (
          <div key={row.depth} style={{ height: ROW_H, position: "relative" }} className="w-full">
            {row.spans.map((s) => {
              const isError = s.status === "error";
              const isSelected = s.id === selectedSpanId;
              const fill = isError ? "#ff4d4d" : serviceColor(s.service);
              const showText = s.w > 9;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectSpan?.(s.id)}
                  title={`${s.operation} · ${s.service}`}
                  className={cn(
                    "absolute top-0 border-2 border-ink text-left transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                    isError && "shadow-brut",
                    isSelected && "z-10"
                  )}
                  style={{
                    left: `${s.x}%`,
                    width: `${s.w}%`,
                    height: RECT_H,
                    background: fill,
                    outline: isSelected ? "2px solid #0a0a0a" : undefined,
                    outlineOffset: 0,
                  }}
                >
                  {showText && (
                    <span className="mono text-[9px] text-ink px-1 block truncate leading-[16px] tracking-[0.05em]">
                      {s.operation}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
