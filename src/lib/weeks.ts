import { getISOWeek, getISOWeekYear } from "date-fns";

/**
 * ISO-8601 week helpers. Always computed from a UTC reading of the instant,
 * never the server's local timezone (SPEC §2.4).
 */
export function weekKeyOf(date: Date): string {
  const asUtc = new Date(date.getTime() + date.getTimezoneOffset() * 60_000);
  const week = String(getISOWeek(asUtc)).padStart(2, "0");
  return `${getISOWeekYear(asUtc)}-W${week}`;
}

export function currentWeekKey(now: Date = new Date()): string {
  return weekKeyOf(now);
}

/** ISO week of `now - 1 hour` — used by the rollover job to find the closing week (SPEC §2.10). */
export function closingWeekKey(now: Date = new Date()): string {
  return weekKeyOf(new Date(now.getTime() - 3_600_000));
}

/** Parse a week key back to a UTC Monday 00:00. */
export function weekKeyToDate(week: string): Date {
  const m = /^(\d{4})-W(\d{2})$/.exec(week);
  if (!m) throw new Error(`Invalid week key: ${week}`);
  const year = Number(m[1]);
  const weekNum = Number(m[2]);
  const jan4 = Date.UTC(year, 0, 4);
  const jan4WeekDay = new Date(jan4).getUTCDay() || 7; // Mon=1..Sun=7
  const week1Monday = jan4 - (jan4WeekDay - 1) * 86_400_000;
  return new Date(week1Monday + (weekNum - 1) * 7 * 86_400_000);
}
