import React from "react";
import { GitCommit } from "../../types";

interface RootCauseCardProps {
  rootCause: {
    commit: GitCommit;
    confidence: number;
    reasoning: string[];
  };
}

export const RootCauseCard: React.FC<RootCauseCardProps> = ({ rootCause }) => {
  const { commit, confidence, reasoning } = rootCause;

  // ≥80 ok, ≥50 warn, else muted — SVG rect, not a div, so it stays crisp.
  const fillColor = confidence >= 80 ? "#3ddc84" : confidence >= 50 ? "#ffb84d" : "#a3a3a3";

  return (
    <div className="border-2 border-ink shadow-brut bg-warn/[0.06]">
      {/* Header strip */}
      <div className="bg-ink text-paper px-4 py-2.5 flex items-center justify-between border-b-2 border-ink gap-3 flex-wrap">
        <span className="label text-paper">SUSPECTED ROOT CAUSE</span>

        {/* Confidence meter as SVG rectangle */}
        <div className="border-2 border-ink bg-paper px-2 py-1 flex items-center gap-2.5">
          <svg width={96} height={14} aria-label={`Confidence ${confidence}%`}>
            <rect x={1} y={1} width={94} height={12} fill="#f5f3ee" stroke="#0a0a0a" strokeWidth={1} />
            <rect x={3} y={3} width={Math.max((confidence / 100) * 90, 2)} height={8} fill={fillColor} />
          </svg>
          <span className="mono font-bold t-body text-ink tabular-nums">{confidence}%</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Commit row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-7 h-7 border-2 border-ink flex items-center justify-center text-[9px] font-bold text-ink shrink-0 select-none"
              style={{ backgroundColor: commit.authorColor }}
            >
              {commit.authorInitials}
            </div>
            <div className="min-w-0">
              <div className="t-body font-semibold text-ink truncate">{commit.message}</div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="px-1.5 py-0.5 border border-ink mono label text-ink font-bold bg-white">
                  {commit.shortHash}
                </span>
                <span className="label text-muted">
                  {commit.author} · {commit.relativeTime} · {commit.filesChanged} files changed
                </span>
              </div>
            </div>
          </div>

          <div className="mono tabular-nums label font-bold shrink-0 flex items-center gap-2">
            <span className="text-ok">+{commit.additions}</span>
            <span className="text-danger">−{commit.deletions}</span>
          </div>
        </div>

        <div className="my-4 border-t-2 border-ink" />

        {/* Reasoning bullets: square 6px ink dots */}
        <ul className="space-y-2.5">
          {reasoning.map((reason) => (
            <li key={reason} className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 bg-ink shrink-0 mt-2" />
              <span className="t-body text-ink leading-relaxed font-normal">{reason}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
