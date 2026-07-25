import { prisma } from "@/lib/prisma";
import { tracksForBuildingSlot } from "@/lib/catalog-tracks";
import { districtUnlockOrder, unlockedDistrictIds } from "@/lib/district-progress";
import { matchesDifficulty, type DifficultyMode } from "@/lib/difficulty-mode";
import { matchesTrack, type TrackMode } from "@/lib/track-mode";
import { estDayKey, estNoonAnchor } from "@/lib/activity-time";

const newPerDay = () => Number(process.env.NEW_PROBLEMS_PER_DAY ?? 3);

/** Inclusive EST calendar-day distance (0 = same day). */
export function estDayDiff(earlierKey: string, laterKey: string): number {
  if (earlierKey === laterKey) return 0;
  let n = 0;
  let key = earlierKey;
  // Cap walk to avoid infinite loops on bad keys
  while (key !== laterKey && n < 4000) {
    const next = estDayKey(new Date(estNoonAnchor(key).getTime() + 24 * 60 * 60 * 1000));
    key = next;
    n += 1;
  }
  return n;
}

export async function getTodayConquestSlots(userId: string, dayKey = estDayKey()): Promise<Set<string>> {
  const rows = await prisma.dailyConquest.findMany({
    where: { userId, estDay: dayKey },
    select: { buildingSlot: true },
  });
  return new Set(rows.map((r) => r.buildingSlot));
}

export async function getTodayConquestProblemIds(
  userId: string,
  dayKey = estDayKey(),
): Promise<Set<string>> {
  const rows = await prisma.dailyConquest.findMany({
    where: { userId, estDay: dayKey },
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
) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.journeyStartedAt) return [];

  const dayKey = estDayKey();
  const existing = await prisma.dailyConquest.findMany({
    where: { userId, estDay: dayKey },
  });
  const quota = newPerDay();
  if (existing.length >= quota) return existing;

  const problems = await prisma.problem.findMany({
    where: { userId },
    include: { reviewState: true },
  });

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
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

  const need = quota - existing.length;
  const pick = candidates.slice(0, need);
  if (pick.length === 0) return existing;

  await prisma.dailyConquest.createMany({
    data: pick.map((p) => ({
      userId,
      estDay: dayKey,
      problemId: p.id,
      buildingSlot: p.buildingSlot,
      districtId: p.district,
    })),
    skipDuplicates: true,
  });

  return prisma.dailyConquest.findMany({
    where: { userId, estDay: dayKey },
  });
}

/** Prior-day unfinished conquests → fire (with fireSince). */
export async function promoteMissedConquestsToFire(userId: string) {
  const today = estDayKey();
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
    const fireStart = estNoonAnchor(row.estDay);
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
