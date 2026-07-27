import { cache } from "react";
import { prisma } from "./prisma";
import { countSolvesOnEstDay, getDailyAsk } from "./activity";
import { dayDiff, dayKey } from "./activity-time";
import { ensureTodayConquests, promoteMissedConquestsToFire } from "./daily-conquest";
import { tracksForBuildingSlot } from "./catalog-tracks";
import { type DifficultyMode } from "./difficulty-mode";
import { isQuestLocked } from "./quest-filters";
import { type TrackMode } from "./track-mode";
import {
  XP_BOSS_BONUS,
  XP_CLEAN_REVIEW,
  XP_CLEAN_SOLVE,
  XP_COURT_OVERTIME,
  XP_MISS,
  MAX_BOX,
  initialBuild,
  isReviewDue,
  markFire,
  promoteBox,
  resetToRubble,
} from "./srs";
import { getSessionUser } from "./session-user";
import { getUserTimeZone } from "./user-time";

const GRACE_DAYS = () => Number(process.env.REVIEW_GRACE_DAYS ?? 3);

/** Signed-in app user. Throws UNAUTHORIZED for guests. */
export async function getOrCreateUser() {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

/** Guest-safe session lookup (request-deduped via getSessionUser). */
export async function getOptionalUser() {
  return getSessionUser();
}

export async function touchStreak(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const tz = getUserTimeZone(user);
  const now = new Date();
  const todayKey = dayKey(now, tz);
  let streakDays = user.streakDays;

  if (!user.lastActive) {
    streakDays = 1;
  } else {
    const lastKey = dayKey(user.lastActive, tz);
    const diff = dayDiff(lastKey, todayKey);
    if (diff === 0) {
      // same local calendar day
    } else if (diff === 1) {
      streakDays += 1;
    } else if (diff > 1) {
      streakDays = 1;
    }
  }

  return prisma.user.update({
    where: { id: userId },
    data: { lastActive: now, streakDays },
  });
}

/** Promote due reviews / overdue fires. Deduped once per userId per request. */
export const syncReviewStates = cache(async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const tz = user ? getUserTimeZone(user) : "America/New_York";
  await promoteMissedConquestsToFire(userId, tz);

  // Clamp legacy Leitner boxes (old max was 5) down to the 1/7/10 ladder (max 3).
  // Do not rewrite nextReviewDate — new intervals apply on next promote/rebuild.
  await prisma.reviewState.updateMany({
    where: { userId, box: { gt: MAX_BOX } },
    data: { box: MAX_BOX },
  });

  const today = dayKey(new Date(), tz);
  const states = await prisma.reviewState.findMany({
    where: {
      userId,
      state: { in: ["built", "fire"] },
    },
  });

  // Sequential updates avoid exhausting the DB driver under concurrent RSC work.
  for (const state of states) {
    if (state.state === "built" && isReviewDue(state.nextReviewDate)) {
      const fire = markFire(new Date());
      await prisma.reviewState.update({
        where: { id: state.id },
        data: fire,
      });
      continue;
    }

    if (state.state === "fire") {
      const since = state.fireSince ?? state.nextReviewDate;
      const sinceKey = dayKey(since, tz);
      if (dayDiff(sinceKey, today) >= GRACE_DAYS()) {
        const reset = resetToRubble();
        await prisma.reviewState.update({
          where: { id: state.id },
          data: {
            ...reset,
            consecutiveMisses: state.consecutiveMisses + 1,
          },
        });
      }
    }
  }
});

export function journeyDayNumber(
  journeyStartedAt: Date | null | undefined,
  now = new Date(),
  timeZone = "America/New_York",
): number | null {
  if (!journeyStartedAt) return null;
  return (
    dayDiff(dayKey(journeyStartedAt, timeZone), dayKey(now, timeZone)) + 1
  );
}

export async function startJourney(opts?: {
  difficulty?: DifficultyMode;
  track?: TrackMode;
  /** Switch pathway / start another filter set (keeps built progress). */
  restart?: boolean;
}) {
  const user = await getOrCreateUser();
  const difficulty = opts?.difficulty ?? "all";
  const track = opts?.track ?? "all";

  if (user.journeyStartedAt && !opts?.restart) {
    return user;
  }

  // Leaving a pathway: drop today's invaders so the new filters can muster a fresh set.
  if (opts?.restart && user.journeyStartedAt) {
    const tz = getUserTimeZone(user);
    await prisma.dailyConquest.deleteMany({
      where: { userId: user.id, estDay: dayKey(new Date(), tz) },
    });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      journeyStartedAt: new Date(),
      journeyDifficulty: difficulty,
      journeyTrack: track,
      // Starting a journey always uses progressive lock; free roam is an explicit Settings opt-in.
      progressiveUnlock: true,
    },
  });
  await ensureTodayConquests(
    updated.id,
    difficulty,
    track,
    getUserTimeZone(updated),
  );
  return updated;
}

