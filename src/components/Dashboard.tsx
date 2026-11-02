"use client";

import { useMemo, useState } from "react";
import { byDay, byMonth, byYear, inRange, years as yearsOf, type Bucket } from "@/lib/aggregate";
import { daysInMonth, formatKoDate } from "@/lib/date";
import { fmtMetric, fmtNum, fmtPct } from "@/lib/format";
import { bestDay, goalRate, pctChange, rollingByDate, streaks, weekdayAverages } from "@/lib/stats";
import { METRICS, type Dataset, type MetricKey } from "@/lib/types";
import BucketChart, { type BucketRow } from "./charts/BucketChart";
import CalendarHeatmap from "./charts/CalendarHeatmap";
import DailyChart, { type DayRow } from "./charts/DailyChart";
import HeartSection from "./charts/HeartSection";
import TrendChart from "./charts/TrendChart";
import WeekdayChart from "./charts/WeekdayChart";
import DayDetail from "./DayDetail";
import { Card, Delta, Empty, Segmented, Select, StatTile } from "./ui";
import UploadDropzone from "./UploadDropzone";

type View = "year" | "month" | "day";
const GOAL_KEY = "healthkit-goal";

function readGoal(): number {
  try {
    const v = Number(localStorage.getItem(GOAL_KEY));
    return v > 0 ? v : 10000;
  } catch {
    return 10000;
  }
}

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

