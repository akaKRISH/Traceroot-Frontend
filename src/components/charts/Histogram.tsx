import React from "react";
import { scaleLinear } from "../../lib/svg";

interface HistogramProps {
  buckets: number[];
  labels: string[];
  height?: number;
  threshold?: number;
}

const PAD = { top: 10, right: 8, bottom: 22, left: 8 };

export const Histogram: React.FC<HistogramProps> = ({
  buckets,
  labels,
  height = 240,
  threshold,
}) => {
  const width = 420;
  const max = Math.max(...buckets, 1);
  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const y = scaleLinear([0, max], [PAD.top + innerH, PAD.top]);
  const slot = innerW / buckets.length;
  const barW = slot - 6;

  return (
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
        {/* Zero baseline */}
        <line x1={PAD.left} x2={width - PAD.right} y1={PAD.top + innerH} y2={PAD.top + innerH} stroke="var(--ink)" strokeWidth={2} />

        {buckets.map((v, i) => {
          const x = PAD.left + i * slot + 3;
          const yTop = y(v);
          const hot = threshold !== undefined && v > threshold;
          return (
            <g key={i}>
              <rect
                x={x}
                y={yTop}
                width={barW}
                height={Math.max(PAD.top + innerH - yTop, 1)}
                fill={hot ? "#ff4d4d" : "var(--paper)"}
                stroke="var(--ink)"
                strokeWidth={2}
              />
              <text
                x={x + barW / 2}
                y={height - 8}
                fontSize="9"
                fill="var(--ink-soft)"
                textAnchor="middle"
                className="mono uppercase tracking-[0.15em]"
              >
                {labels[i] ?? ""}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
