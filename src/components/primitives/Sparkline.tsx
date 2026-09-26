import React from "react";
import { linePath, scaleLinear } from "../../lib/svg";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  highlightLast?: boolean;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 60,
  height = 20,
  color = "#0a0a0a",
  highlightLast = false,
}) => {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const x = scaleLinear([0, data.length - 1], [1, width - 1]);
  const y = scaleLinear([min, max], [height - 2, 2]);
  const points = data.map((v, i) => ({ x: x(i), y: y(v) }));
  const last = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      <path
        d={linePath(points)}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      {highlightLast && (
        <rect x={last.x - 1.5} y={last.y - 1.5} width={3} height={3} fill="#0a0a0a" />
      )}
    </svg>
  );
};
