"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { addDays, formatKoDate } from "@/lib/date";
import { fmtCompact, fmtMetric, fmtNum } from "@/lib/format";
import type { MetricKey } from "@/lib/types";
import { Segmented } from "../ui";
import { AXIS, CURSOR_LINE, GRID, TipBox } from "./common";

type Range = "all" | "5y" | "1y";
const RANGE_DAYS: Record<Range, number> = { all: Infinity, "5y": 365 * 5, "1y": 365 };

export default function TrendChart({ data, metric }: { data: { date: string; value: number }[]; metric: MetricKey }) {
  const isHR = metric === "hr";
  const [range, setRange] = useState<Range>("all");
  const shown = useMemo(() => {
    if (range === "all" || !data.length) return data;
    const from = addDays(data[data.length - 1].date, -RANGE_DAYS[range]);
    return data.filter((d) => d.date > from);
  }, [data, range]);
  return (
    <div>
      <div className="mb-2">
        <Segmented<Range>
          label="표시 기간"
          value={range}
          onChange={setRange}
          options={[
            { value: "all", label: "전체" },
            { value: "5y", label: "최근 5년" },
            { value: "1y", label: "최근 1년" },
          ]}
        />
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={shown} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
