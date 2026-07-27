import { prisma } from "./prisma";
import {
  EST_TZ,
  dayKey,
  dayNoonAnchor,
  dayUtcRange,
  type ActivityDay,
} from "./activity-time";
import { CALENDAR_MAX, CALENDAR_MIN } from "./calendar-bounds";
import { getUserTimeZone } from "./user-time";

export type { ActivityDay };
export { EST_TZ, estDayKey, estDayUtcRange } from "./activity-time";
export { CALENDAR_MIN, CALENDAR_MAX } from "./calendar-bounds";

export function calendarWindowBounds(
  _journeyStartedAt?: Date | null,
  timeZone: string = EST_TZ,
) {
  return {
    minMonth: { year: CALENDAR_MIN.year, month: CALENDAR_MIN.month },
    maxMonth: { year: CALENDAR_MAX.year, month: CALENDAR_MAX.month },
    todayKey: dayKey(new Date(), timeZone),
  };
}

/** Days in a calendar month (1–12) in the user's timezone, plus today ask/count. */
export async function getActivityMonth(
  userId: string,
  year: number,
  month: number,
  journeyStartedAt?: Date | null,
  timeZone?: string,
): Promise<{
  days: ActivityDay[];
  todayCount: number;
  dailyAsk: number;
  year: number;
  month: number;
  minMonth: { year: number; month: number };
  maxMonth: { year: number; month: number };
}> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const tz = timeZone ?? (user ? getUserTimeZone(user) : EST_TZ);
  const bounds = calendarWindowBounds(journeyStartedAt, tz);
  const y = year;
  const m = month;

  const keys: string[] = [];
  let day = 1;
  for (;;) {
    const key = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const noon = dayNoonAnchor(key, tz);
    const check = dayKey(noon, tz);
    if (!check.startsWith(`${y}-${String(m).padStart(2, "0")}`)) break;
    keys.push(check);
    day += 1;
    if (day > 31) break;
  }

  const rangeStart = dayUtcRange(keys[0]!, tz).start;
  const rangeEnd = dayUtcRange(keys[keys.length - 1]!, tz).end;
  const attempts = await prisma.attempt.findMany({
    where: {
      userId,
      date: { gte: rangeStart, lt: rangeEnd },
    },
    select: { date: true, passedLeetCode: true },
  });

  const byDaySolves = new Map<string, number>();
  const byDayAttempts = new Map<string, number>();
  for (const a of attempts) {
    const k = dayKey(a.date, tz);
    byDayAttempts.set(k, (byDayAttempts.get(k) ?? 0) + 1);
    if (a.passedLeetCode === true) {
      byDaySolves.set(k, (byDaySolves.get(k) ?? 0) + 1);
    }
  }

  const days: ActivityDay[] = keys.map((date) => ({
    date,
    count: byDaySolves.get(date) ?? 0,
    attempts: byDayAttempts.get(date) ?? 0,
  }));
  const today = dayKey(new Date(), tz);
  const dailyAsk = await getDailyAsk(userId, tz);

  let todayCount = byDaySolves.get(today) ?? 0;
  if (!keys.includes(today)) {
    todayCount = await countSolvesOnEstDay(userId, today, tz);
  }

  return {
    days,
    todayCount,
    dailyAsk,
    year: y,
    month: m,
    minMonth: bounds.minMonth,
    maxMonth: bounds.maxMonth,
  };
}

/** @deprecated Prefer getActivityMonth — kept for any leftover callers. */
export async function getActivityCalendar(
  userId: string,
  weeks = 15,
  timeZone?: string,
): Promise<{ days: ActivityDay[]; todayCount: number; dailyAsk: number }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const tz = timeZone ?? (user ? getUserTimeZone(user) : EST_TZ);
  const today = dayKey(new Date(), tz);
  const keys: string[] = [];
  let key = today;
  for (let i = 0; i < weeks * 7; i++) {
    keys.unshift(key);
    const prev = new Date(dayNoonAnchor(key, tz).getTime() - 24 * 60 * 60 * 1000);
    key = dayKey(prev, tz);
  }

  const rangeStart = dayUtcRange(keys[0]!, tz).start;
  const attempts = await prisma.attempt.findMany({
    where: {
      userId,
      date: { gte: rangeStart },
    },
    select: { date: true, passedLeetCode: true },
  });

  const byDaySolves = new Map<string, number>();
  const byDayAttempts = new Map<string, number>();
  for (const a of attempts) {
    const k = dayKey(a.date, tz);
    byDayAttempts.set(k, (byDayAttempts.get(k) ?? 0) + 1);
    if (a.passedLeetCode === true) {
      byDaySolves.set(k, (byDaySolves.get(k) ?? 0) + 1);
    }
  }

  const days: ActivityDay[] = keys.map((date) => ({
    date,
    count: byDaySolves.get(date) ?? 0,
    attempts: byDayAttempts.get(date) ?? 0,
  }));
  const dailyAsk = await getDailyAsk(userId, tz);
  return {
    days,
    todayCount: byDaySolves.get(today) ?? 0,
    dailyAsk,
  };
}

/** What the day asks: due reviews + today's conquest quota (or remaining invaders). */
export async function getDailyAsk(userId: string, timeZone?: string): Promise<number> {
  const newPerDay = Number(process.env.NEW_PROBLEMS_PER_DAY ?? 3);
  const now = new Date();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.journeyStartedAt) return Math.max(1, newPerDay);
  const tz = timeZone ?? getUserTimeZone(user);

  const dueCount = await prisma.reviewState.count({
    where: {
      userId,
      OR: [
        { state: "fire" },
        { state: "rubble" },
        { state: "built", nextReviewDate: { lte: now } },
      ],
    },
  });
  const todayConquests = await prisma.dailyConquest.count({
    where: { userId, estDay: dayKey(now, tz) },
  });
  return Math.max(1, dueCount + (todayConquests || newPerDay));
}

/** All attempts on a calendar day (passed + failed). */
export async function countAttemptsOnEstDay(
  userId: string,
  dayKeyStr: string,
  timeZone: string = EST_TZ,
): Promise<number> {
  const { start, end } = dayUtcRange(dayKeyStr, timeZone);
  return prisma.attempt.count({
    where: {
      userId,
      date: { gte: start, lt: end },
    },
  });
}

/** Passed solves only on a calendar day (quest log / overtime). */
export async function countSolvesOnEstDay(
  userId: string,
  dayKeyStr: string,
  timeZone: string = EST_TZ,
): Promise<number> {
  const { start, end } = dayUtcRange(dayKeyStr, timeZone);
  return prisma.attempt.count({
    where: {
      userId,
      date: { gte: start, lt: end },
      passedLeetCode: true,
    },
  });
}
