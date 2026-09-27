import React from "react";
import { Undo2, GitPullRequest, FlaskConical, XCircle, LucideIcon } from "lucide-react";
import { SuggestedAction } from "../../types";

interface SuggestedActionsCardProps {
  actions: SuggestedAction[];
  onAction?: (action: SuggestedAction) => void;
}

export const SuggestedActionsCard: React.FC<SuggestedActionsCardProps> = ({
  actions,
  onAction,
}) => {
  const iconMap: Record<SuggestedAction["icon"], LucideIcon> = {
    revert: Undo2,
    pr: GitPullRequest,
    test: FlaskConical,
    dismiss: XCircle,
  };

  const variantBg: Record<SuggestedAction["variant"], string> = {
    primary: "bg-info/[0.12] hover:bg-info/[0.18]",
    danger: "bg-danger/[0.12] hover:bg-danger/[0.18]",
    default: "bg-paper hover:bg-ink/[0.08]",
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {actions.map((action) => {
        const IconComponent = iconMap[action.icon] || XCircle;

        return (
          <button
            key={action.id}
            type="button"
            onClick={() => onAction?.(action)}
            className={`w-full border-2 border-ink shadow-brut p-4 flex items-start gap-3.5 text-left transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[4px] active:translate-y-[4px] active:shadow-none ${
              variantBg[action.variant]
            }`}
          >
            <IconComponent
              size={20}
              strokeWidth={2.25}
              className="text-ink shrink-0 mt-0.5"
            />
            <div className="min-w-0">
              <div className="t-body font-bold text-ink">{action.label}</div>
              <div className="label text-muted mt-1">{action.description}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
