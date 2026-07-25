import { prisma } from "./prisma";
import {
  estDayKey,
  estDayUtcRange,
  estNoonAnchor,
  type ActivityDay,
} from "./activity-time";
import { CALENDAR_MAX, CALENDAR_MIN } from "./calendar-bounds";

export type { ActivityDay };
export { EST_TZ, estDayKey, estDayUtcRange } from "./activity-time";
export { CALENDAR_MIN, CALENDAR_MAX } from "./calendar-bounds";

export function calendarWindowBounds(_journeyStartedAt?: Date | null) {
  return {
    minMonth: { year: CALENDAR_MIN.year, month: CALENDAR_MIN.month },
    maxMonth: { year: CALENDAR_MAX.year, month: CALENDAR_MAX.month },
    todayKey: estDayKey(),
  };
}

/** Days in an EST calendar month (1–12), plus today ask/count. */
export async function getActivityMonth(
  userId: string,
  year: number,
  month: number,
  journeyStartedAt?: Date | null,
): Promise<{
  days: ActivityDay[];
  todayCount: number;
  dailyAsk: number;
  year: number;
  month: number;
  minMonth: { year: number; month: number };
  maxMonth: { year: number; month: number };
}> {
  const bounds = calendarWindowBounds(journeyStartedAt);
  const y = year;
  const m = month;

  const keys: string[] = [];
  // Walk from day 1 of month until month rolls
  let day = 1;
  for (;;) {
    const key = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const noon = estNoonAnchor(key);
    const check = estDayKey(noon);
    if (!check.startsWith(`${y}-${String(m).padStart(2, "0")}`)) break;
    keys.push(check);
    day += 1;
    if (day > 31) break;
  }

  const rangeStart = estDayUtcRange(keys[0]!).start;
  const rangeEnd = estDayUtcRange(keys[keys.length - 1]!).end;
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
    const k = estDayKey(a.date);
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
  const today = estDayKey();
  const dailyAsk = await getDailyAsk(userId);

  let todayCount = byDaySolves.get(today) ?? 0;
  if (!keys.includes(today)) {
    todayCount = await countSolvesOnEstDay(userId, today);
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
): Promise<{ days: ActivityDay[]; todayCount: number; dailyAsk: number }> {
  const today = estDayKey();
  const keys: string[] = [];
  let key = today;
  for (let i = 0; i < weeks * 7; i++) {
    keys.unshift(key);
    const prev = new Date(estNoonAnchor(key).getTime() - 24 * 60 * 60 * 1000);
    key = estDayKey(prev);
  }

  const rangeStart = estDayUtcRange(keys[0]!).start;
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
    const k = estDayKey(a.date);
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
  const dailyAsk = await getDailyAsk(userId);
  return {
    days,
    todayCount: byDaySolves.get(today) ?? 0,
    dailyAsk,
  };
}

/** What the day asks: due reviews + today's conquest quota (or remaining invaders). */
export async function getDailyAsk(userId: string): Promise<number> {
  const newPerDay = Number(process.env.NEW_PROBLEMS_PER_DAY ?? 3);
  const now = new Date();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.journeyStartedAt) return Math.max(1, newPerDay);

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
    where: { userId, estDay: estDayKey() },
  });
  return Math.max(1, dueCount + (todayConquests || newPerDay));
}

/** All attempts on an EST day (passed + failed). */
export async function countAttemptsOnEstDay(userId: string, dayKey: string): Promise<number> {
  const { start, end } = estDayUtcRange(dayKey);
  return prisma.attempt.count({
    where: {
      userId,
      date: { gte: start, lt: end },
    },
  });
}

/** Passed solves only on an EST day (quest log / overtime). */
export async function countSolvesOnEstDay(userId: string, dayKey: string): Promise<number> {
  const { start, end } = estDayUtcRange(dayKey);
  return prisma.attempt.count({
    where: {
      userId,
      date: { gte: start, lt: end },
      passedLeetCode: true,
    },
  });
}
