import { prisma } from "@/lib/prisma";
import { estDayKey, estNoonAnchor } from "@/lib/activity-time";
import { PATHWAY_HORIZON_DAYS } from "@/lib/pathway";

/** ~9:00 America/New_York on the given EST calendar day (matches SRS scheduling feel). */
export function reviewDateForEstDay(dayKey: string): Date {
  const [y, m, d] = dayKey.split("-").map(Number);
  for (const hour of [13, 14, 12, 15, 16]) {
    const candidate = new Date(Date.UTC(y, m - 1, d, hour, 0, 0));
    if (estDayKey(candidate) === dayKey) return candidate;
  }
  return estNoonAnchor(dayKey);
}

function isWithinHorizon(targetDay: string, todayKey: string): boolean {
  let cursor = todayKey;
  for (let i = 0; i < PATHWAY_HORIZON_DAYS; i += 1) {
    if (cursor === targetDay) return true;
    cursor = estDayKey(new Date(estNoonAnchor(cursor).getTime() + 24 * 60 * 60 * 1000));
  }
  return false;
}

/**
 * Move a built (upcoming) review to a different EST day.
 * Fire / rubble / battles cannot be rescheduled this way.
 */
export async function rescheduleBuiltReview(
  userId: string,
  problemId: string,
  targetEstDay: string,
): Promise<{ ok: true; nextReviewDate: string; estDay: string } | { ok: false; error: string; status: number }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetEstDay)) {
    return { ok: false, error: "Invalid date", status: 400 };
  }

  const todayKey = estDayKey();
  if (!isWithinHorizon(targetEstDay, todayKey)) {
    return {
      ok: false,
      error: `Target day must be within the next ${PATHWAY_HORIZON_DAYS} EST days`,
      status: 400,
    };
  }

  const problem = await prisma.problem.findFirst({
    where: { id: problemId, userId },
    include: { reviewState: true },
  });
  if (!problem?.reviewState) {
    return { ok: false, error: "Problem not found", status: 404 };
  }

  const review = problem.reviewState;
  if (review.state !== "built") {
    return {
      ok: false,
      error: "Only scheduled (built) reviews can be moved. Fire, rubble, and battles stay put.",
      status: 400,
    };
  }

  // Must still be upcoming (not already due / about to sync to fire).
  if (review.nextReviewDate.getTime() <= Date.now()) {
    return {
      ok: false,
      error: "This review is already due. Clear it from the queue instead of rescheduling.",
      status: 400,
    };
  }

  const nextReviewDate = reviewDateForEstDay(targetEstDay);
  await prisma.reviewState.update({
    where: { id: review.id },
    data: { nextReviewDate },
  });

  return {
    ok: true,
    nextReviewDate: nextReviewDate.toISOString(),
    estDay: estDayKey(nextReviewDate),
  };
}
