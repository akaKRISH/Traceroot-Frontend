import React, { useMemo, useState } from "react";
import { MetricPoint } from "../../types";
import { formatDuration } from "../../lib/format";
import { areaPath, scaleLinear, stepPath, useMeasure, timeTicks } from "../../lib/svg";

interface LatencyBandsProps {
  data: MetricPoint[];
  height?: number;
}

const PAD = { top: 10, right: 8, bottom: 20, left: 8 };
const Y_TICKS = [0, 50, 100, 250, 500];

export const LatencyBands: React.FC<LatencyBandsProps> = ({ data, height = 240 }) => {
  const [ref, width] = useMeasure<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const geom = useMemo(() => {
    if (width <= 0 || data.length === 0) return null;
    const t0 = data[0].t;
    const t1 = data[data.length - 1].t;
    const innerW = width - PAD.left - PAD.right;
    const innerH = height - PAD.top - PAD.bottom;
    const x = scaleLinear([t0, t1], [PAD.left, PAD.left + innerW]);
    const y = scaleLinear([0, 500], [PAD.top + innerH, PAD.top]);
    const p50 = data.map((d) => ({ x: x(d.t), y: y(Math.min(d.p50, 500)) }));
    const p95 = data.map((d) => ({ x: x(d.t), y: y(Math.min(d.p95, 500)) }));
    const p99 = data.map((d) => ({ x: x(d.t), y: y(Math.min(d.p99, 500)) }));
    return { t0, t1, x, y, p50, p95, p99 };
  }, [width, height, data]);

  const hoverPoint = hover !== null && data.length > 0 ? data[hover] : null;

  return (
    <div className="w-full" ref={ref}>
      {geom && (
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="block"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const idx = Math.round(((mx - PAD.left) / (width - PAD.left - PAD.right)) * (data.length - 1));
            setHover(Math.max(0, Math.min(data.length - 1, idx)));
          }}
          onMouseLeave={() => setHover(null)}
        >
          {/* Grid + duration labels */}
          {Y_TICKS.map((v) => {
            const gy = geom.y(v);
            return (
              <g key={v}>
                <line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={gy}
                  y2={gy}
                  stroke={v === 0 ? "var(--ink)" : "var(--grid-line)"}
                  strokeWidth={v === 0 ? 2 : 1}
                />
                <text
                  x={width - PAD.right - 4}
                  y={gy - 3}
                  fontSize="9"
                  fill="var(--ink-soft)"
                  textAnchor="end"
                  className="mono uppercase tracking-[0.15em]"
                >
                  {formatDuration(v).toUpperCase()}
                </text>
              </g>
            );
          })}

          {/* x labels every 6h */}
          {timeTicks(geom.t0, geom.t1, 6 * 3600_000).map((t) => (              <text
                key={t}
                x={geom.x(t)}
                y={height - 6}
                fontSize="9"
                fill="var(--ink-soft)"
                textAnchor="middle"
                className="mono uppercase tracking-[0.15em]"
              >
              {String(new Date(t).getHours()).padStart(2, "0")}:00
            </text>
          ))}

          {/* 6% flat fill under p99 only — no gradient */}
          <path d={areaPath(geom.p99, geom.y(0))} fill="rgba(255, 77, 77, 0.06)" />

          {/* p50 ok 2px, p95 warn 2px, p99 danger 3px */}
          <path d={stepPath(geom.p50)} fill="none" stroke="#3ddc84" strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" />
          <path d={stepPath(geom.p95)} fill="none" stroke="#ffb84d" strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" />
          <path d={stepPath(geom.p99)} fill="none" stroke="#ff4d4d" strokeWidth={3} strokeLinecap="square" strokeLinejoin="miter" />

          {/* Crosshair + tooltip */}
          {hoverPoint && (
            <g>
              <line
                x1={geom.x(hoverPoint.t)}
                x2={geom.x(hoverPoint.t)}
                y1={PAD.top}
                y2={geom.y(0)}
                stroke="var(--ink)"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <g transform={`translate(${Math.min(geom.x(hoverPoint.t) + 8, width - 190)}, ${PAD.top + 4})`}>
                <rect width={176} height={70} fill="var(--paper)" stroke="var(--ink)" strokeWidth={2} />
                <text x={10} y={17} fontSize="9" fill="var(--ink-soft)" className="mono uppercase tracking-[0.15em]">
                  {String(new Date(hoverPoint.t).getHours()).padStart(2, "0")}:
                  {String(new Date(hoverPoint.t).getMinutes()).padStart(2, "0")}:
                  {String(new Date(hoverPoint.t).getSeconds()).padStart(2, "0")}
                </text>
                <text x={10} y={33} fontSize="13" fill="#3ddc84" fontWeight={700} className="mono">
                  P50 {formatDuration(hoverPoint.p50)}
                </text>
                <text x={10} y={47} fontSize="13" fill="var(--warn)" fontWeight={700} className="mono">
                  P95 {formatDuration(hoverPoint.p95)}
                </text>
                <text x={10} y={61} fontSize="13" fill="#ff4d4d" fontWeight={700} className="mono">
                  P99 {formatDuration(hoverPoint.p99)}
                </text>
              </g>
            </g>
          )}
        </svg>
      )}
    </div>
  );
};
