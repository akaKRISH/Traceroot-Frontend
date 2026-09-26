import React from "react";
import { AlertTriangle, GitBranch } from "lucide-react";

interface ErrorCardProps {
  error: {
    type: string;
    message: string;
    raw: string;
  };
  occurrences: number;
  usersAffected: number;
  onViewTrace?: () => void;
}

export const ErrorCard: React.FC<ErrorCardProps> = ({
  error,
  occurrences,
  usersAffected,
  onViewTrace,
}) => {
  return (
    <div className="border-2 border-ink shadow-brut bg-danger/[0.08]">
      {/* Header strip */}
      <div className="bg-ink text-paper px-4 py-2.5 flex items-center justify-between border-b-2 border-ink gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle size={16} strokeWidth={2.25} className="text-paper shrink-0" />
          <span className="label text-paper">ERROR: {error.type}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="mono label text-paper/90 hidden sm:inline">
            {occurrences} OCC · {usersAffected} USERS
          </span>
          {onViewTrace && (
            <button
              type="button"
              onClick={onViewTrace}
              className="flex items-center gap-1.5 border-2 border-paper bg-paper text-ink px-2 py-0.5 mono text-[9px] font-bold uppercase tracking-[0.1em] transition-none hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
            >
              <GitBranch size={12} strokeWidth={2.25} />
              VIEW TRACE
            </button>
          )}
        </div>
      </div>

      {/* Raw error in mono danger on paper */}
      <div className="p-4">
        <div className="border-2 border-ink bg-paper p-4 mono t-body text-danger leading-relaxed overflow-x-auto whitespace-pre">
          {error.raw}
        </div>
      </div>
    </div>
  );
};
