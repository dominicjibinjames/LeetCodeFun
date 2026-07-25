/** Client-safe EST helpers — no Node/Prisma imports. */

export const EST_TZ = "America/New_York";

export type ActivityDay = {
  date: string;
  /** Passed LeetCode solves only (drives heat map + Today X/Y). */
  count: number;
  /** All logged attempts that day (passed + failed/skipped). */
  attempts: number;
};

/** YYYY-MM-DD in America/New_York */
export function estDayKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: EST_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Approx noon UTC-offset for an EST calendar day — good for stepping day-to-day. */
export function estNoonAnchor(dayKey: string): Date {
  const [y, m, d] = dayKey.split("-").map(Number);
  // EST is UTC-5 / EDT UTC-4; noon local ≈ 16:00–17:00 UTC
  for (const hour of [16, 17, 15, 18]) {
    const candidate = new Date(Date.UTC(y, m - 1, d, hour, 0, 0));
    if (estDayKey(candidate) === dayKey) return candidate;
  }
  return new Date(Date.UTC(y, m - 1, d, 17, 0, 0));
}

/** Inclusive-start / exclusive-end UTC range for one EST calendar day. */
export function estDayUtcRange(dayKey: string): { start: Date; end: Date } {
  const noon = estNoonAnchor(dayKey);
  let startMs = noon.getTime();
  while (estDayKey(new Date(startMs - 60_000)) === dayKey) {
    startMs -= 60_000;
  }
  while (estDayKey(new Date(startMs - 1000)) === dayKey) {
    startMs -= 1000;
  }
  const start = new Date(startMs);
  const nextKey = estDayKey(new Date(noon.getTime() + 24 * 60 * 60 * 1000));
  const nextNoon = estNoonAnchor(nextKey);
  let endMs = nextNoon.getTime();
  while (estDayKey(new Date(endMs - 60_000)) === nextKey) {
    endMs -= 60_000;
  }
  while (estDayKey(new Date(endMs - 1000)) === nextKey) {
    endMs -= 1000;
  }
  return { start, end: new Date(endMs) };
}
