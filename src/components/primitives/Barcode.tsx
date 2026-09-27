import React, { useMemo } from "react";
import { cn } from "../../lib/cn";

interface BarcodeProps {
  id: string;
  className?: string;
}

const BARS = 20;
const W = 80;
const H = 20;

/**
 * Trace ID barcode (Layer 3 §10). Bar widths (1–3px) and gaps (1–3px) are
 * deterministically derived from the ID's char codes, so the same ID always
 * renders the same artifact. Pure serialization vocabulary — carries meaning,
 * not data.
 */
export const Barcode: React.FC<BarcodeProps> = ({ id, className }) => {
  const bars = useMemo(() => {
    const raw: { x: number; w: number }[] = [];
    let x = 0;
    for (let i = 0; i < BARS; i++) {
      const c = id.charCodeAt(i % Math.max(id.length, 1)) || 48;
      const w = ((c * (i + 7)) % 3) + 1; // 1..3
      const g = ((c * (i + 13)) % 3) + 1; // 1..3
      raw.push({ x, w });
      x += w + g;
    }
    const scale = (W - 2) / x; // fit 80px with 1px inset
    return raw.map((b) => ({ x: 1 + b.x * scale, w: b.w * scale }));
  }, [id]);

  return (
    <div className={cn("inline-flex flex-col items-start gap-1", className)}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" className="block">
        {bars.map((b, i) => (
          <rect key={i} x={b.x} y={0} width={b.w} height={H} fill="var(--ink)" />
        ))}
      </svg>
      <span className="mono label break-all">{id}</span>
    </div>
  );
};