export default function Dashboard({
  data,
  onLoaded,
  onClear,
}: {
  data: Dataset;
  onLoaded: (d: Dataset) => void;
  onClear: () => void;
}) {
  const { records } = data;
  const allYears = useMemo(() => yearsOf(records), [records]);
  const lastYear = Number(data.lastDate.slice(0, 4));
  const lastMonth = Number(data.lastDate.slice(5, 7));

  const [view, setView] = useState<View>("year");
  const [metric, setMetric] = useState<MetricKey>("steps");
  const [mode, setMode] = useState<"total" | "avg">("avg");
  const [year, setYear] = useState(lastYear);
  const [month, setMonth] = useState(lastMonth);
  const [selected, setSelected] = useState<string | null>(data.lastDate);
  const [goal, setGoalState] = useState(readGoal);

  const setGoal = (g: number) => {
    setGoalState(g);
    try {
      localStorage.setItem(GOAL_KEY, String(g));
    } catch {
      /* ignore */
    }
  };

  const hasHR = useMemo(() => records.some((r) => r.hr !== undefined), [records]);
  const meta = METRICS[metric];
  const effMode = meta.agg === "mean" ? "avg" : mode;
  const ym = `${year}-${String(month).padStart(2, "0")}`;

  // Scope for KPIs and weekday pattern follows the active tab.
  const scopePrefix = view === "year" ? "" : view === "month" ? String(year) : ym;
  const prevPrefix =
    view === "year" ? null : view === "month" ? String(year - 1) : month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
  const scopeLabel = view === "year" ? "전체 기간" : view === "month" ? `${year}년` : `${year}년 ${month}월`;
  const scoped = useMemo(() => inRange(records, scopePrefix), [records, scopePrefix]);
  const prevScoped = useMemo(() => (prevPrefix ? inRange(records, prevPrefix) : []), [records, prevPrefix]);

  // ---- KPIs ---------------------------------------------------------------
  const kpi = useMemo(() => {
    const sum = (k: MetricKey, rs = scoped) => rs.reduce((a, r) => a + (r[k] ?? 0), 0);
    const count = (k: MetricKey, rs = scoped) => rs.filter((r) => r[k] !== undefined).length;
    const avg = (k: MetricKey, rs = scoped) => (count(k, rs) ? sum(k, rs) / count(k, rs) : null);
    return {
      totalSteps: sum("steps"),
      totalKm: sum("distance"),
      avgSteps: avg("steps"),
      prevAvgSteps: prevScoped.length ? avg("steps", prevScoped) : null,
      avgHR: avg("hr"),
      prevAvgHR: prevScoped.length ? avg("hr", prevScoped) : null,
      best: bestDay(scoped, "steps"),
      goal: goalRate(scoped, goal),
      streak: streaks(scoped, goal).longest,
      current: streaks(records, goal).current,
      days: scoped.length,
    };
  }, [scoped, prevScoped, records, goal]);

  // ---- Period chart rows --------------------------------------------------
  const yearRows: BucketRow[] = useMemo(
    () =>
      byYear(records, metric).map((b) => {
        const y = Number(b.key);
        const expected = isLeap(y) ? 366 : 365;
        return toRow(b, `${y}`, effMode, expected, meta.agg === "sum");
      }),
    [records, metric, effMode, meta.agg],
  );

  const monthRows: BucketRow[] = useMemo(() => {
    const cur = byMonth(records, metric, year);
    const prev = byMonth(records, metric, year - 1);
    return cur.map((b, i) => ({
      ...toRow(b, `${i + 1}월`, effMode, daysInMonth(year, i + 1), meta.agg === "sum"),
      compare: pick(prev[i], effMode),
    }));
  }, [records, metric, year, effMode, meta.agg]);

  const rolling7 = useMemo(() => new Map(rollingByDate(records, metric, 7).map((p) => [p.date, p.value])), [records, metric]);
  const dayCells = useMemo(() => byDay(records, year, month), [records, year, month]);
  const dayRows: DayRow[] = useMemo(
    () =>
      dayCells.map(({ date, record }) => ({
        date,
        label: String(Number(date.slice(8))),
        value: record?.[metric] ?? null,
        ma7: rolling7.get(date) ?? null,
      })),
    [dayCells, metric, rolling7],
  );

  const trend = useMemo(() => rollingByDate(records, metric, 30), [records, metric]);
  const weekday = useMemo(() => weekdayAverages(scoped, metric), [scoped, metric]);

  const sortedSteps = useMemo(
    () => records.map((r) => r.steps).filter((v): v is number => v !== undefined).sort((a, b) => b - a),
    [records],
  );
  const selectedRecord = selected ? records.find((r) => r.date === selected) ?? null : null;
  const rank =
    selectedRecord?.steps !== undefined
      ? { pos: sortedSteps.findIndex((v) => v <= (selectedRecord.steps as number)) + 1, of: sortedSteps.length }
      : null;
  const monthAvgSteps = (() => {
    const v = dayCells.map((d) => d.record?.steps).filter((x): x is number => x !== undefined);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  })();

  const monthsWithData = useMemo(() => {
    const set = new Set(records.filter((r) => r.date.startsWith(`${year}-`)).map((r) => Number(r.date.slice(5, 7))));
    return Array.from({ length: 12 }, (_, i) => i + 1).filter((m) => set.has(m));
  }, [records, year]);

  const goToDate = (date: string) => {
    setYear(Number(date.slice(0, 4)));
    setMonth(Number(date.slice(5, 7)));
    setSelected(date);
    setView("day");
  };

  const changeYear = (y: number) => {
    setYear(y);
    const ms = new Set(records.filter((r) => r.date.startsWith(`${y}-`)).map((r) => Number(r.date.slice(5, 7))));
    if (!ms.has(month)) setMonth(Math.max(...ms));
  };

  const shiftMonth = (delta: number) => {
    let y = year;
    let m = month + delta;
    if (m < 1) [y, m] = [y - 1, 12];
    if (m > 12) [y, m] = [y + 1, 1];
    const key = `${y}-${String(m).padStart(2, "0")}`;
    if (key < data.firstDate.slice(0, 7) || key > data.lastDate.slice(0, 7)) return;
    setYear(y);
    setMonth(m);
  };

  const metricOptions = [
    { value: "steps" as const, label: "걸음" },
    { value: "distance" as const, label: "거리" },
    { value: "hr" as const, label: "심박", disabled: !hasHR },
  ];

  const periodTitle =
    view === "year" ? `연도별 ${meta.label}` : view === "month" ? `${year}년 월별 ${meta.label}` : `${year}년 ${month}월 일별 ${meta.label}`;

  const activeRows = view === "year" ? yearRows : monthRows;
  const noData =
    view === "day" ? dayRows.every((r) => r.value === null) : activeRows.every((r) => r.value === null);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">헬스 대시보드</h1>
          <p className="mt-1 text-sm text-ink-2">
            {formatKoDate(data.firstDate)} ~ {formatKoDate(data.lastDate)} · {fmtNum(records.length)}일 기록
            {data.exportDate && <> · 내보낸 날 {data.exportDate.slice(0, 10)}</>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-ink-2">
            일 목표
            <input
              type="number"
              min={1000}
              step={500}
              value={goal}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > 0) setGoal(v);
              }}
              className="tabular w-24 rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink"
            />
            걸음
          </label>
          <UploadDropzone onLoaded={onLoaded} compact />
          <button
            type="button"
            onClick={() => {
              if (confirm("이 기기에 저장된 건강 데이터를 삭제할까요?")) onClear();
            }}
            className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink-2 hover:bg-wash"
          >
            데이터 삭제
          </button>
        </div>
      </header>

      {/* Filters — one row above the charts */}
      <div className="sticky top-0 z-10 -mx-4 mb-4 flex flex-wrap items-center gap-2 border-b border-line bg-page/90 px-4 py-3 backdrop-blur">
        <Segmented<View>
          label="기간 단위"
          value={view}
          onChange={setView}
          options={[
            { value: "year", label: "연도별" },
            { value: "month", label: "월별" },
            { value: "day", label: "일별" },
          ]}
        />
        {view !== "year" && (
          <Select
            label="연도"
            value={year}
            onChange={changeYear}
            options={allYears.map((y) => ({ value: y, label: `${y}년` }))}
          />
        )}
        {view === "day" && (
          <div className="inline-flex items-center gap-1">
            <button type="button" aria-label="이전 달" onClick={() => shiftMonth(-1)} className="rounded-md px-2 py-1.5 text-ink-2 hover:bg-wash">
              ‹
            </button>
            <Select
              label="월"
              value={month}
              onChange={setMonth}
              options={monthsWithData.map((m) => ({ value: m, label: `${m}월` }))}
            />
            <button type="button" aria-label="다음 달" onClick={() => shiftMonth(1)} className="rounded-md px-2 py-1.5 text-ink-2 hover:bg-wash">
              ›
            </button>
          </div>
        )}
        <span className="mx-1 hidden h-6 w-px bg-line sm:inline-block" />
        <Segmented<MetricKey> label="지표" value={metric} onChange={setMetric} options={metricOptions} />
        {view !== "day" && meta.agg === "sum" && (
          <Segmented<"total" | "avg">
            label="집계 방식"
            value={mode}
            onChange={setMode}
            options={[
              { value: "avg", label: "일평균" },
              { value: "total", label: "합계" },
            ]}
          />
        )}
      </div>

      {/* KPIs */}
      <div className="mb-1 text-xs text-ink-3">{scopeLabel} 요약</div>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="kpis">
        <StatTile label="총 걸음" value={fmtNum(kpi.totalSteps)} unit="걸음" hint={`${fmtNum(kpi.days)}일 기록`} />
        <StatTile label="총 거리" value={fmtNum(kpi.totalKm, 1)} unit="km" hint={kpi.totalKm > 400 ? `지구 ${(kpi.totalKm / 40075).toFixed(2)}바퀴` : undefined} />
        <StatTile
          label="일평균 걸음"
          value={fmtNum(kpi.avgSteps)}
          unit="걸음"
          hint={
            kpi.prevAvgSteps !== null ? (
              <>
                {view === "month" ? "전년" : "전월"} 대비 <Delta value={pctChange(kpi.avgSteps, kpi.prevAvgSteps)} />
              </>
            ) : undefined
          }
        />
        <StatTile
          label="걷기 평균 심박"
          value={fmtNum(kpi.avgHR)}
          unit="bpm"
          hint={
            kpi.avgHR === null ? (
              "이 기간 기록 없음"
            ) : kpi.prevAvgHR !== null ? (
              <>
                {view === "month" ? "전년" : "전월"} 대비 <Delta value={pctChange(kpi.avgHR, kpi.prevAvgHR)} neutral />
              </>
            ) : undefined
          }
        />
        <StatTile
          label="최고 기록일"
          value={fmtNum(kpi.best?.value)}
          unit="걸음"
          hint={
            kpi.best ? (
              <button type="button" className="underline decoration-dotted hover:text-ink" onClick={() => goToDate(kpi.best!.date)}>
                {formatKoDate(kpi.best.date)}
              </button>
            ) : undefined
          }
        />
        <StatTile
          label={`목표 달성률 (${fmtNum(goal)}걸음)`}
          value={kpi.goal ? fmtPct(kpi.goal.rate) : "–"}
          hint={kpi.goal ? `${fmtNum(kpi.goal.hit)} / ${fmtNum(kpi.goal.days)}일` : undefined}
        />
        <StatTile
          label="최장 연속 달성"
          value={fmtNum(kpi.streak.length)}
          unit="일"
          hint={kpi.streak.start ? `${kpi.streak.start} ~ ${kpi.streak.end}` : undefined}
        />
        <StatTile
          label="현재 연속 달성"
          value={fmtNum(kpi.current.length)}
          unit="일"
          hint={kpi.current.length ? `${kpi.current.start}부터` : "마지막 기록일 기준"}
        />
      </div>

      {/* Period chart */}
      <Card
        className="mb-6"
        title={periodTitle}
        subtitle={
          view === "year"
            ? `클릭하면 해당 연도의 월별로 이동 · ${effMode === "avg" ? "기록된 날 기준 일평균" : "연간 합계"}${meta.agg === "sum" ? " · * 일부 기간만 기록" : ""}`
            : view === "month"
              ? `클릭하면 해당 월의 일별로 이동 · 주황 선은 ${year - 1}년 같은 달`
              : "날짜를 클릭하면 오른쪽에 상세 정보"
        }
      >
        {noData ? (
          <Empty>이 기간에는 {meta.label} 기록이 없어요.</Empty>
        ) : view === "day" ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
            <DailyChart rows={dayRows} metric={metric} goal={goal} selected={selected} onPick={setSelected} />
            <DayDetail
              record={selectedRecord && selectedRecord.date.startsWith(ym) ? selectedRecord : null}
              monthAvgSteps={monthAvgSteps}
              goal={goal}
              rank={rank}
            />
          </div>
        ) : (
          <BucketChart
            rows={activeRows}
            metric={metric}
            mode={effMode}
            seriesLabel={view === "month" ? `${year}년` : meta.label}
            compareLabel={view === "month" ? `${year - 1}년` : undefined}
            goal={goal}
            onPick={(key) => {
              if (view === "year") {
                changeYear(Number(key));
                setView("month");
              } else {
                setMonth(Number(key.slice(5, 7)));
                setView("day");
              }
            }}
          />
        )}
        {!noData && (
          <DataTable view={view} metric={metric} rows={activeRows} dayRows={dayRows} />
        )}
      </Card>

      {/* Heatmap */}
      <Card
        className="mb-6"
        title={`${year}년 활동 히트맵`}
        subtitle={`${meta.label} · 날짜를 클릭하면 일별 보기로 이동`}
        actions={
          <Select label="히트맵 연도" value={year} onChange={changeYear} options={allYears.map((y) => ({ value: y, label: `${y}년` }))} />
        }
      >
        <CalendarHeatmap records={records} year={year} metric={metric} goal={goal} onPick={goToDate} />
      </Card>

      {/* Trend + weekday */}
      <div className="mb-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card title={`장기 추세 · ${meta.label}`} subtitle="30일 이동평균 · 아래 슬라이더로 기간 확대">
          <TrendChart data={trend} metric={metric} />
        </Card>
        <Card title="요일별 패턴" subtitle={`${scopeLabel} · 요일별 평균 ${meta.label}`}>
          {weekday.every((v) => v === null) ? <Empty>기록 없음</Empty> : <WeekdayChart values={weekday} metric={metric} />}
        </Card>
      </div>

      {/* Heart vs activity */}
      {hasHR && (
        <Card className="mb-6" title="심박 · 활동 상관 분석" subtitle="걷기 평균 심박수가 기록된 날만 사용">
          <HeartSection records={records} />
        </Card>
      )}

      <footer className="py-6 text-center text-xs text-ink-3">
        {data.fileName ?? "HealthExport"} · 데이터는 이 브라우저에만 저장됩니다.
      </footer>
    </main>
  );
}

