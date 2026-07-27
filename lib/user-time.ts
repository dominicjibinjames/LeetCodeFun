import { EST_TZ, dayKey } from "@/lib/activity-time";

export const DEFAULT_TIMEZONE = EST_TZ;
export const DEFAULT_NOTIFY_HOUR = 8;

const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
  "UTC",
] as const;

export function commonTimezones(): readonly string[] {
  return COMMON_TIMEZONES;
}

/** Validate IANA id; invalid → Eastern default. */
export function resolveTimeZone(raw: string | null | undefined): string {
  const tz = (raw ?? "").trim() || DEFAULT_TIMEZONE;
  try {
    // Throws RangeError for invalid zones
    new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date());
    return tz;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

export function resolveNotifyHour(raw: number | null | undefined): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return DEFAULT_NOTIFY_HOUR;
  const h = Math.trunc(raw);
  if (h < 0 || h > 23) return DEFAULT_NOTIFY_HOUR;
  return h;
}

export function getUserTimeZone(user: { timezone?: string | null }): string {
  return resolveTimeZone(user.timezone);
}

export function localDayKeyNow(timeZone: string, now = new Date()): string {
  return dayKey(now, resolveTimeZone(timeZone));
}

export function localHourNow(timeZone: string, now = new Date()): number {
  const tz = resolveTimeZone(timeZone);
  const hourPart = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    hourCycle: "h23",
  })
    .formatToParts(now)
    .find((p) => p.type === "hour")?.value;
  return Number(hourPart ?? 0);
}

/** Whether this cron tick should send the user's daily review push. */
export function shouldSendReviewPush(opts: {
  timezone: string;
  notifyHourLocal: number;
  lastPushLocalDay: string | null | undefined;
  now?: Date;
}): { send: boolean; localDay: string; localHour: number } {
  const tz = resolveTimeZone(opts.timezone);
  const hourWanted = resolveNotifyHour(opts.notifyHourLocal);
  const now = opts.now ?? new Date();
  const localDay = localDayKeyNow(tz, now);
  const localHour = localHourNow(tz, now);
  if (localHour !== hourWanted) {
    return { send: false, localDay, localHour };
  }
  if (opts.lastPushLocalDay === localDay) {
    return { send: false, localDay, localHour };
  }
  return { send: true, localDay, localHour };
}

export function formatHourLabel(hour: number): string {
  const h = resolveNotifyHour(hour);
  const suffix = h < 12 ? "AM" : "PM";
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}:00 ${suffix}`;
}
