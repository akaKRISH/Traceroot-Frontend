import React from "react";

interface AttributeTableProps {
  attributes: Record<string, string | number | boolean>;
}

export const AttributeTable: React.FC<AttributeTableProps> = ({ attributes }) => {
  const entries = Object.entries(attributes);
  if (entries.length === 0) {
    return <div className="label p-3">NO ATTRIBUTES</div>;
  }

  return (
    <div className="border-2 border-ink bg-paper">
      {entries.map(([key, value], i) => (
        <div
          key={key}
          className={`flex items-baseline gap-3 px-3 py-1.5 ${i < entries.length - 1 ? "border-b border-grid" : ""}`}
        >
          <span className="mono text-[9px] text-muted shrink-0 tracking-[0.05em]">{key}</span>
          <span className="mono t-body text-ink break-all">{String(value)}</span>
        </div>
      ))}
    </div>
  );
};
