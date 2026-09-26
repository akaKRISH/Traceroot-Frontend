import React from "react";
import { LucideIcon } from "lucide-react";
import { Sparkline } from "./Sparkline";
import { Odometer } from "./Odometer";
import { cn } from "../../lib/cn";

interface StatTileProps {
  label: string;
  /** Numeric — the odometer rolls digit-by-digit on poll updates. */
  value: number;
  delta?: { text: string; positive: boolean };
  icon: LucideIcon;
  spark?: number[];
  className?: string;
}

// Flush by contract (Layer 3 §14): tiles are chrome, shadow-none is the default.
export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  delta,
  icon: Icon,
  spark,
  className,
}) => {
  return (
    <div
      className={cn(
        "relative border-2 border-ink bg-paper shadow-none p-5",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="label">{label}</span>
        <div className="w-8 h-8 bg-ink border-2 border-ink flex items-center justify-center shrink-0">
          <Icon size={16} strokeWidth={2.25} className="text-paper" />
        </div>
      </div>

      <div className="mt-3">
        <Odometer value={value} size="lg" className="text-ink" />
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        {delta ? (
          <span
            className={cn(
              "mono text-[9px] font-bold tabular-nums tracking-[0.15em] uppercase",
              delta.positive ? "text-ok" : "text-danger"
            )}
          >
            {delta.text}
          </span>
        ) : (
          <span />
        )}
        {spark && spark.length > 1 && (
          <Sparkline data={spark} width={60} height={20} />
        )}
      </div>
    </div>
  );
};
