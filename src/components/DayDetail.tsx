"use client";

import { formatKoDate } from "@/lib/date";
import { fmtMetric, fmtNum } from "@/lib/format";
import { pctChange } from "@/lib/stats";
import type { DailyRecord } from "@/lib/types";
import { Delta } from "./ui";

export default function DayDetail({
  record,
  monthAvgSteps,
  goal,
  rank,
}: {
  record: DailyRecord | null;
  monthAvgSteps: number | null;
  goal: number;
  /** rank of the day's steps across all days, 1 = best */
  rank: { pos: number; of: number } | null;
}) {
  if (!record) {
    return (
      <div className="flex h-full min-h-40 items-center justify-center rounded-xl border border-dashed border-line p-4 text-center text-sm text-ink-3">
        차트에서 날짜를 클릭하면 그날의 상세 정보를 볼 수 있어요.
      </div>
    );
  }
  const stride =
    record.steps && record.distance ? (record.distance * 1000) / record.steps : null;
  const vsMonth = pctChange(record.steps ?? null, monthAvgSteps);
  const goalMet = record.steps !== undefined && record.steps >= goal;

  const rows: [string, React.ReactNode][] = [
    ["걸음 수", fmtMetric(record.steps, "steps")],
    ["거리", fmtMetric(record.distance, "distance")],
    ["평균 보폭", stride ? `${fmtNum(stride, 2)} m` : "–"],
    ["걷기 평균 심박", fmtMetric(record.hr, "hr")],
    ["이번 달 평균 대비", vsMonth === null ? "–" : <Delta value={vsMonth} />],
    ["전체 걸음 순위", rank ? `${fmtNum(rank.pos)}위 (상위 ${((rank.pos / rank.of) * 100).toFixed(1)}%)` : "–"],
  ];

  return (
    <div className="rounded-xl border border-line p-4" data-testid="day-detail">
      <div className="text-sm font-semibold text-ink">{formatKoDate(record.date)}</div>
      <div className="mt-1 text-xs text-ink-2">
        {record.steps === undefined ? "걸음 기록 없음" : goalMet ? "✓ 목표 달성" : `목표까지 ${fmtNum(goal - record.steps)}걸음 부족`}
      </div>
      <dl className="mt-3 space-y-1.5 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <dt className="text-ink-2">{k}</dt>
            <dd className="tabular text-right font-medium text-ink">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
