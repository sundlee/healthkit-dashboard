"use client";

import { Area, AreaChart, Brush, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatKoDate } from "@/lib/date";
import { fmtCompact, fmtMetric, fmtNum } from "@/lib/format";
import type { MetricKey } from "@/lib/types";
import { AXIS, CURSOR_LINE, GRID, TipBox } from "./common";

export default function TrendChart({
  data,
  metric,
}: {
  data: { date: string; value: number }[];
  metric: MetricKey;
}) {
  const isHR = metric === "hr";
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid {...GRID} />
          <XAxis
            dataKey="date"
            {...AXIS}
            minTickGap={40}
            tickFormatter={(d: string) => d.slice(0, 7).replace("-", ".")}
          />
          <YAxis
            {...AXIS}
            axisLine={false}
            width={48}
            domain={isHR ? ["dataMin - 3", "dataMax + 3"] : [0, "auto"]}
            tickFormatter={(v: number) => (metric === "steps" ? fmtCompact(v) : fmtNum(v, 0))}
          />
          <Tooltip
            cursor={CURSOR_LINE}
            content={({ active, payload }) => {
              const p = active && payload?.[0] ? (payload[0].payload as { date: string; value: number }) : null;
              if (!p) return null;
              return (
                <TipBox
                  title={formatKoDate(p.date)}
                  rows={[{ label: "30일 평균", value: fmtMetric(p.value, metric), swatch: "var(--series-1)" }]}
                />
              );
            }}
          />
          <Area
            dataKey="value"
            stroke="var(--series-1)"
            strokeWidth={2}
            fill="url(#trendFill)"
            dot={false}
            activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
          <Brush
            dataKey="date"
            height={24}
            stroke="var(--axis)"
            fill="var(--surface)"
            travellerWidth={8}
            tickFormatter={(d: string) => d.slice(0, 7)}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
