import React from "react";
import { LucideIcon } from "lucide-react";

interface PipelineStepProps {
  step: number;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  accent?: "default" | "danger" | "warning" | "success" | "info";
  isLast?: boolean;
  children: React.ReactNode;
}

export const PipelineStep: React.FC<PipelineStepProps> = ({
  step,
  title,
  subtitle,
  icon: Icon,
  accent = "default",
  isLast = false,
  children,
}) => {
  const accentBg: Record<string, string> = {
    default: "bg-paper",
    danger: "bg-danger",
    warning: "bg-warn",
    success: "bg-ok",
    info: "bg-info",
  };

  const stepNumber = String(step).padStart(2, "0");

  return (
    <div className="flex items-stretch">
      {/* Left column spine: 40px wide, centered */}
      <div className="w-10 flex flex-col items-center shrink-0">
        <div
          className={`w-10 h-10 border-2 border-ink shadow-brut flex items-center justify-center shrink-0 ${accentBg[accent]}`}
        >
          <Icon size={20} strokeWidth={2.25} className="text-ink" />
        </div>
        {!isLast && <div className="w-[2px] bg-ink flex-1" />}
      </div>

      {/* Right column content */}
      <div className={`flex-1 min-w-0 pl-6 ${isLast ? "" : "pb-10"}`}>
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="label">STEP {stepNumber}</span>
          <h3 className="t-body font-bold tracking-tight uppercase text-ink">
            {title}
          </h3>
          {subtitle && <span className="label text-muted">{subtitle}</span>}
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
};
