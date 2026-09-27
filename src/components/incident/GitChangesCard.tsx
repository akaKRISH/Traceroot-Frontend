import React from "react";
import { GitCommit } from "../../types";

interface GitChangesCardProps {
  gitChanges: GitCommit[];
}

export const GitChangesCard: React.FC<GitChangesCardProps> = ({ gitChanges }) => {
  if (gitChanges.length === 0) {
    return (
      <div className="border-2 border-dashed border-ink bg-paper p-8 text-center">
        <span className="mono label">
          NO RECENT COMMITS ON THIS FILE
        </span>
      </div>
    );
  }

  return (
    <div className="border-2 border-ink bg-paper divide-y divide-ink">
      {gitChanges.map((commit) => (
        <div
          key={commit.hash}
          className="p-3.5 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Square 28x28 avatar with initials and authorColor */}
            <div
              className="w-7 h-7 border-2 border-ink flex items-center justify-center text-[9px] font-bold text-ink shrink-0 select-none"
              style={{ backgroundColor: commit.authorColor }}
            >
              {commit.authorInitials}
            </div>

            <div className="min-w-0">
              <div className="t-body font-semibold text-ink truncate">
                {commit.message}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="px-1.5 py-0.5 border border-ink mono label text-ink font-bold bg-panel">
                  {commit.shortHash}
                </span>
                <span className="label text-muted">
                  {commit.author} · {commit.relativeTime} · {commit.filesChanged} files changed
                </span>
              </div>
            </div>
          </div>

          {/* Right side: +N additions / -N deletions */}
          <div className="mono tabular-nums label font-bold shrink-0 flex items-center gap-2">
            <span className="text-ok">+{commit.additions}</span>
            <span className="text-danger">−{commit.deletions}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
