import React from "react";
import { CodeLine } from "../../types";

interface CodeCardProps {
  code: {
    file: string;
    startLine: number;
    lines: CodeLine[];
  };
}

export const CodeCard: React.FC<CodeCardProps> = ({ code }) => {
  return (
    <div className="border-2 border-ink bg-paper">
      {/* Header Strip */}
      <div className="border-b-2 border-ink bg-paper px-4 py-2.5 flex items-center justify-between">
        <span className="mono t-body font-bold text-ink">{code.file}</span>
        <span className="label">SOURCE</span>
      </div>

      {/* Body */}
      <div className="font-mono t-body leading-[24px] overflow-x-auto py-2">
        {code.lines.map((line) => {
          const isHighlighted = Boolean(line.highlight);

          return (
            <div
              key={`${code.file}-${line.number}`}
              className={`flex items-center ${
                isHighlighted
                  ? "bg-danger/[0.12] border-l-4 border-l-danger"
                  : "border-l-4 border-l-transparent"
              }`}
            >
              {/* 48px gutter for line numbers with 2px ink divider */}
              <div className="w-12 text-right pr-3 text-muted select-none border-r-2 border-ink shrink-0 tabular-nums">
                {line.number}
              </div>

              {/* Raw code content */}
              <div className="pl-4 pr-4 flex-1 whitespace-pre text-ink">
                {line.content}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
