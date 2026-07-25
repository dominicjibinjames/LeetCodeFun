import { MasteryTable } from "@/components/dashboard/MasteryTable";
import { prisma } from "@/lib/prisma";
import { getDistricts } from "@/lib/districts";
import { getOptionalUser, syncReviewStates } from "@/lib/xp";

export default async function MasteryPage() {
  const user = await getOptionalUser();
  if (!user) {
    return (
      <div className="space-y-4 max-w-xl">
        <h1 className="text-3xl font-display">Mastery</h1>
        <p className="text-sm text-[var(--ink-muted)]">
          Sign in to track pattern mastery across districts.
        </p>
        <a href="/login" className="btn-primary inline-block">
          Sign in
        </a>
      </div>
    );
  }
  await syncReviewStates(user.id);

  const [problems, attempts] = await Promise.all([
    prisma.problem.findMany({
      where: { userId: user.id },
      include: { reviewState: true },
    }),
    prisma.attempt.findMany({ where: { userId: user.id }, orderBy: { date: "asc" } }),
  ]);

  const districts = getDistricts().map((d) => {
    const districtProblems = problems.filter((p) => p.district === d.id);
    const states = districtProblems.map((p) => p.reviewState?.state ?? "unattempted");
    const built = states.filter((s) => s === "built").length;
    const fire = states.filter((s) => s === "fire").length;
    const rubble = states.filter((s) => s === "rubble").length;

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

    const withConfidence = districtAttempts.filter((a) => a.wasCorrectPattern !== null);
    const calibrationError =
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
      mastery: districtProblems.length ? built / districtProblems.length : 0,
      patternAccuracy,
      calibrationError,
    };
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-display">Mastery Map</h1>
        <p className="text-sm text-[var(--ink-muted)] mt-1">
          Pattern accuracy and confidence calibration by district — weakest first.
        </p>
      </div>
      <MasteryTable districts={districts} />
    </div>
  );
}
