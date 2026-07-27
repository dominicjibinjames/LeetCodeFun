import { prisma } from "@/lib/prisma";
import { tracksForBuildingSlot } from "@/lib/catalog-tracks";
import { districtUnlockOrder, unlockedDistrictIds } from "@/lib/district-progress";
import { matchesDifficulty, type DifficultyMode } from "@/lib/difficulty-mode";
import { matchesTrack, type TrackMode } from "@/lib/track-mode";
import { EST_TZ, dayDiff, dayKey, dayNoonAnchor } from "@/lib/activity-time";
import { getUserTimeZone } from "@/lib/user-time";

const newPerDay = () => Number(process.env.NEW_PROBLEMS_PER_DAY ?? 3);

/** Inclusive calendar-day distance (0 = same day). */
export function estDayDiff(earlierKey: string, laterKey: string): number {
  return dayDiff(earlierKey, laterKey);
}

export async function getTodayConquestSlots(
  userId: string,
  dayKeyStr?: string,
  timeZone: string = EST_TZ,
): Promise<Set<string>> {
  const key = dayKeyStr ?? dayKey(new Date(), timeZone);
  const rows = await prisma.dailyConquest.findMany({
    where: { userId, estDay: key },
    select: { buildingSlot: true },
  });
  return new Set(rows.map((r) => r.buildingSlot));
}

export async function getTodayConquestProblemIds(
  userId: string,
  dayKeyStr?: string,
  timeZone: string = EST_TZ,
): Promise<Set<string>> {
  const key = dayKeyStr ?? dayKey(new Date(), timeZone);
  const rows = await prisma.dailyConquest.findMany({
    where: { userId, estDay: key },
    select: { problemId: true },
  });
  return new Set(rows.map((r) => r.problemId));
}

/**
 * Ensure today's daily conquests are assigned (up to NEW_PROBLEMS_PER_DAY).
 * Only runs when journey has started. Picks from unlocked districts + filters.
 */
export async function ensureTodayConquests(
  userId: string,
  difficultyMode: DifficultyMode = "all",
  trackMode: TrackMode = "all",
  timeZone?: string,
) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.journeyStartedAt) return [];

  const tz = timeZone ?? getUserTimeZone(user);
  const todayKey = dayKey(new Date(), tz);
  const existing = await prisma.dailyConquest.findMany({
    where: { userId, estDay: todayKey },
  });
  const quota = newPerDay();
  if (existing.length >= quota) return existing;

  const { getUserProblemProgress } = await import("@/lib/user-progress");
  const problems = await getUserProblemProgress(userId);

  const progress = problems.map((p) => ({
    district: p.district,
    buildingSlot: p.buildingSlot,
    difficulty: p.difficulty,
    state: p.reviewState?.state ?? "unattempted",
  }));

  const unlocked = unlockedDistrictIds(
    progress,
    difficultyMode,
    trackMode,
    user.progressiveUnlock,
    true,
  );

  const alreadyIds = new Set(existing.map((e) => e.problemId));
  const order = districtUnlockOrder();

  const candidates = problems
    .filter((p) => {
      if (alreadyIds.has(p.id)) return false;
      if ((p.reviewState?.state ?? "unattempted") !== "unattempted") return false;
      if (!unlocked.has(p.district)) return false;
      if (!matchesDifficulty(p.difficulty, difficultyMode)) return false;
      if (!matchesTrack(tracksForBuildingSlot(p.buildingSlot), trackMode)) return false;
      return true;
    })
    .sort((a, b) => {
      const da = order.indexOf(a.district);
      const db = order.indexOf(b.district);
      if (da !== db) return da - db;
      const ac = a.createdAt?.getTime?.() ?? 0;
      const bc = b.createdAt?.getTime?.() ?? 0;
      return ac - bc;
    });

  const need = quota - existing.length;
  const pick = candidates.slice(0, need);
  if (pick.length === 0) return existing;

  await prisma.dailyConquest.createMany({
    data: pick.map((p) => ({
      userId,
      estDay: todayKey,
      problemId: p.id,
      buildingSlot: p.buildingSlot,
      districtId: p.district,
    })),
    skipDuplicates: true,
  });

  return prisma.dailyConquest.findMany({
    where: { userId, estDay: todayKey },
  });
}

/** Prior-day unfinished conquests → fire (with fireSince). */
export async function promoteMissedConquestsToFire(
  userId: string,
  timeZone?: string,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const tz = timeZone ?? (user ? getUserTimeZone(user) : EST_TZ);
  const today = dayKey(new Date(), tz);
  // Cap per request so navigation never scans unbounded history on a small
  // connection budget (direct db.prisma.io was timing out under this load).
  const missed = await prisma.dailyConquest.findMany({
    where: {
      userId,
      estDay: { not: today },
      problem: { reviewState: { state: "unattempted" } },
    },
    include: { problem: { include: { reviewState: true } } },
    orderBy: { estDay: "asc" },
    take: 15,
  });

  for (const row of missed) {
    const rs = row.problem.reviewState;
    if (!rs || rs.state !== "unattempted") continue;
    const fireStart = dayNoonAnchor(row.estDay, tz);
    await prisma.reviewState.update({
      where: { id: rs.id },
      data: {
        state: "fire",
        fireSince: fireStart,
        nextReviewDate: fireStart,
      },
    });
  }
}
