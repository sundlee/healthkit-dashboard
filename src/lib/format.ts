import { METRICS, type MetricKey } from "./types";

const cache = new Map<number, Intl.NumberFormat>();
const nf = (digits: number) => {
  let f = cache.get(digits);
  if (!f) {
    f = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: digits, minimumFractionDigits: digits });
    cache.set(digits, f);
  }
  return f;
};

export function fmtNum(v: number | null | undefined, digits = 0): string {
  return v === null || v === undefined ? "–" : nf(digits).format(v);
}

export function fmtMetric(v: number | null | undefined, m: MetricKey, withUnit = true): string {
  const meta = METRICS[m];
  const s = fmtNum(v, meta.digits);
  return withUnit && s !== "–" ? `${s} ${meta.unit}` : s;
}

/** Compact axis labels: 12,345 -> 1.2만 */
export function fmtCompact(v: number): string {
  if (Math.abs(v) >= 100_000_000) return `${+(v / 100_000_000).toFixed(1)}억`;
  if (Math.abs(v) >= 10_000) return `${+(v / 10_000).toFixed(1)}만`;
  return nf(0).format(v);
}

export function fmtPct(v: number | null, signed = false): string {
  if (v === null) return "–";
  const s = `${(v * 100).toFixed(1)}%`;
  return signed && v > 0 ? `+${s}` : s;
}
