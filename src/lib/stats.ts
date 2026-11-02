import { addDays, weekdayMon0 } from "./date";
import type { DailyRecord, MetricKey } from "./types";

export function bestDay(records: DailyRecord[], m: MetricKey) {
  let best: { date: string; value: number } | null = null;
  for (const r of records) {
    const v = r[m];
    if (v !== undefined && (!best || v > best.value)) best = { date: r.date, value: v };
  }
  return best;
}

export function goalRate(records: DailyRecord[], goal: number) {
  const withSteps = records.filter((r) => r.steps !== undefined);
  if (!withSteps.length) return null;
  const hit = withSteps.filter((r) => (r.steps as number) >= goal).length;
  return { hit, days: withSteps.length, rate: hit / withSteps.length };
}

export interface Streak {
  length: number;
  start: string | null;
  end: string | null;
}

const EMPTY: Streak = { length: 0, start: null, end: null };

/** Consecutive calendar days with steps >= goal. Missing days break a streak. */
export function streaks(records: DailyRecord[], goal: number): { longest: Streak; current: Streak } {
  let longest: Streak = EMPTY;
  let run: Streak = EMPTY;
  let prev: string | null = null;
  for (const r of records) {
    const ok = r.steps !== undefined && r.steps >= goal;
    const contiguous = prev !== null && addDays(prev, 1) === r.date;
    if (ok) {
      run =
        contiguous && run.length > 0
          ? { length: run.length + 1, start: run.start, end: r.date }
          : { length: 1, start: r.date, end: r.date };
      if (run.length > longest.length) longest = run;
    } else {
      run = EMPTY;
    }
    prev = r.date;
  }
  // the current streak only counts if it reaches the last recorded day
  const last = records[records.length - 1];
  const current = last && run.end === last.date ? run : EMPTY;
  return { longest, current };
}

/** Trailing moving average over the last `window` slots (nulls skipped). */
export function movingAverage(values: (number | null)[], window: number): (number | null)[] {
  return values.map((_, i) => {
    const slice = values
      .slice(Math.max(0, i - window + 1), i + 1)
      .filter((v): v is number => v !== null);
    return slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : null;
  });
}

/** Trailing calendar-window average for a sorted daily series (gaps respected). */
export function rollingByDate(records: DailyRecord[], m: MetricKey, window: number) {
  const out: { date: string; value: number }[] = [];
  const q: { date: string; v: number }[] = [];
  let head = 0;
  let sum = 0;
  for (const r of records) {
    const v = r[m];
    if (v === undefined) continue;
    q.push({ date: r.date, v });
    sum += v;
    const cutoff = addDays(r.date, -window + 1);
    while (q[head].date < cutoff) sum -= q[head++].v;
    out.push({ date: r.date, value: sum / (q.length - head) });
  }
  return out;
}

export function weekdayAverages(records: DailyRecord[], m: MetricKey): (number | null)[] {
  const sums = Array(7).fill(0);
  const counts = Array(7).fill(0);
  for (const r of records) {
    const v = r[m];
    if (v === undefined) continue;
    const w = weekdayMon0(r.date);
    sums[w] += v;
    counts[w]++;
  }
  return sums.map((s, i) => (counts[i] ? s / counts[i] : null));
}

export function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  const mx = xs.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const my = ys.slice(0, n).reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  return dx && dy ? num / Math.sqrt(dx * dy) : null;
}

/** Fractional change, or null when not comparable. */
export function pctChange(cur: number | null, prev: number | null): number | null {
  if (cur === null || prev === null || prev === 0) return null;
  return (cur - prev) / prev;
}