export async function setProgressiveUnlock(enabled: boolean) {
  const user = await getOrCreateUser();
  return prisma.user.update({
    where: { id: user.id },
    data: { progressiveUnlock: enabled },
  });
}

export function normalizePattern(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function patternsMatch(guess: string, primary: string): boolean {
  const g = normalizePattern(guess);
  const p = normalizePattern(primary);
  if (g === p) return true;
  // allow loose contains either way for free-text overrides
  return g.includes(p) || p.includes(g);
}

export type AttemptPayload = {
  patternGuess: string;
  patternJustification: string;
  explanation: string;
  timeComplexity?: string;
  spaceComplexity?: string;
  complexityWhy?: string;
  confidenceRating: number;
  reasoningSeconds: number;
  codingSeconds?: number;
  wasBossFight: boolean;
  bossFightWon?: boolean;
  passedLeetCode?: boolean;
  mode: "practice" | "timed" | "review";
  reviewClean?: boolean;
};

export async function submitAttempt(problemId: string, payload: AttemptPayload) {
  const user = await getOrCreateUser();
  await syncReviewStates(user.id);

  const problem = await prisma.problem.findFirstOrThrow({
    where: { id: problemId, userId: user.id },
    include: { reviewState: true },
  });

  const wasCorrectPattern = patternsMatch(payload.patternGuess, problem.patternPrimary);
  const review = problem.reviewState;
  const isFirstBuild = !review || review.state === "unattempted";
  const isRebuild = review?.state === "rubble";
  const isReview = review?.state === "fire" || payload.mode === "review";

  // Snapshot ask before clearing fires so overtime stays fair
  const dailyAsk = await getDailyAsk(user.id);

  let xpDelta = 0;
  let nextState = review;

  const clean =
    payload.reviewClean !== false &&
    wasCorrectPattern &&
    Boolean(payload.explanation.trim()) &&
    (payload.passedLeetCode !== false);

  if (isFirstBuild || isRebuild) {
    if (payload.wasBossFight && payload.bossFightWon === false) {
      // stay unattempted / rubble — no build
      xpDelta = XP_MISS;
    } else if (clean && (!payload.wasBossFight || payload.bossFightWon)) {
      const built = initialBuild();
      nextState = await prisma.reviewState.upsert({
        where: { problemId },
        create: {
          userId: user.id,
          problemId,
          ...built,
        },
        update: {
          ...built,
          consecutiveMisses: 0,
        },
      });
      xpDelta = XP_CLEAN_SOLVE + (payload.wasBossFight && payload.bossFightWon ? XP_BOSS_BONUS : 0);
    } else {
      xpDelta = XP_MISS;
    }
  } else if (isReview) {
    if (clean) {
      const promoted = promoteBox(review?.box ?? 1);
      nextState = await prisma.reviewState.update({
        where: { problemId },
        data: { ...promoted, consecutiveMisses: 0 },
      });
      xpDelta = XP_CLEAN_REVIEW;
    } else {
      const rubble = resetToRubble();
      nextState = await prisma.reviewState.update({
        where: { problemId },
        data: {
          ...rubble,
          consecutiveMisses: (review?.consecutiveMisses ?? 0) + 1,
        },
      });
      xpDelta = XP_MISS;
    }
  } else if (clean) {
    // practice on already-built building — soft XP, no box change
    xpDelta = Math.floor(XP_CLEAN_REVIEW / 2);
  }

  const attempt = await prisma.attempt.create({
    data: {
      userId: user.id,
      problemId,
      patternGuess: payload.patternGuess,
      patternJustification: payload.patternJustification,
      explanation: payload.explanation,
      timeComplexity: payload.timeComplexity?.trim() || null,
      spaceComplexity: payload.spaceComplexity?.trim() || null,
      complexityWhy: payload.complexityWhy?.trim() || null,
      confidenceRating: payload.confidenceRating,
      reasoningSeconds: payload.reasoningSeconds,
      codingSeconds: payload.codingSeconds ?? null,
      wasCorrectPattern,
      wasBossFight: payload.wasBossFight,
      bossFightWon: payload.bossFightWon ?? null,
      passedLeetCode: payload.passedLeetCode ?? null,
      mode: payload.mode,
    },
  });

  let courtBonus = 0;
  if (xpDelta > 0) {
    const tz = getUserTimeZone(user);
    const todayKey = dayKey(new Date(), tz);
    const todayCount = await countSolvesOnEstDay(user.id, todayKey, tz);
    // Extra solves (passes) beyond what the day asked → court overtime bonus
    if (todayCount > dailyAsk) {
      courtBonus = XP_COURT_OVERTIME;
      xpDelta += courtBonus;
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { xp: { increment: xpDelta } },
  });
  await touchStreak(user.id);

  return {
    attempt,
    reviewState: nextState,
    xpDelta,
    courtBonus,
    xp: updatedUser.xp,
    wasCorrectPattern,
  };
}

export async function getDailyQueue(
  userId: string,
  difficultyMode: DifficultyMode = "all",
  trackMode: TrackMode = "all",
) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  await syncReviewStates(userId);

  type QueueProblem = {
    id: string;
    title: string;
    district: string;
    difficulty: string;
    buildingSlot: string;
    queueState?: string;
    reviewState?: { state: string } | null;
  };

  if (!user.journeyStartedAt) {
    return {
      dueReviews: [] as QueueProblem[],
      newProblems: [] as QueueProblem[],
      difficultyMode,
      trackMode,
      journeyStarted: false as const,
    };
  }

  await ensureTodayConquests(userId, difficultyMode, trackMode, getUserTimeZone(user));
  const now = new Date();
  const todayKey = dayKey(now, getUserTimeZone(user));

  const due = await prisma.reviewState.findMany({
    where: {
      userId,
      OR: [
        { state: "fire" },
        { state: "rubble" },
        { state: "built", nextReviewDate: { lte: now } },
      ],
    },
    include: { problem: true },
    orderBy: { nextReviewDate: "asc" },
  });

  const conquests = await prisma.dailyConquest.findMany({
    where: { userId, estDay: todayKey },
    include: {
      problem: { include: { reviewState: true } },
    },
  });

  const newProblems: QueueProblem[] = conquests
    .map((c) => c.problem)
    .filter((p) => (p.reviewState?.state ?? "unattempted") === "unattempted")
    .filter(
      (p) =>
        !isQuestLocked(
          { difficulty: p.difficulty, tracks: tracksForBuildingSlot(p.buildingSlot) },
          difficultyMode,
          trackMode,
        ),
    )
    .map((p) => ({
      id: p.id,
      title: p.title,
      district: p.district,
      difficulty: p.difficulty,
      buildingSlot: p.buildingSlot,
      reviewState: p.reviewState,
    }));

  const dueReviews: QueueProblem[] = due
    .map((d) => ({
      id: d.problem.id,
      title: d.problem.title,
      district: d.problem.district,
      difficulty: d.problem.difficulty,
      buildingSlot: d.problem.buildingSlot,
      queueState: d.state,
    }))
    .filter(
      (p) =>
        !isQuestLocked(
          { difficulty: p.difficulty, tracks: tracksForBuildingSlot(p.buildingSlot) },
          difficultyMode,
          trackMode,
        ),
    );

  return {
    dueReviews,
    newProblems,
    difficultyMode,
    trackMode,
    journeyStarted: true as const,
  };
}

