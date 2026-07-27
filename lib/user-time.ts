import { EST_TZ } from "@/lib/activity-time";

/** Eastern Time only — per-user timezone prefs are disabled for now. */
export const DEFAULT_TIMEZONE = EST_TZ;
export const DEFAULT_NOTIFY_HOUR = 8;

/** Always Eastern; ignores stored user.timezone so game day stays EST/EDT. */
export function getUserTimeZone(_user?: { timezone?: string | null }): string {
  return EST_TZ;
}

export function resolveTimeZone(_raw?: string | null): string {
  return EST_TZ;
}

export function resolveNotifyHour(_raw?: number | null): number {
  return DEFAULT_NOTIFY_HOUR;
}
