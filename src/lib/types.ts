export type MetricKey = "steps" | "distance" | "hr";

export interface DailyRecord {
  /** Local (Asia/Seoul) calendar date, YYYY-MM-DD */
  date: string;
  steps?: number;
  /** kilometres */
  distance?: number;
  /** walking heart-rate average, bpm */
  hr?: number;
}

export interface Dataset {
  records: DailyRecord[]; // sorted ascending by date, one per day
  exportDate?: string;
  firstDate: string;
  lastDate: string;
  fileName?: string;
  importedAt: string;
}

export interface MetricMeta {
  key: MetricKey;
  label: string;
  unit: string;
  /** sum = additive per day (steps, distance); mean = average only (heart rate) */
  agg: "sum" | "mean";
  digits: number;
}

export const METRICS: Record<MetricKey, MetricMeta> = {
  steps: { key: "steps", label: "걸음 수", unit: "걸음", agg: "sum", digits: 0 },
  distance: { key: "distance", label: "걷기+달리기 거리", unit: "km", agg: "sum", digits: 1 },
  hr: { key: "hr", label: "걷기 평균 심박수", unit: "bpm", agg: "mean", digits: 0 },
};
