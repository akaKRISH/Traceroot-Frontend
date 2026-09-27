import React from "react";
import { IncidentStatus } from "../../types";

interface StatusBadgeProps {
  status: IncidentStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const statusStyles: Record<IncidentStatus, string> = {
    crashed: "bg-danger text-ink glow-danger",
    investigating: "bg-warn text-ink glow-warn",
    resolved: "bg-ok text-ink glow-ok",
    ignored: "bg-muted text-ink",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 border-2 border-ink text-[9px] font-bold uppercase tracking-[0.15em] ${statusStyles[status]}`}
    >
      <span className="w-1.5 h-1.5 bg-ink status-dot shrink-0" />
      {status}
    </span>
  );
};
