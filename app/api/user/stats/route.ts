import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeMorale, getOrCreateUser, syncReviewStates } from "@/lib/xp";
import { getDistricts } from "@/lib/districts";

export async function GET() {
  const user = await getOrCreateUser();
  await syncReviewStates(user.id);

  const [freshUser, problems, attempts, reviewStates] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
    prisma.problem.findMany({
      where: { userId: user.id },
      include: { reviewState: true },
    }),
    prisma.attempt.findMany({ where: { userId: user.id }, orderBy: { date: "asc" } }),
    prisma.reviewState.findMany({ where: { userId: user.id } }),
  ]);

  const districts = getDistricts().map((d) => {
    const districtProblems = problems.filter((p) => p.district === d.id);
    const states = districtProblems.map((p) => p.reviewState?.state ?? "unattempted");
    const built = states.filter((s) => s === "built").length;
    const fire = states.filter((s) => s === "fire").length;
    const rubble = states.filter((s) => s === "rubble").length;
    const attempted = states.filter((s) => s !== "unattempted").length;
    const mastery = districtProblems.length
      ? built / districtProblems.length
      : 0;

    const districtAttempts = attempts.filter((a) =>
      districtProblems.some((p) => p.id === a.problemId),
    );
    const firstAttempts = new Map<string, (typeof attempts)[number]>();
    for (const a of districtAttempts) {
      if (!firstAttempts.has(a.problemId)) firstAttempts.set(a.problemId, a);
    }
    const firsts = [...firstAttempts.values()];
    const patternAccuracy =
      firsts.length === 0
        ? null
        : firsts.filter((a) => a.wasCorrectPattern).length / firsts.length;

    const withConfidence = districtAttempts.filter(
      (a) => a.wasCorrectPattern !== null && a.confidenceRating != null,
    );
    const calibration =
      withConfidence.length === 0
        ? null
        : withConfidence.reduce((sum, a) => {
            const expected = a.confidenceRating / 5;
            const actual = a.wasCorrectPattern ? 1 : 0;
            return sum + Math.abs(expected - actual);
          }, 0) / withConfidence.length;

    return {
      id: d.id,
      name: d.name,
      total: districtProblems.length,
      built,
      fire,
      rubble,
      attempted,
      mastery,
      patternAccuracy,
      calibrationError: calibration,
      hasSmoke: fire > 0,
    };
  });

  return NextResponse.json({
    user: {
      xp: freshUser.xp,
      streakDays: freshUser.streakDays,
      lastActive: freshUser.lastActive,
    },
    morale: computeMorale(reviewStates),
    districts,
    problemStates: Object.fromEntries(
      problems.map((p) => [p.id, p.reviewState?.state ?? "unattempted"]),
    ),
    problems: problems.map((p) => ({
      id: p.id,
      title: p.title,
      district: p.district,
      buildingSlot: p.buildingSlot,
      patternPrimary: p.patternPrimary,
      difficulty: p.difficulty,
      leetcodeUrl: p.leetcodeUrl,
      state: p.reviewState?.state ?? "unattempted",
      box: p.reviewState?.box ?? 1,
      nextReviewDate: p.reviewState?.nextReviewDate ?? null,
    })),
  });
}
