import React from "react";
import { cn } from "../../lib/cn";

const REPEAT = 16; // per half; must exceed the widest content column

interface SectionDividerProps {
  name: string;
  className?: string;
}

/**
 * Section divider (Layer 3 §12). A 20px strip between major sections:
 * ink/4% ground, 2px ink rules top and bottom, and the section name
 * running in a 30s linear marquee. Pauses on hover. The doubled half
 * makes the -50% translate loop seamless.
 */
export const SectionDivider: React.FC<SectionDividerProps> = ({ name, className }) => {
  const half = (
    <div className="flex shrink-0 items-center">
      {Array.from({ length: REPEAT }, (_, i) => (
        <span key={i} className="label shrink-0">
          <span className="px-3">{name}</span>
          <span className="text-ink/30">·</span>
        </span>
      ))}
    </div>
  );

  return (
    <div
      aria-hidden="true"
      className={cn(
        "marquee-pause relative flex h-[20px] shrink-0 select-none items-center overflow-hidden border-y-2 border-ink bg-ink/[0.04]",
        className
      )}
    >
      <div className="animate-marquee flex w-max">
        {half}
        {half}
      </div>
    </div>
  );
};
