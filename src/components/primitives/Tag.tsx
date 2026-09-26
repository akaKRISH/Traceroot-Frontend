import React from "react";
import { cn } from "../../lib/cn";

export type TagColor =
  | "ink"
  | "danger"
  | "warn"
  | "ok"
  | "info"
  | "violet"
  | "muted";

interface TagProps {
  children: React.ReactNode;
  color?: TagColor;
  className?: string;
}

const tagColors: Record<TagColor, string> = {
  ink: "bg-ink text-paper",
  danger: "bg-danger/[0.15] text-ink",
  warn: "bg-warn/[0.2] text-ink",
  ok: "bg-ok/[0.2] text-ink",
  info: "bg-info/[0.15] text-ink",
  violet: "bg-violet/[0.15] text-ink",
  muted: "bg-muted/[0.3] text-ink",
};

export const Tag: React.FC<TagProps> = ({ children, color = "ink", className }) => {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border-2 border-ink px-2 py-0.5 mono text-[9px] font-bold uppercase tracking-[0.1em]",
        tagColors[color],
        className
      )}
    >
      {children}
    </span>
  );
};
