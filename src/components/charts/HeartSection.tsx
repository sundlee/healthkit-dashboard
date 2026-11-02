"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatKoDate } from "@/lib/date";
import { fmtCompact, fmtMetric, fmtNum } from "@/lib/format";
import { pearson } from "@/lib/stats";
import type { DailyRecord } from "@/lib/types";
import { AXIS, CURSOR_LINE, GRID, TipBox } from "./common";

function describe(r: number | null) {
  if (r === null) return "데이터가 부족합니다";
  const a = Math.abs(r);
  const strength = a < 0.1 ? "거의 관계 없음" : a < 0.3 ? "약한" : a < 0.5 ? "중간 정도의" : "강한";
  if (a < 0.1) return strength;
  return `${strength} ${r > 0 ? "양의" : "음의"} 상관 — 걸음이 많은 날일수록 걷기 심박이 ${r > 0 ? "높은" : "낮은"} 경향`;
}

export default function HeartSection({ records }: { records: DailyRecord[] }) {
  const { points, r, monthly, first } = useMemo(() => {
    const points = records
      .filter((d) => d.hr !== undefined && d.steps !== undefined)
      .map((d) => ({ date: d.date, steps: d.steps as number, hr: d.hr as number }));
    const r = pearson(points.map((p) => p.steps), points.map((p) => p.hr));
    const byMonth = new Map<string, number[]>();
    for (const d of records) {
      if (d.hr === undefined) continue;
      const k = d.date.slice(0, 7);
      (byMonth.get(k) ?? byMonth.set(k, []).get(k)!).push(d.hr);
    }
    const monthly = [...byMonth.entries()].map(([k, v]) => ({
      month: k,
      value: v.reduce((a, b) => a + b, 0) / v.length,
      days: v.length,
    }));
    return { points, r, monthly, first: records.find((d) => d.hr !== undefined)?.date };
  }, [records]);

  if (!points.length) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h3 className="text-sm font-medium text-ink">걸음 수 vs 걷기 평균 심박수</h3>
        <p className="mb-2 text-xs text-ink-2">
          상관계수 r = <span className="tabular font-medium text-ink">{r === null ? "–" : r.toFixed(2)}</span> · {describe(r)}
          {" "}({fmtNum(points.length)}일)
        </p>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID} vertical />
              <XAxis
                type="number"
                dataKey="steps"
                name="걸음"
                {...AXIS}
                tickFormatter={(v: number) => fmtCompact(v)}
                domain={[0, "auto"]}
              />
              <YAxis
                type="number"
                dataKey="hr"
                name="심박"
                {...AXIS}
                axisLine={false}
                width={40}
                domain={["dataMin - 3", "dataMax + 3"]}
              />
              <Tooltip
                cursor={CURSOR_LINE}
                content={({ active, payload }) => {
                  const p = active && payload?.[0] ? (payload[0].payload as (typeof points)[number]) : null;
                  if (!p) return null;
                  return (
                    <TipBox
                      title={formatKoDate(p.date)}
                      rows={[
                        { label: "걸음", value: fmtMetric(p.steps, "steps") },
                        { label: "걷기 심박", value: fmtMetric(p.hr, "hr") },
                      ]}
                    />
                  );
                }}
              />
              <Scatter data={points} fill="var(--series-1)" fillOpacity={0.55} shape="circle" isAnimationActive={false} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium text-ink">월평균 걷기 심박수 추이</h3>
        <p className="mb-2 text-xs text-ink-2">
          {first ? `${first.slice(0, 7).replace("-", ".")}부터 기록` : ""} · 같은 속도로 걸을 때 심박이 낮아지면 심폐 체력이
          좋아지고 있다는 신호일 수 있어요.
        </p>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis
                dataKey="month"
                {...AXIS}
                minTickGap={24}
                tickFormatter={(m: string) => m.replace("-", ".")}
              />
              <YAxis {...AXIS} axisLine={false} width={40} domain={["dataMin - 3", "dataMax + 3"]} tickFormatter={(v: number) => fmtNum(v)} />
              <Tooltip
                cursor={CURSOR_LINE}
                content={({ active, payload }) => {
                  const p = active && payload?.[0] ? (payload[0].payload as (typeof monthly)[number]) : null;
                  if (!p) return null;
                  const [y, m] = p.month.split("-");
                  return (
                    <TipBox
                      title={`${y}년 ${Number(m)}월`}
                      rows={[
                        { label: "평균", value: fmtMetric(p.value, "hr"), swatch: "var(--series-1)" },
                        { label: "기록일", value: `${p.days}일` },
                      ]}
                    />
                  );
                }}
              />
              <Line
                dataKey="value"
                stroke="var(--series-1)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--series-1)", stroke: "var(--surface)", strokeWidth: 1.5 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
