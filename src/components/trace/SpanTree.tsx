import React from "react";
import { Trace } from "../../types";
import { cn } from "../../lib/cn";

interface SpanTreeProps {
  trace: Trace;
  selectedSpanId?: string;
  onSelectSpan?: (id: string) => void;
}

export const SpanTree: React.FC<SpanTreeProps> = ({ trace, selectedSpanId, onSelectSpan }) => {
  const renderNode = (id: string, depth: number): React.ReactNode => {
    const span = trace.spans[id];
    if (!span) return null;
    const isError = span.status === "error";
    return (
      <div key={id}>
        <button
          type="button"
          onClick={() => onSelectSpan?.(id)}
          className={cn(
            "w-full text-left flex items-center gap-2 py-1 pr-2 transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink hover:bg-white",
            selectedSpanId === id && "bg-ink text-paper hover:bg-ink"
          )}
          style={{ paddingLeft: 8 + depth * 16 }}
        >
          <span
            className={cn(
              "w-1.5 h-1.5 shrink-0",
              isError ? "bg-danger" : selectedSpanId === id ? "bg-paper" : "bg-ink"
            )}
          />
          <span
            className={cn(
              "mono text-[9px] tracking-[0.05em] truncate",
              isError ? "text-danger font-bold" : selectedSpanId === id ? "text-paper" : "text-ink"
            )}
          >
            {span.operation}
          </span>
        </button>
        {span.children.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  };

  return <div className="py-2">{renderNode(trace.rootSpanId, 0)}</div>;
};
