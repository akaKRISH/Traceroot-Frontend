import React from "react";
import { Severity } from "../../types";

interface SeverityBadgeProps {
  severity: Severity;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity }) => {
  const severityStyles: Record<Severity, string> = {
    critical: "bg-danger text-ink glow-danger",
    high: "bg-warn text-ink glow-warn",
    medium: "bg-info text-paper",
    low: "bg-muted text-ink",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 border-2 border-ink text-[9px] font-bold uppercase tracking-[0.15em] ${severityStyles[severity]}`}
    >
      <span className="w-1.5 h-1.5 bg-current shrink-0" />
      {severity}
    </span>
  );
};