function pick(b: Bucket, mode: "total" | "avg") {
  return mode === "total" ? b.total : b.avg;
}

function toRow(b: Bucket, label: string, mode: "total" | "avg", expectedDays: number, markPartial: boolean): BucketRow {
  return {
    key: b.key,
    label: markPartial && b.days > 0 && b.days < expectedDays * 0.9 ? `${label}*` : label,
    value: pick(b, mode),
    total: b.total,
    avg: b.avg,
    days: b.days,
    expectedDays,
  };
}

function DataTable({
  view,
  metric,
  rows,
  dayRows,
}: {
  view: View;
  metric: MetricKey;
  rows: BucketRow[];
  dayRows: DayRow[];
}) {
  const isMean = METRICS[metric].agg === "mean";
  return (
    <details className="mt-4 text-sm">
      <summary className="cursor-pointer text-ink-2 hover:text-ink">표로 보기</summary>
      <div className="mt-2 max-h-80 overflow-auto rounded-lg border border-line">
        <table className="tabular w-full text-right">
          <thead className="sticky top-0 bg-surface text-xs text-ink-2">
            {view === "day" ? (
              <tr>
                <th className="px-3 py-2 text-left font-medium">날짜</th>
                <th className="px-3 py-2 font-medium">값</th>
                <th className="px-3 py-2 font-medium">7일 평균</th>
              </tr>
            ) : (
              <tr>
                <th className="px-3 py-2 text-left font-medium">기간</th>
                {!isMean && <th className="px-3 py-2 font-medium">합계</th>}
                <th className="px-3 py-2 font-medium">일평균</th>
                {view === "month" && <th className="px-3 py-2 font-medium">전년 동월</th>}
                <th className="px-3 py-2 font-medium">기록일</th>
              </tr>
            )}
          </thead>
          <tbody className="text-ink">
            {view === "day"
              ? dayRows.map((r) => (
                  <tr key={r.date} className="border-t border-line">
                    <td className="px-3 py-1.5 text-left">{formatKoDate(r.date)}</td>
                    <td className="px-3 py-1.5">{fmtMetric(r.value, metric)}</td>
                    <td className="px-3 py-1.5 text-ink-2">{fmtMetric(r.ma7, metric)}</td>
                  </tr>
                ))
              : rows.map((r) => (
                  <tr key={r.key} className="border-t border-line">
                    <td className="px-3 py-1.5 text-left">{r.label}</td>
                    {!isMean && <td className="px-3 py-1.5">{fmtMetric(r.total, metric)}</td>}
                    <td className="px-3 py-1.5">{fmtMetric(r.avg, metric)}</td>
                    {view === "month" && <td className="px-3 py-1.5 text-ink-2">{fmtMetric(r.compare ?? null, metric)}</td>}
                    <td className="px-3 py-1.5 text-ink-2">
                      {r.days} / {r.expectedDays}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
