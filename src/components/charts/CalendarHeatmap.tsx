"use client";

import { useMemo, useState } from "react";
import { addDays, formatKoDate, weekdayMon0 } from "@/lib/date";
import { fmtMetric, fmtNum } from "@/lib/format";
import { METRICS, type DailyRecord, type MetricKey } from "@/lib/types";

const CELL = 12;
const GAP = 2;
const STEP = CELL + GAP;
const LEFT = 22;
const TOP = 16;
const LEVELS = ["var(--heat-1)", "var(--heat-2)", "var(--heat-3)", "var(--heat-4)"];

function quantile(sorted: number[], q: number) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}

export default function CalendarHeatmap({
  records,
  year,
  metric,
  goal,
  onPick,
}: {
  records: DailyRecord[];
  year: number;
  metric: MetricKey;
  goal: number;
  onPick: (date: string) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);

  const { cells, thresholds, months, weeks, empty } = useMemo(() => {
    const map = new Map(records.filter((r) => r.date.startsWith(`${year}-`)).map((r) => [r.date, r[metric]]));
    const values = [...map.values()].filter((v): v is number => v !== undefined).sort((a, b) => a - b);
    const thresholds =
      metric === "steps"
        ? [goal * 0.5, goal, goal * 1.5]
        : [quantile(values, 0.25), quantile(values, 0.5), quantile(values, 0.75)];

    const jan1 = `${year}-01-01`;
    const offset = weekdayMon0(jan1);
    const cells: { date: string; col: number; row: number; value: number | undefined }[] = [];
    const months: { label: string; col: number }[] = [];
    for (let d = jan1, i = 0; d.startsWith(`${year}-`); d = addDays(d, 1), i++) {
      const col = Math.floor((i + offset) / 7);
      if (d.endsWith("-01")) months.push({ label: `${Number(d.slice(5, 7))}월`, col });
      cells.push({ date: d, col, row: (i + offset) % 7, value: map.get(d) });
    }
    return { cells, thresholds, months, weeks: cells[cells.length - 1].col + 1, empty: values.length === 0 };
  }, [records, year, metric, goal]);

  const level = (v: number | undefined) => {
    if (v === undefined) return "var(--heat-0)";
    const i = thresholds.findIndex((t) => v < t);
    return LEVELS[i === -1 ? 3 : i];
  };

  const hovered = hover ? cells.find((c) => c.date === hover) : null;
  const digits = METRICS[metric].digits;
  const legend = [
    `< ${fmtNum(thresholds[0], digits)}`,
    `${fmtNum(thresholds[0], digits)}–${fmtNum(thresholds[1], digits)}`,
    `${fmtNum(thresholds[1], digits)}–${fmtNum(thresholds[2], digits)}`,
    `≥ ${fmtNum(thresholds[2], digits)}`,
  ];
  const width = LEFT + weeks * STEP;
  const height = TOP + 7 * STEP;

  return (
    <div>
      <div className="mb-2 h-5 text-sm text-ink-2" aria-live="polite">
        {hovered ? (
          <>
            <span className="text-ink">{formatKoDate(hovered.date)}</span> ·{" "}
            <span className="tabular font-medium text-ink">
              {hovered.value === undefined ? "기록 없음" : fmtMetric(hovered.value, metric)}
            </span>
          </>
        ) : (
          "칸에 마우스를 올리면 값이, 클릭하면 그날 상세가 보여요."
        )}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${year}년 ${METRICS[metric].label} 달력 히트맵`}
        onMouseLeave={() => setHover(null)}
      >
        {months.map((m) => (
          <text key={m.label} x={LEFT + m.col * STEP} y={10} fontSize={10} fill="var(--text-muted)">
            {m.label}
          </text>
        ))}
        {["월", "수", "금"].map((d, i) => (
          <text key={d} x={0} y={TOP + (i * 2) * STEP + CELL - 2} fontSize={9} fill="var(--text-muted)">
            {d}
          </text>
        ))}
        {cells.map((c) => (
          <rect
            key={c.date}
            x={LEFT + c.col * STEP}
            y={TOP + c.row * STEP}
            width={CELL}
            height={CELL}
            rx={2.5}
            fill={level(c.value)}
            stroke={hover === c.date ? "var(--text-primary)" : "none"}
            strokeWidth={1.5}
            onMouseEnter={() => setHover(c.date)}
            onClick={() => c.value !== undefined && onPick(c.date)}
            style={{ cursor: c.value !== undefined ? "pointer" : "default" }}
          />
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-2">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--heat-0)" }} />
          기록 없음
        </span>
        {empty && <span className="text-ink-3">{year}년에는 {METRICS[metric].label} 기록이 없어요.</span>}
        {!empty && legend.map((l, i) => (
          <span key={i} className="inline-flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: LEVELS[i] }} />
            {l}
          </span>
        ))}
        {empty ? null : metric === "steps" ? (
          <span className="text-ink-3">(목표 {fmtNum(goal)}걸음 기준)</span>
        ) : (
          <span className="text-ink-3">(그해 사분위 기준, {METRICS[metric].unit})</span>
        )}
      </div>
    </div>
  );
}
