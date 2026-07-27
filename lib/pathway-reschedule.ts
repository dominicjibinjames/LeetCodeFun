import { prisma } from "@/lib/prisma";
import { dayKey, dayNoonAnchor } from "@/lib/activity-time";
import { PATHWAY_HORIZON_DAYS } from "@/lib/pathway";
import { getUserTimeZone } from "@/lib/user-time";

/** ~9:00 local on the given calendar day in `timeZone` (matches SRS scheduling feel). */
export function reviewDateForDay(dayKeyStr: string, timeZone: string): Date {
  const [y, m, d] = dayKeyStr.split("-").map(Number);
  for (const hour of [13, 14, 12, 15, 16, 11, 17, 10, 18, 9, 19]) {
    const candidate = new Date(Date.UTC(y, m - 1, d, hour, 0, 0));
    if (dayKey(candidate, timeZone) === dayKeyStr) {
      const hourPart = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour: "numeric",
        hourCycle: "h23",
      })
        .formatToParts(candidate)
        .find((p) => p.type === "hour")?.value;
      const localH = Number(hourPart);
      if (localH >= 8 && localH <= 10) return candidate;
    }
  }
  return dayNoonAnchor(dayKeyStr, timeZone);
}

/** @deprecated Prefer reviewDateForDay(dayKey, timeZone). */
export function reviewDateForEstDay(dayKeyStr: string): Date {
  return reviewDateForDay(dayKeyStr, "America/New_York");
}

function isWithinHorizon(
  targetDay: string,
  todayKey: string,
  timeZone: string,
): boolean {
  let cursor = todayKey;
  for (let i = 0; i < PATHWAY_HORIZON_DAYS; i += 1) {
    if (cursor === targetDay) return true;
    cursor = dayKey(
      new Date(dayNoonAnchor(cursor, timeZone).getTime() + 24 * 60 * 60 * 1000),
      timeZone,
    );
  }
  return false;
}

/**
 * Move a built (upcoming) review to a different local calendar day.
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

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "User not found", status: 404 };
  const tz = getUserTimeZone(user);
  const todayKey = dayKey(new Date(), tz);
  if (!isWithinHorizon(targetEstDay, todayKey, tz)) {
    return {
      ok: false,
      error: `Target day must be within the next ${PATHWAY_HORIZON_DAYS} days`,
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

  const nextReviewDate = reviewDateForDay(targetEstDay, tz);
  await prisma.reviewState.update({
    where: { id: review.id },
    data: { nextReviewDate },
  });

  return {
    ok: true,
    nextReviewDate: nextReviewDate.toISOString(),
    estDay: dayKey(nextReviewDate, tz),
  };
}
