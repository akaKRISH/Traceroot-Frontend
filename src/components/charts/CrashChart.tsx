import React, { useEffect, useMemo, useState } from "react";
import { MetricPoint } from "../../types";
import { formatErrorRate, formatTime } from "../../lib/format";
import { areaPath, scaleLinear, stepPath, useMeasure, timeTicks } from "../../lib/svg";

export interface CrashAnnotation {
  t: number; // epoch ms — must fall inside the chart's time domain
  id: string;
  title: string;
}

interface CrashChartProps {
  data: MetricPoint[];
  height?: number;
  markerT?: number;
  onSelectT?: (t: number) => void;
  compact?: boolean;
  showVolume?: boolean;
  /** §9: incident flags in the lane above the plot. */
  annotations?: CrashAnnotation[];
  /** §4: the 6s sweep line. Dashboard polls live; compact charts are static. */
  sweep?: boolean;
  /**
   * Now-anchored time window (ms). When set, the x-axis ends at the present and
   * the series simply stops at its last sample — the live chart needs room for
   * incidents newer than the newest metric point. Omit it and the domain follows
   * the data, which is what the incident view's ±30min zoom wants.
   */
  windowMs?: number;
}

const PAD = { top: 14, right: 46, bottom: 8, left: 8 };
const Y_TICKS = [0, 0.1, 0.25, 0.5];
const SWEEP_MS = 6000;
const FLAG_LANE = 24;
const FLAG_STACK = 26;
/** Flags whose x lands in the same 6px column aggregate into one flag. */
const FLAG_BUCKET_PX = 6;

/** The live dashboard's chart window: one day ending at the present. */
export const CHART_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Right edge of a now-anchored axis, quantised to the minute: the axis must not
 * jitter on every animation frame (one minute ≈ 0.7px across 24h), and callers
 * fetch exactly the incidents this domain can show.
 */
export function chartDomainEnd(now: number = Date.now()): number {
  return Math.floor(now / 60_000) * 60_000;
}

// Short axis label for a timestamp depending on chart span.
function tickLabel(t: number, spanMs: number): string {
  const d = new Date(t);
  const p = (v: number) => String(v).padStart(2, "0");
  if (spanMs > 4 * 3600_000) return `${p(d.getHours())}:00`;
  return `${p(d.getMinutes())}m`;
}

// The sweep clock: rAF loop, pos = performance.now() % 6000 / 6000. Linear —
// it is a clock, not a transition (§15). Off under prefers-reduced-motion.
function useSweepPosition(enabled: boolean): number {
  const [pos, setPos] = useState(() => (performance.now() % SWEEP_MS) / SWEEP_MS);
  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const loop = () => {
      setPos((performance.now() % SWEEP_MS) / SWEEP_MS);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);
  return pos;
}

