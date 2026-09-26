import React, { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

const sizeClass = {
  // 13px — inline data values
  sm: "text-[13px] leading-[1.2]",
  // 22px — inline KPIs (the scale's number bucket)
  md: "text-[22px] leading-[1.15] font-bold",
  // 56px — hero stat numbers only
  lg: "text-[56px] leading-none font-bold tracking-[-0.04em]",
} as const;

interface OdometerProps {
  /** Formatted value. Digits roll; ".", ",", "%", units render as static glyphs. */
  value: string | number;
  size?: keyof typeof sizeClass;
  className?: string;
}

// Right-aligned diff: numeric strings grow on the left, so compare from the end.
function diffMask(prev: string, next: string): boolean[] {
  const mask = new Array(next.length).fill(false);
  const offset = next.length - prev.length;
  for (let i = 0; i < next.length; i++) {
    const j = i - offset;
    mask[i] = j < 0 || j >= prev.length || prev[j] !== next[i];
  }
  return mask;
}

const CLEAR_MS = 400; // > odometer duration; masks clear after the roll settles

/**
 * Numeric odometer (Layer 3 §2). Each digit sits in its own 1ch
 * overflow-hidden column; a changed digit rolls the 0–9 stack over
 * var(--t-odometer) (220ms, halved under prefers-reduced-motion).
 * Digits that did not change never animate.
 */
export const Odometer: React.FC<OdometerProps> = ({ value, size = "md", className }) => {
  const text = String(value);
  const prevRef = useRef(text);
  const [mask, setMask] = useState<boolean[]>(() => new Array(text.length).fill(false));

  useEffect(() => {
    if (prevRef.current === text) return;
    const next = diffMask(prevRef.current, text);
    prevRef.current = text;
    setMask(next);
    const t = setTimeout(() => setMask(new Array(text.length).fill(false)), CLEAR_MS);
    return () => clearTimeout(t);
  }, [text]);

  return (
    <span
      className={cn("mono tabular-nums inline-flex items-baseline", sizeClass[size], className)}
      aria-label={text}
    >
      {text.split("").map((ch, i) =>
        DIGITS.includes(ch) ? (
          <span
            key={i}
            className="inline-block overflow-hidden"
            style={{ width: "1ch", height: "1.15em" }}
          >
            <span
              className={cn("block will-change-transform", mask[i] && "transition-transform ease-out")}
              style={{
                transform: `translateY(-${Number(ch) * (100 / 10)}%)`,
                transitionDuration: mask[i] ? "var(--t-odometer)" : undefined,
              }}
            >
              {DIGITS.map((d) => (
                <span key={d} className="block" style={{ height: "1.15em" }}>
                  {d}
                </span>
              ))}
            </span>
          </span>
        ) : (
          <span key={i} className="inline-block" style={{ width: ch === "." ? "0.5ch" : undefined }}>
            {ch}
          </span>
        )
      )}
    </span>
  );
};
