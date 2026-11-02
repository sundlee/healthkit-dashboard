"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtCompact, fmtMetric, fmtNum, fmtPct } from "@/lib/format";
import { pctChange } from "@/lib/stats";
import type { MetricKey } from "@/lib/types";
import { AXIS, CURSOR_FILL, GRID, Legend, TipBox } from "./common";

export interface BucketRow {
  key: string;
  label: string;
  value: number | null;
  compare?: number | null;
  /** extra tooltip context */
  total: number | null;
  avg: number | null;
  days: number;
  expectedDays: number;
}

/**
 * Bars for one period series, optional comparison line (same unit, same axis).
 * Heart rate is drawn as a line on a non-zero baseline because a mean bpm is not a
 * quantity you sum.
 */
export default function BucketChart({
  rows,
  metric,
  mode,
  seriesLabel,
  compareLabel,
  goal,
  onPick,
}: {
  rows: BucketRow[];
  metric: MetricKey;
  mode: "total" | "avg";
  seriesLabel: string;
  compareLabel?: string;
  goal?: number;
  onPick?: (key: string) => void;
}) {
  const isHR = metric === "hr";
  const hasCompare = rows.some((r) => r.compare != null);

  return (
    <div>
      {hasCompare && compareLabel && (
        <Legend
          items={[
            { label: seriesLabel, color: "var(--series-1)", kind: isHR ? "line" : "bar" },
            { label: compareLabel, color: "var(--series-2)", kind: "line" },
          ]}
        />
      )}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={rows}
            margin={{ top: 8, right: 44, left: 0, bottom: 0 }}
            barCategoryGap="20%"
            onClick={(state) => pick(state?.activeTooltipIndex)}
            style={onPick ? { cursor: "pointer" } : undefined}
          >
            <CartesianGrid {...GRID} />
            <XAxis dataKey="label" {...AXIS} interval="preserveStartEnd" />
            <YAxis
              {...AXIS}
              axisLine={false}
              width={48}
              tickFormatter={(v: number) => (metric === "steps" ? fmtCompact(v) : fmtNum(v, 0))}
              domain={isHR ? ["dataMin - 5", "dataMax + 5"] : [0, "auto"]}
              allowDecimals={false}
            />
            <Tooltip
              cursor={CURSOR_FILL}
              content={({ active, payload }) => {
                const r = active && payload?.[0] ? (payload[0].payload as BucketRow) : null;
                if (!r) return null;
                const partial = r.days > 0 && r.days < r.expectedDays;
                const ch = pctChange(r.value, r.compare ?? null);
                return (
                  <TipBox
                    title={r.label}
                    rows={[
                      ...(isHR
                        ? [{ label: "평균", value: fmtMetric(r.avg, metric), swatch: "var(--series-1)" }]
                        : [
                            { label: "합계", value: fmtMetric(r.total, metric), swatch: mode === "total" ? "var(--series-1)" : undefined },
                            { label: "일평균", value: fmtMetric(r.avg, metric), swatch: mode === "avg" ? "var(--series-1)" : undefined },
                          ]),
                      ...(r.compare != null && compareLabel
                        ? [{ label: compareLabel, value: fmtMetric(r.compare, metric), swatch: "var(--series-2)" }]
                        : []),
                      ...(ch !== null ? [{ label: "증감", value: fmtPct(ch, true) }] : []),
                      { label: "기록일", value: `${fmtNum(r.days)} / ${r.expectedDays}일` },
                    ]}
                    footer={partial ? "일부 기간만 기록됨" : onPick && r.days ? "클릭해서 자세히 보기" : undefined}
                  />
                );
              }}
            />
            {goal && mode === "avg" && metric === "steps" && (
              <ReferenceLine
                y={goal}
                stroke="var(--text-muted)"
                strokeDasharray="4 3"
                label={{ value: `목표 ${fmtCompact(goal)}`, position: "right", fill: "var(--text-muted)", fontSize: 11 }}
              />
            )}
            {isHR ? (
              <Line
                dataKey="value"
                name={seriesLabel}
                stroke="var(--series-1)"
                strokeWidth={2}
                dot={{ r: 4, fill: "var(--series-1)", stroke: "var(--surface)", strokeWidth: 2 }}
                activeDot={{ r: 6 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ) : (
              <Bar
                dataKey="value"
                name={seriesLabel}
                fill="var(--series-1)"
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
                isAnimationActive={false}
              />
            )}
            {hasCompare && (
              <Line
                dataKey="compare"
                name={compareLabel}
                stroke="var(--series-2)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--series-2)", stroke: "var(--surface)", strokeWidth: 1.5 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  function pick(index: unknown) {
    if (index === null || index === undefined) return;
    const row = rows[Number(index)];
    if (onPick && row && row.days > 0) onPick(row.key);
  }
}
