import React, { useEffect, useMemo, useRef, useState } from "react";
import { Trace } from "../../types";
import { SpanRow } from "../trace/SpanRow";

interface TraceWaterfallProps {
  trace: Trace;
  selectedSpanId?: string;
  onSelectSpan?: (id: string) => void;
}

const LOOP_MS = 4000; // §6: full left→right traverse = 4s, linear
const LABEL_COL = 320; // SpanRow's label column width — bars start after it

// The playhead clock: linear, continuous. Hover pauses it; a horizontal
// drag scrubs it. Off under prefers-reduced-motion (scrub still works).
export const TraceWaterfall: React.FC<TraceWaterfallProps> = ({
  trace,
  selectedSpanId,
  onSelectSpan,
}) => {
  const { rows, maxDepth } = useMemo(() => {
    const rows: { id: string; depth: number }[] = [];
    const walk = (id: string, depth: number) => {
      const span = trace.spans[id];
      if (!span) return;
      rows.push({ id, depth });
      for (const child of span.children) walk(child, depth + 1);
    };
    walk(trace.rootSpanId, 0);
    // Sort siblings by startMs to get chronological order within the tree.
    rows.sort((a, b) => trace.spans[a.id].startMs - trace.spans[b.id].startMs);
    const maxDepth = rows.reduce((m, r) => Math.max(m, r.depth), 0);
    return { rows, maxDepth };
  }, [trace]);

  const [playheadMs, setPlayheadMs] = useState(0);
  const [paused, setPaused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const barAreaRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    playheadRef.current = playheadMs;
  }, [playheadMs]);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      let v = playheadRef.current + (dt / LOOP_MS) * trace.durationMs;
      if (v >= trace.durationMs) v -= trace.durationMs;
      playheadRef.current = v;
      setPlayheadMs(v);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [paused, trace.durationMs]);

  const scrubTo = (clientX: number) => {
    const el = barAreaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setPlayheadMs(frac * trace.durationMs);
  };

  const frac = trace.durationMs > 0 ? playheadMs / trace.durationMs : 0;

  return (
    <div
      className="relative border-2 border-ink bg-paper divide-y divide-ink select-none"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => {
        setPaused(false);
        setDragging(false);
      }}
      onPointerDown={(e) => {
        setDragging(true);
        scrubTo(e.clientX);
      }}
      onPointerMove={(e) => {
        if (dragging) scrubTo(e.clientX);
      }}
      onPointerUp={() => setDragging(false)}
    >
      {rows.map(({ id, depth }) => {
        const span = trace.spans[id];
        const active =
          playheadMs >= span.startMs && playheadMs <= span.startMs + span.durationMs;
        return (
          <SpanRow
            key={id}
            span={span}
            depth={depth}
            selected={id === selectedSpanId}
            active={active}
            onSelect={onSelectSpan}
            maxDurationMs={trace.durationMs}
            containerWidth={Math.max(600 - maxDepth * 16, 320)}
          />
        );
      })}
      <div style={{ height: 500, pointerEvents: 'none' }} />

      {/* Playhead: 2px ink line spanning the bar area + hard time label */}
      <div ref={barAreaRef} className="absolute top-0 bottom-0 right-0 pointer-events-none" style={{ left: LABEL_COL }}>
        <div className="absolute top-0 bottom-0 w-[2px] bg-ink" style={{ left: `${frac * 100}%` }}>
          <span className="absolute top-0 left-0 -translate-x-1/2 bg-ink text-paper mono text-[9px] leading-none px-1 py-[3px] tabular-nums whitespace-nowrap">
            {Math.round(playheadMs)}ms
          </span>
        </div>
      </div>
    </div>
  );
};
