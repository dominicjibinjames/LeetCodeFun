import { prisma } from "@/lib/prisma";
import { dayKey, dayNoonAnchor } from "@/lib/activity-time";
import { ensureTodayConquests } from "@/lib/daily-conquest";
import { type DifficultyMode } from "@/lib/difficulty-mode";
import { type TrackMode } from "@/lib/track-mode";
import { BOX_INTERVALS_DAYS, intervalForBox } from "@/lib/srs";
import { getUserTimeZone } from "@/lib/user-time";
import { syncReviewStates } from "@/lib/xp";

export const PATHWAY_HORIZON_DAYS = 45;

export type PathwayItem = {
  problemId: string;
  title: string;
  districtId: string;
  difficulty: string;
  box: number;
  intervalDays: number;
  nextReviewDate: string | null;
  fireSince: string | null;
  state: string;
};

export type PathwayDay = {
  estDay: string;
  isToday: boolean;
  battles: PathwayItem[];
  fire: PathwayItem[];
  rubble: PathwayItem[];
  dueReviews: PathwayItem[];
};

export type PathwayPayload = {
  journeyStarted: boolean;
  today: {
    battles: PathwayItem[];
    fire: PathwayItem[];
    rubble: PathwayItem[];
  };
  upcoming: PathwayItem[];
  horizon: PathwayDay[];
  meta: {
    estDay: string;
    journeyStartedAt: string | null;
    intervals: readonly number[];
    graceDays: number;
    horizonDays: number;
  };
};

function toItem(row: {
  problemId: string;
  box: number;
  nextReviewDate: Date | null;
  fireSince: Date | null;
  state: string;
  problem: { title: string; district: string; difficulty: string };
}): PathwayItem {
  return {
    problemId: row.problemId,
    title: row.problem.title,
    districtId: row.problem.district,
    difficulty: row.problem.difficulty,
    box: row.box,
    intervalDays: intervalForBox(row.box),
    nextReviewDate: row.nextReviewDate?.toISOString() ?? null,
    fireSince: row.fireSince?.toISOString() ?? null,
    state: row.state,
  };
}

function emptyPathway(estDay: string): PathwayPayload {
  return {
    journeyStarted: false,
    today: { battles: [], fire: [], rubble: [] },
    upcoming: [],
    horizon: [],
    meta: {
      estDay,
      journeyStartedAt: null,
      intervals: BOX_INTERVALS_DAYS,
      graceDays: Number(process.env.REVIEW_GRACE_DAYS ?? 3),
      horizonDays: PATHWAY_HORIZON_DAYS,
    },
  };
}

export async function getPathway(
  userId: string,
  difficultyMode: DifficultyMode,
  trackMode: TrackMode,
): Promise<PathwayPayload> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const tz = getUserTimeZone(user);
  const todayKey = dayKey(new Date(), tz);

  if (!user.journeyStartedAt) {
    return {
      ...emptyPathway(todayKey),
      meta: {
        ...emptyPathway(todayKey).meta,
        journeyStartedAt: null,
      },
    };
  }

  await syncReviewStates(userId);
  await ensureTodayConquests(userId, difficultyMode, trackMode, tz);

  const now = new Date();
  const [fireRows, rubbleRows, upcomingRows, conquests] = await Promise.all([
    prisma.reviewState.findMany({
      where: { userId, state: "fire" },
      include: { problem: true },
      orderBy: { fireSince: "asc" },
    }),
    prisma.reviewState.findMany({
      where: { userId, state: "rubble" },
      include: { problem: true },
      orderBy: { nextReviewDate: "asc" },
    }),
    prisma.reviewState.findMany({
      where: {
        userId,
        state: "built",
        nextReviewDate: { gt: now },
      },
      include: { problem: true },
      orderBy: { nextReviewDate: "asc" },
    }),
    prisma.dailyConquest.findMany({
      where: { userId, estDay: todayKey },
      include: {
        problem: { include: { reviewState: true } },
      },
    }),
  ]);

  const battles: PathwayItem[] = conquests
    .map((c) => c.problem)
    .filter((p) => (p.reviewState?.state ?? "unattempted") === "unattempted")
    .map((p) => {
      const rs = p.reviewState;
      return {
        problemId: p.id,
        title: p.title,
        districtId: p.district,
        difficulty: p.difficulty,
        box: rs?.box ?? 0,
        intervalDays: rs ? intervalForBox(rs.box) : 0,
        nextReviewDate: rs?.nextReviewDate?.toISOString() ?? null,
        fireSince: rs?.fireSince?.toISOString() ?? null,
        state: rs?.state ?? "unattempted",
      };
    });

  const fire = fireRows.map(toItem);
  const rubble = rubbleRows.map(toItem);
  const upcoming = upcomingRows.map(toItem);

  const dueByDay = new Map<string, PathwayItem[]>();
  for (const item of upcoming) {
    if (!item.nextReviewDate) continue;
    const key = dayKey(new Date(item.nextReviewDate), tz);
    const list = dueByDay.get(key) ?? [];
    list.push(item);
    dueByDay.set(key, list);
  }

  const horizon: PathwayDay[] = [];
  let cursor = todayKey;
  for (let i = 0; i < PATHWAY_HORIZON_DAYS; i += 1) {
    const isToday = cursor === todayKey;
    horizon.push({
      estDay: cursor,
      isToday,
      battles: isToday ? battles : [],
      fire: isToday ? fire : [],
      rubble: isToday ? rubble : [],
      dueReviews: dueByDay.get(cursor) ?? [],
    });
    cursor = dayKey(
      new Date(dayNoonAnchor(cursor, tz).getTime() + 24 * 60 * 60 * 1000),
      tz,
    );
  }

  return {
    journeyStarted: true,
    today: { battles, fire, rubble },
    upcoming,
    horizon,
    meta: {
      estDay: todayKey,
      journeyStartedAt: user.journeyStartedAt.toISOString(),
      intervals: BOX_INTERVALS_DAYS,
      graceDays: Number(process.env.REVIEW_GRACE_DAYS ?? 3),
      horizonDays: PATHWAY_HORIZON_DAYS,
    },
  };
}
