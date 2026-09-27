import React from "react";
import { cn } from "../../lib/cn";

interface PanelProps {
  title?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  shadow?: "brut" | "brut-lg" | "none";
  bodyClassName?: string;
  /** Hero charts only: L-corner marks slide in from the edges on hover (§8). */
  brackets?: boolean;
}

// Corner placements — wrapper flips mirror the same L path into all corners,
// so the svg's own translate stays "outward" in every flipped frame.
const CORNERS = ["top-0 left-0", "top-0 right-0 scale-x-[-1]", "bottom-0 left-0 scale-y-[-1]", "bottom-0 right-0 scale-[-1]"];

export const Panel: React.FC<PanelProps> = ({
  title,
  right,
  children,
  className,
  shadow = "brut",
  bodyClassName,
  brackets = false,
}) => {
  const shadowClass =
    shadow === "brut-lg" ? "shadow-brut-lg" : shadow === "brut" ? "shadow-brut" : "";
  return (
    <section
      className={cn("border-2 border-ink bg-panel", shadowClass, brackets && "group relative", className)}
    >
      {brackets && (
        <>
          {CORNERS.map((pos, i) => (
            <div key={i} className={cn("absolute w-5 h-5 pointer-events-none", pos)} aria-hidden="true">
              <svg
                width={20}
                height={20}
                viewBox="0 0 20 20"
                className="block opacity-0 -translate-x-1 -translate-y-1 transition-[opacity,transform] duration-[180ms] ease-out group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0"
              >
                <path d="M 1 17 L 1 1 L 17 1" fill="none" stroke="var(--ink)" strokeWidth={1} />
              </svg>
            </div>
          ))}
        </>
      )}
      {title !== undefined && (
        <header className="border-b-2 border-ink px-4 py-2.5 flex items-center justify-between gap-3">
          <span className="label">{title}</span>
          {right}
        </header>
      )}
      <div className={cn(bodyClassName)}>{children}</div>
    </section>
  );
};
