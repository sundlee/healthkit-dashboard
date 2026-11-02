"use client";

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { WEEKDAYS_KO } from "@/lib/date";
import { fmtCompact, fmtMetric, fmtNum } from "@/lib/format";
import type { MetricKey } from "@/lib/types";
import { AXIS, CURSOR_FILL, GRID, TipBox } from "./common";

export default function WeekdayChart({ values, metric }: { values: (number | null)[]; metric: MetricKey }) {
  const data = values.map((v, i) => ({ label: WEEKDAYS_KO[i], value: v }));
  const isHR = metric === "hr";
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="25%">
          <CartesianGrid {...GRID} />
          <XAxis dataKey="label" {...AXIS} />
          <YAxis
            {...AXIS}
            axisLine={false}
            width={48}
            domain={isHR ? ["dataMin - 5", "dataMax + 3"] : [0, "auto"]}
            tickFormatter={(v: number) => (metric === "steps" ? fmtCompact(v) : fmtNum(v, 0))}
          />
          <Tooltip
            cursor={CURSOR_FILL}
            content={({ active, payload }) => {
              const p = active && payload?.[0] ? (payload[0].payload as { label: string; value: number | null }) : null;
              if (!p) return null;
              return (
                <TipBox
                  title={`${p.label}요일`}
                  rows={[{ label: "평균", value: fmtMetric(p.value, metric), swatch: "var(--series-1)" }]}
                />
              );
            }}
          />
          {isHR ? (
            // mean bpm on a non-zero axis: points, not bars (a truncated bar would exaggerate)
            <Line
              dataKey="value"
              stroke="var(--series-1)"
              strokeWidth={2}
              dot={{ r: 5, fill: "var(--series-1)", stroke: "var(--surface)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          ) : (
            <Bar dataKey="value" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
