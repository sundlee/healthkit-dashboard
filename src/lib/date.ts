export const TIME_ZONE = "Asia/Seoul";

const fmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** ISO timestamp -> YYYY-MM-DD in the export's local time zone. */
export function toDateKey(iso: string): string {
  return fmt.format(new Date(iso));
}

/** Parse YYYY-MM-DD as a UTC-midnight Date (calendar arithmetic only). */
export function keyToUTC(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(key: string, n: number): string {
  const d = keyToUTC(key);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 0 = Monday … 6 = Sunday */
export function weekdayMon0(key: string): number {
  return (keyToUTC(key).getUTCDay() + 6) % 7;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export const WEEKDAYS_KO = ["월", "화", "수", "목", "금", "토", "일"];

export function formatKoDate(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return `${y}년 ${m}월 ${d}일 (${WEEKDAYS_KO[weekdayMon0(key)]})`;
}
