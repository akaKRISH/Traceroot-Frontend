import React, { useState } from "react";
import { ServiceEdge, ServiceNode } from "../../types";
import { healthColor } from "../../lib/svg";

interface ServiceGraphProps {
  nodes: ServiceNode[];
  edges: ServiceEdge[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  height?: number;
}

const NODE = 40;
const SHORT: Record<string, string> = {
  lb: "lb",
  api: "checkout",
  identity: "identity",
  cart: "cart",
  payment: "payment",
  inventory: "inventory",
  worker: "worker",
};

export const ServiceGraph: React.FC<ServiceGraphProps> = ({
  nodes,
  edges,
  selectedId,
  onSelect,
  height = 520,
}) => {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [hoverEdge, setHoverEdge] = useState<number | null>(null);

  const byId = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div className="w-full grid-bg">
      <svg
        viewBox={`0 0 1000 ${height}`}
        style={{ width: "100%", height }}
        className="block"
        onMouseLeave={() => {
          setHoverId(null);
          setHoverEdge(null);
        }}
      >
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--ink)" />
          </marker>
          <marker id="arrow-danger" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#ff4d4d" />
          </marker>
        </defs>

        {/* Edges — §7 marching ants, CSS only. Healthy: 6 4 marching 0→-20.
            Error: red dashes marching 0→+20 (reverse). Down: static 2 6 muted. */}
        {edges.map((e, i) => {
          const a = byId.get(e.from);
          const b = byId.get(e.to);
          if (!a || !b) return null;
          const x1 = a.x * 1000;
          const y1 = a.y * height;
          const x2 = b.x * 1000;
          const y2 = b.y * height;
          const hasErrors = e.errors > 0;
          const isDown = a.health === "down" || b.health === "down";
          const hovered = hoverEdge === i;
          const stroke = isDown ? "#8a8a80" : hasErrors ? "#ff4d4d" : "var(--ink)";
          const sw = hovered ? 4 : hasErrors ? 3 : 2;
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;
          // Ant speed scales with traffic: 1s baseline, faster for busy edges.
          const antDur = Math.max(1000 * 50 / Math.max(e.calls, 1), 300);

          return (
            <g key={`${e.from}->${e.to}`}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={stroke}
                strokeWidth={sw}
                markerEnd={isDown ? "url(#arrow)" : hasErrors ? "url(#arrow-danger)" : "url(#arrow)"}
                strokeOpacity={hoverId && hoverId !== e.from && hoverId !== e.to ? 0.25 : 1}
                strokeDasharray={isDown ? "2 6" : "6 4"}
                className={isDown ? undefined : hasErrors ? "ant-anim-rev" : "ant-anim"}
                style={
                  isDown
                    ? { cursor: "default" }
                    : { cursor: "default", animationDuration: `${Math.round(antDur)}ms` }
                }
                onMouseEnter={() => setHoverEdge(i)}
              />
              {hasErrors && (
                <rect
                  width={6}
                  height={6}
                  fill="#ff4d4d"
                  stroke="var(--ink)"
                  strokeWidth={1}
                  style={{
                    offsetPath: `path('M ${x1} ${y1} L ${x2} ${y2}')`,
                    animation: "edge-travel 1.8s linear infinite",
                  }}
                />
              )}
              {hovered && (
                <g>
                  <rect x={midX - 62} y={midY - 22} width={124} height={16} fill="var(--paper)" stroke="var(--ink)" strokeWidth={2} />
                  <text x={midX} y={midY - 10} fontSize="9" fill="var(--ink)" textAnchor="middle" className="mono uppercase tracking-[0.05em]">
                    {e.calls}/s · {e.errors} ERR · P95 {e.p95}MS
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((n) => {
          const cx = n.x * 1000;
          const cy = n.y * height;
          const fill = healthColor(n.health);
          const hovered = hoverId === n.id;
          const selected = n.id === selectedId;
          return (
            <g
              key={n.id}
              onMouseEnter={() => setHoverId(n.id)}
              onMouseLeave={() => setHoverId(null)}
              onClick={() => onSelect?.(n.id)}
              style={{ cursor: onSelect ? "pointer" : "default" }}
            >
              {/* brut shadow = ink rect offset 4px behind, drawn first */}
              {hovered && <rect x={cx - NODE / 2 + 4} y={cy - NODE / 2 + 4} width={NODE} height={NODE} fill="var(--ink)" />}
              <rect
                x={cx - NODE / 2}
                y={cy - NODE / 2}
                width={NODE}
                height={NODE}
                fill={fill}
                stroke="var(--ink)"
                strokeWidth={selected ? 3 : 2}
              />
              <text x={cx} y={cy + NODE / 2 + 14} fontSize="9" fill="var(--ink-soft)" textAnchor="middle" className="mono uppercase tracking-[0.15em]">
                {SHORT[n.id] ?? n.name}
              </text>
              {selected && (
                <rect x={cx - NODE / 2 - 4} y={cy - NODE / 2 - 4} width={NODE + 8} height={NODE + 8} fill="none" stroke="var(--ink)" strokeWidth={2} />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
