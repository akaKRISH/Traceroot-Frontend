import React from "react";
import { FileWarning } from "lucide-react";
import { ImpactedFile, RiskLevel } from "../../types";

interface ImpactedFilesCardProps {
  impactedFiles: ImpactedFile[];
}

export const ImpactedFilesCard: React.FC<ImpactedFilesCardProps> = ({
  impactedFiles,
}) => {
  const riskStyles: Record<RiskLevel, string> = {
    high: "bg-danger text-ink",
    medium: "bg-warn text-ink",
    low: "bg-muted text-ink",
  };

  return (
    <div className="border-2 border-ink bg-paper divide-y divide-ink">
      {impactedFiles.map((file) => (
        <div
          key={file.path}
          className="p-3.5 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3 min-w-0">
            <FileWarning size={16} strokeWidth={2.25} className="text-ink shrink-0" />
            <span className="mono t-body font-semibold text-ink truncate">
              {file.path}
            </span>
            <span className="label text-muted shrink-0">
              {file.changes} changes
            </span>
          </div>

          <span
            className={`border-2 border-ink px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] shrink-0 ${riskStyles[file.risk]}`}
          >
            {file.risk}
          </span>
        </div>
      ))}
    </div>
  );
};
