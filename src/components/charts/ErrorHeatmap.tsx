import React, { useState } from "react";
import { HeatmapCell } from "../../types";

interface ErrorHeatmapProps {
  cells: HeatmapCell[];
  services: string[];
  buckets: number;
}

const CELL = 12;
const GAP = 2;
const ROW_LABEL_W = 150;

function cellFill(errors: number): string {
  if (errors <= 0) return "#f5f3ee";
  if (errors <= 2) return "rgba(255, 184, 77, 0.4)";
  if (errors <= 9) return "#ffb84d";
  if (errors <= 49) return "rgba(255, 77, 77, 0.6)";
  return "#ff4d4d";
}

export const ErrorHeatmap: React.FC<ErrorHeatmapProps> = ({ cells, services, buckets }) => {
  const [hover, setHover] = useState<{ service: string; bucket: number } | null>(null);

  const byKey = new Map<string, number>();
  for (const c of cells) byKey.set(`${c.service}:${c.bucket}`, c.errors);

  const gridW = buckets * (CELL + GAP);
  const width = ROW_LABEL_W + gridW + 8;
  const height = services.length * (CELL + GAP) + 26;
  const hoveredErrors = hover ? byKey.get(`${hover.service}:${hover.bucket}`) ?? 0 : 0;

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="block" onMouseLeave={() => setHover(null)}>
        {/* Row labels: mono service names */}
        {services.map((s, r) => (
          <text
            key={s}
            x={ROW_LABEL_W - 6}
            y={22 + r * (CELL + GAP) + CELL / 2 + 3}
            fontSize="9"
            fill="rgba(10, 10, 10, 0.55)"
            textAnchor="end"
            className="mono uppercase tracking-[0.15em]"
          >
            {s}
          </text>
        ))}

        {/* Cells */}
        {services.map((s, r) =>
          Array.from({ length: buckets }, (_, c) => {
            const bucket = buckets - 1 - c; // left = oldest, right = now
            const errors = byKey.get(`${s}:${bucket}`) ?? 0;
            return (
              <rect
                key={`${s}:${bucket}`}
                x={ROW_LABEL_W + c * (CELL + GAP)}
                y={22 + r * (CELL + GAP)}
                width={CELL}
                height={CELL}
                fill={cellFill(errors)}
                stroke={errors <= 0 ? "#d9d6cf" : "#0a0a0a"}
                strokeWidth={errors <= 0 ? 1 : 1}
                onMouseEnter={() => setHover({ service: s, bucket })}
              />
            );
          })
        )}

        {/* Column labels: -60m ... now */}
        <text x={ROW_LABEL_W} y={12} fontSize="9" fill="rgba(10, 10, 10, 0.55)" className="mono uppercase tracking-[0.15em]">
          -60M
        </text>
        <text x={ROW_LABEL_W + Math.floor(buckets / 2) * (CELL + GAP)} y={12} fontSize="9" fill="rgba(10, 10, 10, 0.55)" textAnchor="middle" className="mono uppercase tracking-[0.15em]">
          -30M
        </text>
        <text x={ROW_LABEL_W + buckets * (CELL + GAP)} y={12} fontSize="9" fill="rgba(10, 10, 10, 0.55)" textAnchor="end" className="mono uppercase tracking-[0.15em]">
          NOW
        </text>

        {/* Hover tooltip — same hard-edged construction as chart tooltips */}
        {hover && (
          <g>
            {services.map((s, r) => {
              if (s !== hover.service) return null;
              const c = buckets - 1 - hover.bucket;
              return (
                <rect
                  key={s}
                  x={ROW_LABEL_W + c * (CELL + GAP) - 2}
                  y={22 + r * (CELL + GAP) - 2}
                  width={CELL + 4}
                  height={CELL + 4}
                  fill="none"
                  stroke="#0a0a0a"
                  strokeWidth={2}
                />
              );
            })}
            <g transform={`translate(${ROW_LABEL_W + 10}, ${height - 4})`}>
              <rect x={-4} y={-14} width={190} height={16} fill="#f5f3ee" stroke="#0a0a0a" strokeWidth={2} />
              <text x={2} y={-2} fontSize="9" fill="#0a0a0a" className="mono font-bold">
                {hover.service} · -{hover.bucket}m · {hoveredErrors} ERRORS
              </text>
            </g>
          </g>
        )}
      </svg>
    </div>
  );
};