export const CrashChart: React.FC<CrashChartProps> = ({
  data,
  height = 280,
  markerT,
  onSelectT,
  compact = false,
  showVolume = true,
  annotations,
  sweep = false,
  windowMs,
}) => {
  const [ref, width] = useMeasure<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const sweepPos = useSweepPosition(sweep);

  // Recomputed every render, but stable within a minute: the memo below keys on
  // the two scalars, so the 60fps sweep never re-projects the series.
  const axis = windowMs === undefined ? null : { end: chartDomainEnd(), start: chartDomainEnd() - windowMs };
  const axisStart = axis?.start;
  const axisEnd = axis?.end;

  const geom = useMemo(() => {
    if (width <= 0 || data.length === 0) return null;
    // Opt-in now-anchored domain: everything (series, flags, marker, grid) is
    // positioned by it, so a stale series simply stops short of the right edge.
    const t0 = axisStart ?? data[0].t;
    const t1 = axisEnd ?? data[data.length - 1].t;
    const innerW = width - PAD.left - PAD.right;
    const innerH = height - PAD.top - PAD.bottom;
    const x = scaleLinear([t0, t1], [PAD.left, PAD.left + innerW]);
    const y = scaleLinear([0, 0.5], [PAD.top + innerH, PAD.top]);
    const pts = data.map((d) => ({ x: x(d.t), y: y(Math.min(d.errorRate, 0.5)) }));
    return { t0, t1, x, y, pts, innerW, innerH, spanMs: t1 - t0 };
  }, [width, height, data, axisStart, axisEnd]);

  const marker = useMemo(() => {
    // Number.isFinite: no crashed incident → Date.parse("") = NaN must not
    // sneak through. The time is clamped to the plot area, so a crash newer
    // than the last sample pins to the right edge instead of disappearing; the
    // label keeps the real crash time.
    if (!geom || markerT === undefined || !Number.isFinite(markerT)) return null;
    const right = width - PAD.right;
    return { x: Math.min(Math.max(geom.x(markerT), PAD.left), right), t: markerT };
  }, [geom, markerT, width]);

  // §9: flags — domain-filtered, then aggregated by 6px column so a burst of
  // live crashes reads as one flag (newest id + "+N") instead of a 30-lane
  // stack. Deterministic x, stacked 26px when labels would overlap.
  const flags = useMemo(() => {
    if (!geom || !annotations || annotations.length === 0 || compact) return [];
    const inDomain = annotations
      .filter((a) => a.t >= geom.t0 && a.t <= geom.t1)
      .sort((a, b) => a.t - b.t);
    const columns = new Map<number, CrashAnnotation[]>();
    for (const a of inDomain) {
      const key = Math.floor(geom.x(a.t) / FLAG_BUCKET_PX) * FLAG_BUCKET_PX;
      const list = columns.get(key);
      if (list) list.push(a);
      else columns.set(key, [a]);
    }
    // Newest first inside a column: the flag is labelled by its newest crash.
    const out = [...columns.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([x, items]) => ({ x, items: [...items].reverse(), laneY: 0 }));
    let lastX = -Infinity;
    let lane = 0;
    for (const f of out) {
      lane = f.x - lastX < 40 ? lane + 1 : 0;
      f.laneY = lane * FLAG_STACK;
      lastX = f.x;
    }
    return out;
  }, [geom, annotations, compact]);

  const flagH = flags.length > 0 ? FLAG_LANE + Math.max(...flags.map((f) => f.laneY)) : 0;

  // §4: sweep x derived straight from the clock position.
  const sweepX = sweep && geom ? PAD.left + sweepPos * (width - PAD.left - PAD.right) : null;

  // §4: sweep passes a marker/flag → brighten for 400ms. The single most
  // instrumentation moment in the app.
  const [litId, setLitId] = useState<string | null>(null);
  useEffect(() => {
    if (sweepX === null) return;
    const hit = (x: number, key: string) => {
      if (Math.abs(sweepX - x) <= 4) {
        setLitId(key);
        return true;
      }
      return false;
    };
    if (marker && hit(marker.x, "marker")) return;
    for (const f of flags) {
      if (hit(f.x, `flag-${f.items[0].id}`)) return;
    }
  }, [sweepX, marker, flags]);
  useEffect(() => {
    if (!litId) return;
    const t = setTimeout(() => setLitId(null), 400);
    return () => clearTimeout(t);
  }, [litId]);

  const hoverPt = hover !== null && geom ? data[hover] : null;

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!geom) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < geom.pts.length; i++) {
      const d = Math.abs(geom.pts[i].x - mx);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    setHover(best);
  };

  const totalH = height + (showVolume && !compact ? 64 + 14 : 0) + flagH;
  const volumeTop = height + flagH + 22;

  return (
    <div className="w-full" ref={ref}>
      {geom && (
        <svg
          width={width}
          height={totalH}
          viewBox={`0 0 ${width} ${totalH}`}
          className="block"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
          onClick={onSelectT ? () => hover !== null && onSelectT(data[hover].t) : undefined}
          style={onSelectT ? { cursor: "crosshair" } : undefined}
        >
          {/* Hatch pattern for the crash area — 45° lines, NOT a gradient.
              Sweep mask: everything right of the sweep = future frontier. */}
          {!compact && (
            <defs>
              <pattern id="crashHatch" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                <rect width="7" height="7" fill="rgba(255, 77, 77, 0.10)" />
                <line x1="0" y1="0" x2="0" y2="7" stroke="rgba(255, 77, 77, 0.35)" strokeWidth="1.5" />
              </pattern>
              {sweep && (
                <mask id="sweepMask">
                  <rect x={0} y={0} width={width} height={totalH} fill="white" />
                  <rect
                    x={sweepX ?? width}
                    y={0}
                    width={Math.max(width - (sweepX ?? width), 0)}
                    height={totalH}
                    fill="black"
                    opacity={0.4}
                  />
                </mask>
              )}
            </defs>
          )}          {/* §9 annotation lane — above the plot area. One flag per 6px column;
              a column holding many crashes is labelled with the newest id and a
              "+N" count, and its hover panel lists the five newest. */}
          {flags.map((f) => {
            const lead = f.items[0];
            const extra = f.items.length - 1;
            const label = `#${lead.id.slice(0, 4)}${extra > 0 ? ` +${extra}` : ""}`;
            const boxW = Math.max(40, label.length * 6 + 8);
            const listed = f.items.slice(0, 5);
            const panelW = 148;
            const lit = litId === `flag-${lead.id}`;
            const boxX = Math.min(
              Math.max(f.x - boxW / 2, PAD.left),
              Math.max(PAD.left, width - PAD.right - boxW - 44)
            );
            return (
              <g key={lead.id} className="flag-group">
                {/* 1px danger line down to the chart; meets the x-axis */}
                <line x1={f.x} x2={f.x} y1={f.laneY + 13} y2={flagH} stroke="#ff4d4d" strokeWidth={1} />
                <g transform={`translate(${boxX}, ${f.laneY})`}>
                  <g className="transition-opacity duration-150 ease-out" style={{ opacity: lit ? 1 : 0.92 }}>
                    {/* SVG brut shadow: ink rect offset 2,2 behind the label */}
                    <rect x={2} y={2} width={boxW} height={13} fill="#0a0a0a" />
                    <rect x={0} y={0} width={boxW} height={13} fill="#f5f3ee" stroke="#0a0a0a" strokeWidth={1} />
                    <text x={boxW / 2} y={10} fontSize="9" fill="#0a0a0a" textAnchor="middle" className="mono font-bold">
                      {label}
                    </text>
                  </g>
                  {/* Hover expands the flag: timestamp + title, sans 12px→13px;
                      a multi-crash column grows a row per incident (max 5). */}
                  <g className="flag-title" transform={`translate(${boxW + 4}, 0)`}>
                    <rect x={0} y={0} width={panelW} height={13 + (listed.length - 1) * 11} fill="#f5f3ee" stroke="#0a0a0a" strokeWidth={1} />
                    {listed.map((a, i) => (
                      <g key={a.id}>
                        {listed.length > 1 && (
                          <text x={4} y={10 + i * 11} fontSize="9" fill="#0a0a0a" className="mono font-bold">
                            #{a.id.slice(0, 4)}
                          </text>
                        )}
                        <text x={48} y={10 + i * 11} fontSize="9" fill="rgba(10, 10, 10, 0.55)" className="mono">
                          {formatTime(a.t)}
                        </text>
                        <text x={94} y={10.5 + i * 11} fontSize="9" fill="#0a0a0a" className="font-semibold" style={{ fontFamily: "Inter Tight, sans-serif", letterSpacing: "-0.01em" }}>
                          {a.title.slice(0, 18)}
                        </text>
                      </g>
                    ))}
                  </g>
                </g>
              </g>
            );
          })}

          {/* Grid + y labels: 0 / 10 / 25 / 50 percent */}
          {Y_TICKS.map((v) => {
            const gy = geom.y(v) + flagH;
            return (
              <g key={v}>
                <line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={gy}
                  y2={gy}
                  stroke={v === 0 ? "#0a0a0a" : "#d9d6cf"}
                  strokeWidth={v === 0 ? 2 : 1}
                />
                {!compact && (
                  <text
                    x={width - PAD.right + 6}
                    y={gy + 3}
                    fontSize="9"
                    fill="rgba(10, 10, 10, 0.55)"
                    className="mono uppercase tracking-[0.15em]"
                  >
                    {Math.round(v * 100)}%
                  </text>
                )}
              </g>
            );
          })}

          {/* x labels every 3h (compact charts skip axis labels) */}
          {!compact &&
            timeTicks(geom.t0, geom.t1, 3 * 3600_000).map((t) => (
              <text
                key={t}
                x={geom.x(t)}
                y={height + flagH + 12}
                fontSize="9"
                fill="rgba(10, 10, 10, 0.55)"
                textAnchor="middle"
                className="mono uppercase tracking-[0.15em]"
              >
                {tickLabel(t, geom.spanMs)}
              </text>
            ))}

          {/* Crash area fill + step line. Primary series = 3px. */}
          {!compact && (
            <path d={areaPath(geom.pts.map((p) => ({ x: p.x, y: p.y + flagH })), geom.y(0) + flagH)} fill="url(#crashHatch)" stroke="none" />
          )}
          <g mask={sweep && !compact ? "url(#sweepMask)" : undefined}>
            <path
              d={stepPath(geom.pts.map((p) => ({ x: p.x, y: p.y + flagH })))}
              fill="none"
              stroke="#ff4d4d"
              strokeWidth={compact ? 2 : 3}
              strokeLinecap="square"
              strokeLinejoin="miter"
            />
          </g>

          {/* Marker: 2px danger vertical, ink label panel at top, 6px square at base */}
          {marker && (
            <g transform={`translate(0, ${flagH})`}>
              <line x1={marker.x} x2={marker.x} y1={PAD.top - 6} y2={geom.y(0)} stroke="#ff4d4d" strokeWidth={2} />
              {!compact && (
                <g transform={`translate(${Math.min(Math.max(marker.x - 44, PAD.left), width - PAD.right - 88)}, 0)`}>
                  <rect x={0} y={0} width={88} height={18} fill="#0a0a0a" stroke="#0a0a0a" strokeWidth={2} />
                  <text x={44} y={13} fontSize="9" fill="#f5f3ee" textAnchor="middle" className="mono font-bold tracking-[0.1em]">
                    CRASH · {formatTime(marker.t).slice(0, 5)}
                  </text>
                </g>
              )}
              <rect
                x={marker.x - 3}
                y={geom.y(0) - 6}
                width={6}
                height={6}
                fill={litId === "marker" ? "#ff4d4d" : "#0a0a0a"}
                stroke={litId === "marker" ? "#0a0a0a" : "none"}
                strokeWidth={1}
              />
            </g>
          )}

          {/* Hover crosshair: 1px dashed ink + hard-edged tooltip */}
          {hoverPt && geom && (
            <g transform={`translate(0, ${flagH})`}>
              <line
                x1={geom.pts[hover!].x}
                x2={geom.pts[hover!].x}
                y1={PAD.top}
                y2={geom.y(0)}
                stroke="#0a0a0a"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <g transform={`translate(${Math.min(geom.pts[hover!].x + 8, width - 168)}, ${PAD.top + 4})`}>
                <rect width={148} height={56} fill="#f5f3ee" stroke="#0a0a0a" strokeWidth={2} />
                <text x={10} y={18} fontSize="9" fill="rgba(10,10,10,0.55)" className="mono uppercase tracking-[0.15em]">
                  {formatTime(hoverPt.t)}
                </text>
                <text x={10} y={34} fontSize="13" fill="#0a0a0a" fontWeight={700} className="mono">
                  {formatErrorRate(hoverPt.errorRate * 100)}
                </text>
                <text x={10} y={48} fontSize="9" fill="rgba(10,10,10,0.55)" className="mono uppercase tracking-[0.15em]">
                  {Math.round(hoverPt.throughput)}/S
                </text>
              </g>
            </g>
          )}

          {/* §4 sweep line: 1px danger vertical + 4×4 axis tick. Linear clock. */}
          {sweepX !== null && geom && (
            <g>
              <line x1={sweepX} x2={sweepX} y1={flagH + PAD.top} y2={flagH + geom.y(0)} stroke="#ff4d4d" strokeWidth={1} />
              <rect x={sweepX - 2} y={flagH + geom.y(0) + 2} width={4} height={4} fill="#ff4d4d" />
            </g>
          )}

          {/* §5 OHLC candlestick volume strip: wick = p99→p50, body = p50→p95,
              fill ok/danger/warn by error rate, 4px body + 2px gap, ink border. */}
          {showVolume && !compact && (
            <g transform={`translate(0, ${volumeTop})`}>
              <line x1={PAD.left} x2={width - PAD.right} y1={64} y2={64} stroke="#0a0a0a" strokeWidth={1} />
              {data.map((d, i) => {
                const cx = geom.pts[i].x;
                const yFor = (v: number) => 64 - 8 - (Math.min(v, 1200) / 1200) * (64 - 12);
                const wickTop = yFor(d.p99);
                const wickBottom = yFor(d.p50);
                const bodyTop = yFor(d.p95);
                const fill = d.errorRate === 0 ? "#3ddc84" : d.errorRate > 0.01 ? "#ff4d4d" : "#ffb84d";
                return (
                  <g key={d.t}>
                    <line x1={cx} x2={cx} y1={wickTop} y2={Math.max(wickBottom, wickTop + 1)} stroke="#0a0a0a" strokeWidth={1} />
                    <rect
                      x={cx - 2}
                      y={bodyTop}
                      width={4}
                      height={Math.max(wickBottom - bodyTop, 1)}
                      fill={fill}
                      stroke="#0a0a0a"
                      strokeWidth={1}
                    />
                  </g>
                );
              })}
            </g>
          )}
        </svg>
      )}
    </div>
  );
};
