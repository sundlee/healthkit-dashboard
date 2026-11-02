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
import { formatKoDate } from "@/lib/date";
import { fmtCompact, fmtMetric, fmtNum } from "@/lib/format";
import type { MetricKey } from "@/lib/types";
import { AXIS, CURSOR_FILL, GRID, Legend, TipBox } from "./common";

export interface DayRow {
  date: string;
  label: string;
  value: number | null;
  ma7: number | null;
}

export default function DailyChart({
  rows,
  metric,
  goal,
  selected,
  onPick,
}: {
  rows: DayRow[];
  metric: MetricKey;
  goal?: number;
  selected: string | null;
  onPick: (date: string) => void;
}) {
  const isHR = metric === "hr";
  const showGoal = metric === "steps" && goal;
  const hasSelection = selected !== null && rows.some((r) => r.date === selected);
  return (
    <div>
      <Legend
        items={[
          { label: "일별 값", color: "var(--series-1)", kind: isHR ? "line" : "bar" },
          { label: "7일 이동평균", color: "var(--series-2)", kind: "line" },
          ...(showGoal ? [{ label: `목표 ${fmtNum(goal)}`, color: "var(--text-muted)", kind: "dash" as const }] : []),
        ]}
      />
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={rows}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            barCategoryGap="15%"
            onClick={(s) => {
              const r = s?.activeTooltipIndex != null ? rows[Number(s.activeTooltipIndex)] : undefined;
              if (r && r.value !== null) onPick(r.date);
            }}
            style={{ cursor: "pointer" }}
          >
            <CartesianGrid {...GRID} />
            <XAxis dataKey="label" {...AXIS} interval="preserveStartEnd" minTickGap={8} />
            <YAxis
              {...AXIS}
              axisLine={false}
              width={48}
              tickFormatter={(v: number) => (metric === "steps" ? fmtCompact(v) : fmtNum(v, 0))}
              domain={isHR ? ["dataMin - 5", "dataMax + 5"] : [0, "auto"]}
            />
            <Tooltip
              cursor={CURSOR_FILL}
              content={({ active, payload }) => {
                const r = active && payload?.[0] ? (payload[0].payload as DayRow) : null;
                if (!r) return null;
                return (
                  <TipBox
                    title={formatKoDate(r.date)}
                    rows={[
                      { label: "값", value: fmtMetric(r.value, metric), swatch: "var(--series-1)" },
                      { label: "7일 평균", value: fmtMetric(r.ma7, metric), swatch: "var(--series-2)" },
                    ]}
                    footer={r.value === null ? "기록 없음" : "클릭해서 상세 보기"}
                  />
                );
              }}
            />
            {showGoal && <ReferenceLine y={goal} stroke="var(--text-muted)" strokeDasharray="4 3" />}
            {isHR ? (
              <Line
                dataKey="value"
                stroke="var(--series-1)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--series-1)", stroke: "var(--surface)", strokeWidth: 1.5 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ) : (
              <Bar
                dataKey="value"
                fill="var(--series-1)"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
                isAnimationActive={false}
                shape={(props: unknown) => {
                  const p = props as { x: number; y: number; width: number; height: number; payload: DayRow };
                  if (!p.height || p.height <= 0) return <g />;
                  const r = Math.min(4, p.width / 2, p.height);
                  const sel = p.payload.date === selected;
                  const { x, y, width: w, height: h } = p;
                  return (
                    <path
                      d={`M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`}
                      fill="var(--series-1)"
                      opacity={hasSelection && !sel ? 0.45 : 1}
                    />
                  );
                }}
              />
            )}
            <Line
              dataKey="ma7"
              stroke="var(--series-2)"
              strokeWidth={2}
              dot={false}
              activeDot={false}
              connectNulls
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
