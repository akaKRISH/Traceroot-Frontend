import React from "react";
import { ArrowRight } from "lucide-react";
import { StackFrame } from "../../types";

interface StackTraceCardProps {
  stack: StackFrame[];
  onSelectFrame?: (frame: StackFrame) => void;
}

export const StackTraceCard: React.FC<StackTraceCardProps> = ({ stack, onSelectFrame }) => {
  return (
    <div className="border-2 border-ink bg-paper divide-y divide-ink">
      {stack.map((frame, idx) => {
        const stableKey = `${frame.file}-${frame.line}-${frame.column}-${idx}`;
        const clickable = Boolean(onSelectFrame);

        const body = (
          <>
            {/* Index */}
            <span className="mono text-muted label w-6 text-right shrink-0 tabular-nums">
              {idx + 1}
            </span>

            {/* Function name */}
            <span className="mono text-ink t-body font-bold shrink-0">{frame.function}</span>

            <div className="flex-1 min-w-4" />

            {/* File path + line:col */}
            <span className="mono t-body text-ink truncate">{frame.file}</span>
            <span className="mono text-muted label shrink-0 tabular-nums">
              :{frame.line}:{frame.column}
            </span>

            {/* Hover affordance */}
            {clickable && (
              <ArrowRight
                size={14}
                strokeWidth={2.25}
                className="text-ink shrink-0 ml-2 opacity-0 group-hover:opacity-100"
              />
            )}
          </>
        );

        const classes = `group px-4 py-3 flex items-center gap-3 t-body transition-none ${
          frame.inApp
            ? "bg-paper border-l-4 border-l-ink"
            : "opacity-45 border-l-4 border-l-transparent"
        } hover:opacity-100 hover:bg-ink/[0.08] hover:shadow-brut z-0 hover:z-10 ${
          clickable
            ? "w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            : ""
        }`;

        return clickable ? (
          <button key={stableKey} type="button" onClick={() => onSelectFrame?.(frame)} className={classes}>
            {body}
          </button>
        ) : (
          <div key={stableKey} className={classes}>
            {body}
          </div>
        );
      })}
    </div>
  );
};
