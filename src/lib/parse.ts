import { toDateKey } from "./date";
import type { Dataset, DailyRecord, MetricKey } from "./types";

interface RawPoint {
  timestamp?: string;
  start_date?: string;
  value?: number;
  unit?: string;
}
interface RawMetric {
  id?: string;
  unit?: string;
  data_points?: RawPoint[];
}
interface RawExport {
  export_date?: string;
  metrics?: RawMetric[];
}

const ID_MAP: Record<string, MetricKey> = {
  HKQuantityTypeIdentifierStepCount: "steps",
  HKQuantityTypeIdentifierDistanceWalkingRunning: "distance",
  HKQuantityTypeIdentifierWalkingHeartRateAverage: "hr",
};

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/**
 * Distance arrives labelled "km" but some exporters write metres.
 * A daily median above 100 km is not human walking — treat it as metres.
 */
/** Divisor that converts raw distance values to km. */
export function distanceFactor(values: number[], unit?: string): number {
  if (unit === "m") return 1000;
  return median(values) > 100 ? 1000 : 1;
}

export class ParseError extends Error {}

export function parseExport(raw: unknown, fileName?: string): Dataset {
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as RawExport).metrics)) {
    throw new ParseError("HealthKit 내보내기 JSON 형식이 아닙니다 (metrics 배열 없음).");
  }
  const data = raw as RawExport;
  const byDate = new Map<string, DailyRecord>();
  const hrCount = new Map<string, number>();

  for (const metric of data.metrics ?? []) {
    const key = metric.id ? ID_MAP[metric.id] : undefined;
    if (!key || !Array.isArray(metric.data_points)) continue;
    const points = metric.data_points.filter(
      (p) => typeof p.value === "number" && Number.isFinite(p.value) && (p.timestamp || p.start_date),
    );
    const factor =
      key === "distance"
        ? distanceFactor(points.map((p) => p.value as number), points[0]?.unit || metric.unit)
        : 1;

    for (const p of points) {
      const date = toDateKey((p.timestamp || p.start_date) as string);
      const rec = byDate.get(date) ?? { date };
      let v = (p.value as number) / factor;
      if (key === "steps") v = Math.round(v);
      if (key === "hr") {
        // heart rate is a mean — average multiple samples for the same day
        const n = hrCount.get(date) ?? 0;
        rec.hr = ((rec.hr ?? 0) * n + v) / (n + 1);
        hrCount.set(date, n + 1);
      } else {
        rec[key] = (rec[key] ?? 0) + v;
      }
      byDate.set(date, rec);
    }
  }

  const records = [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  if (!records.length) {
    throw new ParseError("걸음 수 · 거리 · 심박 데이터를 찾지 못했습니다.");
  }
  return {
    records,
    exportDate: data.export_date,
    firstDate: records[0].date,
    lastDate: records[records.length - 1].date,
    fileName,
    importedAt: new Date().toISOString(),
  };
}
