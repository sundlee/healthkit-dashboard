import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { byDay, byMonth, byYear } from "./aggregate";
import { toDateKey } from "./date";
import { distanceFactor, parseExport, ParseError } from "./parse";
import { goalRate, movingAverage, pearson, rollingByDate, streaks, weekdayAverages } from "./stats";
import type { DailyRecord } from "./types";

const pt = (ts: string, value: number, unit = "") => ({ timestamp: ts, value, unit });
const metric = (id: string, points: ReturnType<typeof pt>[], unit?: string) => ({
  id: `HKQuantityTypeIdentifier${id}`,
  unit,
  data_points: points,
});

describe("parse", () => {
  it("maps 15:00Z to the next Seoul calendar day", () => {
    expect(toDateKey("2024-05-16T15:00:00Z")).toBe("2024-05-17");
  });

  it("detects metre-valued distance mislabeled as km", () => {
    expect(distanceFactor([6440, 7000, 5000], "km")).toBe(1000);
    expect(distanceFactor([6.4, 7.0, 5.0], "km")).toBe(1);
  });

  it("merges metrics per day, rounds steps, converts distance", () => {
    const ds = parseExport({
      export_date: "2026-10-15T06:26:10Z",
      metrics: [
        metric("StepCount", [pt("2024-05-16T15:00:00Z", 1000.6), pt("2024-05-17T15:00:00Z", 12000)]),
        metric("DistanceWalkingRunning", [pt("2024-05-16T15:00:00Z", 700, "km"), pt("2024-05-17T15:00:00Z", 8400, "km")], "km"),
        metric("WalkingHeartRateAverage", [pt("2024-05-17T15:00:00Z", 101, "bpm")], "bpm"),
      ],
    });
    expect(ds.records).toEqual([
      { date: "2024-05-17", steps: 1001, distance: 0.7 },
      { date: "2024-05-18", steps: 12000, distance: 8.4, hr: 101 },
    ]);
    expect(ds.firstDate).toBe("2024-05-17");
  });

  it("rejects non-export JSON", () => {
    expect(() => parseExport({ foo: 1 })).toThrow(ParseError);
  });
});

const recs: DailyRecord[] = [
  { date: "2024-12-30", steps: 12000 },
  { date: "2024-12-31", steps: 11000 },
  { date: "2025-01-01", steps: 4000, hr: 100 },
  { date: "2025-01-02", steps: 10000, hr: 110 },
  { date: "2025-01-03", steps: 10500 },
  // gap on 01-04
  { date: "2025-01-05", steps: 15000 },
];

describe("aggregate", () => {
  it("sums steps and averages heart rate per year", () => {
    const y = byYear(recs, "steps");
    expect(y.map((b) => [b.key, b.total, b.days])).toEqual([
      ["2024", 23000, 2],
      ["2025", 39500, 4],
    ]);
    const hr = byYear(recs, "hr");
    expect(hr[0].total).toBeNull();
    expect(hr[1].total).toBe(105);
  });

  it("returns 12 months and every day of the month", () => {
    const m = byMonth(recs, "steps", 2025);
    expect(m).toHaveLength(12);
    expect(m[0].total).toBe(39500);
    expect(m[1].total).toBeNull();
    const d = byDay(recs, 2025, 1);
    expect(d).toHaveLength(31);
    expect(d[3].record).toBeNull();
    expect(d[4].record?.steps).toBe(15000);
  });
});

describe("stats", () => {
  it("computes streaks with calendar gaps breaking them", () => {
    const s = streaks(recs, 10000);
    expect(s.longest).toEqual({ length: 2, start: "2024-12-30", end: "2024-12-31" });
    expect(s.current).toEqual({ length: 1, start: "2025-01-05", end: "2025-01-05" });
  });

  it("computes goal rate", () => {
    expect(goalRate(recs, 10000)).toEqual({ hit: 5, days: 6, rate: 5 / 6 });
  });

  it("computes moving averages", () => {
    expect(movingAverage([1, null, 3, 5], 2)).toEqual([1, 1, 3, 4]);
    const r = rollingByDate(recs, "steps", 2);
    // 01-05 window covers 01-04..01-05 -> only 15000
    expect(r[r.length - 1].value).toBe(15000);
    expect(r[1].value).toBe(11500);
  });

  it("averages by weekday (Mon=0)", () => {
    const w = weekdayAverages(recs, "steps");
    expect(w[0]).toBe(12000); // 2024-12-30 is a Monday
  });

  it("computes pearson correlation", () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1);
    expect(pearson([1, 2], [1, 2])).toBeNull();
  });
});

const REAL = join(process.cwd(), "HealthExport_2026-10-15_152610 2.json");
describe.skipIf(!existsSync(REAL))("real export file", () => {
  it("parses with expected coverage", () => {
    const ds = parseExport(JSON.parse(readFileSync(REAL, "utf8")));
    const y = byYear(ds.records, "steps");
    const days = Object.fromEntries(y.map((b) => [b.key, b.days]));
    expect(days["2014"]).toBe(36);
    expect(days["2015"]).toBe(365);
    expect(ds.records.filter((r) => r.hr !== undefined)).toHaveLength(852);
    const maxKm = Math.max(...ds.records.map((r) => r.distance ?? 0));
    expect(maxKm).toBeGreaterThan(15);
    expect(maxKm).toBeLessThan(20);
  });
});