export function computeMorale(states: { state: string }[]): number {
  const attempted = states.filter((s) => s.state !== "unattempted");
  if (attempted.length === 0) return 1;
  const thriving = attempted.filter((s) => s.state === "built").length;
  return thriving / attempted.length;
}

function pristineReview() {
  return {
    box: 1,
    nextReviewDate: new Date(),
    state: "unattempted" as const,
    consecutiveMisses: 0,
    fireSince: null as null,
  };
}

/** Clear attempts + SRS state for one problem owned by the current user. */
export async function resetProblemProgress(problemId: string) {
  const user = await getOrCreateUser();
  const problem = await prisma.problem.findFirst({
    where: { id: problemId, userId: user.id },
    include: { reviewState: true },
  });
  if (!problem) {
    throw new Error("Problem not found");
  }

  const [deletedAttempts] = await prisma.$transaction([
    prisma.attempt.deleteMany({ where: { userId: user.id, problemId } }),
    prisma.reviewState.upsert({
      where: { problemId },
      create: {
        userId: user.id,
        problemId,
        ...pristineReview(),
      },
      update: pristineReview(),
    }),
  ]);

  return {
    problemId,
    deletedAttempts: deletedAttempts.count,
    state: "unattempted" as const,
  };
}

/** Wipe all attempts, review states, XP, and streak for the current user. */
export async function resetKingdomProgress() {
  const user = await getOrCreateUser();

  const result = await prisma.$transaction(async (tx) => {
    const deletedAttempts = await tx.attempt.deleteMany({ where: { userId: user.id } });
    const deletedReviews = await tx.reviewState.deleteMany({ where: { userId: user.id } });
    const problems = await tx.problem.findMany({
      where: { userId: user.id },
      select: { id: true },
    });
    if (problems.length > 0) {
      await tx.reviewState.createMany({
        data: problems.map((p) => ({
          userId: user.id,
          problemId: p.id,
          ...pristineReview(),
        })),
      });
    }
    const updatedUser = await tx.user.update({
      where: { id: user.id },
      data: {
        xp: 0,
        streakDays: 0,
        lastActive: null,
        journeyStartedAt: null,
        journeyDifficulty: null,
        journeyTrack: null,
      },
    });
    await tx.dailyConquest.deleteMany({ where: { userId: user.id } });
    return {
      deletedAttempts: deletedAttempts.count,
      resetReviews: deletedReviews.count,
      problems: problems.length,
      xp: updatedUser.xp,
      streakDays: updatedUser.streakDays,
    };
  });

  return result;
}
