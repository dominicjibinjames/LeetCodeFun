/** Client-safe calendar-day helpers — no Node/Prisma imports. */

export const EST_TZ = "America/New_York";

export type ActivityDay = {
  date: string;
  /** Passed LeetCode solves only (drives heat map + Today X/Y). */
  count: number;
  /** All logged attempts that day (passed + failed/skipped). */
  attempts: number;
};

/** YYYY-MM-DD in the given IANA timezone (defaults to America/New_York). */
export function dayKey(date: Date = new Date(), timeZone: string = EST_TZ): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** @deprecated Prefer dayKey(date, timeZone). Kept for Eastern default call sites. */
export function estDayKey(date: Date = new Date()): string {
  return dayKey(date, EST_TZ);
}

/**
 * An instant that falls on the given calendar day in `timeZone`
 * (prefers local noon). Good for stepping day-to-day.
 */
export function dayNoonAnchor(dayKeyStr: string, timeZone: string = EST_TZ): Date {
  const [y, m, d] = dayKeyStr.split("-").map(Number);
  let fallback: Date | null = null;
  for (let hour = 0; hour < 24; hour += 1) {
    const candidate = new Date(Date.UTC(y, m - 1, d, hour, 0, 0));
    if (dayKey(candidate, timeZone) !== dayKeyStr) continue;
    if (!fallback) fallback = candidate;
    const hourPart = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      hourCycle: "h23",
    })
      .formatToParts(candidate)
      .find((p) => p.type === "hour")?.value;
    const localH = Number(hourPart);
    if (localH >= 11 && localH <= 13) return candidate;
  }
  return fallback ?? new Date(Date.UTC(y, m - 1, d, 17, 0, 0));
}

/** @deprecated Prefer dayNoonAnchor(dayKey, timeZone). */
export function estNoonAnchor(dayKeyStr: string): Date {
  return dayNoonAnchor(dayKeyStr, EST_TZ);
}

/** Inclusive-start / exclusive-end UTC range for one calendar day in `timeZone`. */
export function dayUtcRange(
  dayKeyStr: string,
  timeZone: string = EST_TZ,
): { start: Date; end: Date } {
  const noon = dayNoonAnchor(dayKeyStr, timeZone);
  let startMs = noon.getTime();
  while (dayKey(new Date(startMs - 60_000), timeZone) === dayKeyStr) {
    startMs -= 60_000;
  }
  while (dayKey(new Date(startMs - 1000), timeZone) === dayKeyStr) {
    startMs -= 1000;
  }
  const start = new Date(startMs);
  const nextKey = dayKey(new Date(noon.getTime() + 24 * 60 * 60 * 1000), timeZone);
  const nextNoon = dayNoonAnchor(nextKey, timeZone);
  let endMs = nextNoon.getTime();
  while (dayKey(new Date(endMs - 60_000), timeZone) === nextKey) {
    endMs -= 60_000;
  }
  while (dayKey(new Date(endMs - 1000), timeZone) === nextKey) {
    endMs -= 1000;
  }
  return { start, end: new Date(endMs) };
}

/** @deprecated Prefer dayUtcRange(dayKey, timeZone). */
export function estDayUtcRange(dayKeyStr: string): { start: Date; end: Date } {
  return dayUtcRange(dayKeyStr, EST_TZ);
}

/** Inclusive calendar-day distance between YYYY-MM-DD keys (0 = same day). */
export function dayDiff(earlierKey: string, laterKey: string): number {
  if (earlierKey === laterKey) return 0;
  const [y1, m1, d1] = earlierKey.split("-").map(Number);
  const [y2, m2, d2] = laterKey.split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}
