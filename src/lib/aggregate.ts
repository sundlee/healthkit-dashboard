import { daysInMonth } from "./date";
import { METRICS, type DailyRecord, type MetricKey } from "./types";

export interface Bucket {
  key: string; // "2024", "2024-05"
  /** sum for additive metrics; mean for heart rate. null when no data. */
  total: number | null;
  /** mean per recorded day. null when no data. */
  avg: number | null;
  max: number | null;
  days: number; // days with a value
}

function summarize(key: string, values: number[], m: MetricKey): Bucket {
  if (!values.length) return { key, total: null, avg: null, max: null, days: 0 };
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;
  return {
    key,
    total: METRICS[m].agg === "sum" ? sum : avg,
    avg,
    max: Math.max(...values),
    days: values.length,
  };
}

function groupBy(records: DailyRecord[], m: MetricKey, keyFn: (date: string) => string) {
  const map = new Map<string, number[]>();
  for (const r of records) {
    const v = r[m];
    if (v === undefined) continue;
    const k = keyFn(r.date);
    const arr = map.get(k);
    if (arr) arr.push(v);
    else map.set(k, [v]);
  }
  return map;
}

export function years(records: DailyRecord[]): number[] {
  const set = new Set(records.map((r) => Number(r.date.slice(0, 4))));
  return [...set].sort((a, b) => a - b);
}

export function byYear(records: DailyRecord[], m: MetricKey): Bucket[] {
  const map = groupBy(records, m, (d) => d.slice(0, 4));
  return years(records).map((y) => summarize(String(y), map.get(String(y)) ?? [], m));
}

/** Always 12 buckets for the given year (empty months have null values). */
export function byMonth(records: DailyRecord[], m: MetricKey, year: number): Bucket[] {
  const map = groupBy(
    records.filter((r) => r.date.startsWith(`${year}-`)),
    m,
    (d) => d.slice(0, 7),
  );
  return Array.from({ length: 12 }, (_, i) => {
    const k = `${year}-${String(i + 1).padStart(2, "0")}`;
    return summarize(k, map.get(k) ?? [], m);
  });
}

/** Every calendar day of the month, with its record (or null). */
export function byDay(
  records: DailyRecord[],
  year: number,
  month: number,
): { date: string; record: DailyRecord | null }[] {
  const prefix = `${year}-${String(month).padStart(2, "0")}-`;
  const lookup = new Map(records.filter((r) => r.date.startsWith(prefix)).map((r) => [r.date, r]));
  return Array.from({ length: daysInMonth(year, month) }, (_, i) => {
    const date = prefix + String(i + 1).padStart(2, "0");
    return { date, record: lookup.get(date) ?? null };
  });
}

/** Records whose date starts with prefix ("" = all, "2024", "2024-05"). */
export function inRange(records: DailyRecord[], prefix: string): DailyRecord[] {
  return prefix ? records.filter((r) => r.date.startsWith(prefix)) : records;
}
