// Hand-drawn SVG path helpers. Straight L segments only — markets are jagged.
import React from "react";

export interface Pt {
  x: number;
  y: number;
}

// Container width via ResizeObserver — no library.
export function useMeasure<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const ref = React.useRef<T>(null);
  const [width, setWidth] = React.useState(0);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

// Tick timestamps every stepMs, aligned from t0.
export function timeTicks(t0: number, t1: number, stepMs: number): number[] {
  const ticks: number[] = [];
  for (let t = t0; t <= t1; t += stepMs) ticks.push(t);
  return ticks;
}

export function linePath(points: Pt[]): string {
  if (points.length === 0) return "";
  return (
    points
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
      .join(" ")
  );
}

// Step function: horizontal run to the next x, then a vertical step.
export function stepPath(points: Pt[]): string {
  if (points.length === 0) return "";
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L${points[i].x},${points[i - 1].y} L${points[i].x},${points[i].y}`;
  }
  return d;
}

// Closed path down to a baseline for area fills.
export function areaPath(points: Pt[], baselineY: number): string {
  if (points.length === 0) return "";
  const d = stepPath(points);
  const last = points[points.length - 1];
  return `${d} L${last.x},${baselineY} L${points[0].x},${baselineY} Z`;
}

export function scaleLinear(domain: [number, number], range: [number, number]): (v: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  if (d1 === d0) return () => r0;
  const k = (r1 - r0) / (d1 - d0);
  return (v: number) => r0 + (v - d0) * k;
}

export function niceTicks(min: number, max: number, count: number): number[] {
  if (max <= min) return [min];
  const span = max - min;
  const rawStep = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  const step = (norm >= 7.5 ? 10 : norm >= 3.5 ? 5 : norm >= 1.5 ? 2 : 1) * mag;
  const ticks: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) {
    ticks.push(v);
  }
  return ticks;
}

// Deterministic service → fill color. Danger is reserved for error spans
// only, so it is never in this palette — one red rect per flame graph.
const SERVICE_PALETTE = ["#8b5cf6", "#4d7cff", "#3ddc84", "#ffb84d", "#8a8a80"];

export function serviceColor(service: string): string {
  let h = 0;
  for (let i = 0; i < service.length; i++) {
    h = (h * 31 + service.charCodeAt(i)) | 0;
  }
  return SERVICE_PALETTE[Math.abs(h) % SERVICE_PALETTE.length];
}

export function healthColor(health: "healthy" | "degraded" | "down"): string {
  return health === "healthy" ? "#3ddc84" : health === "degraded" ? "#ffb84d" : "#ff4d4d";
}
