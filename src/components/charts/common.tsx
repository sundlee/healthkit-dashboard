"use client";

import type { ReactNode } from "react";

export const AXIS = {
  tick: { fill: "var(--text-muted)", fontSize: 12 },
  axisLine: { stroke: "var(--axis)" },
  tickLine: false,
} as const;

export const GRID = { stroke: "var(--grid)", vertical: false } as const;

export const CURSOR_FILL = { fill: "var(--wash)" } as const;
export const CURSOR_LINE = { stroke: "var(--axis)", strokeWidth: 1 } as const;

export interface TipRow {
  label: string;
  value: string;
  /** colour swatch identifying the series (text stays in ink) */
  swatch?: string;
}

export function TipBox({ title, rows, footer }: { title: ReactNode; rows: TipRow[]; footer?: ReactNode }) {
  return (
    <div className="min-w-40 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-medium text-ink">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-ink-2">
            {r.swatch && <span className="inline-block h-2 w-2 rounded-full" style={{ background: r.swatch }} />}
            {r.label}
          </span>
          <span className="tabular font-medium text-ink">{r.value}</span>
        </div>
      ))}
      {footer && <div className="mt-1 text-ink-3">{footer}</div>}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; kind?: "bar" | "line" | "dash" }[] }) {
  return (
    <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          {i.kind === "line" || i.kind === "dash" ? (
            <svg width="16" height="8" aria-hidden>
              <line
                x1="0"
                y1="4"
                x2="16"
                y2="4"
                stroke={i.color}
                strokeWidth="2"
                strokeDasharray={i.kind === "dash" ? "4 3" : undefined}
              />
            </svg>
          ) : (
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />
          )}
          {i.label}
        </span>
      ))}
    </div>
  );
}
