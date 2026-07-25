import Link from "next/link";
import { notFound } from "next/navigation";
import { ResetProblemButton } from "@/components/solve/ResetProblemButton";
import { SolveWizard } from "@/components/solve/SolveWizard";
import { SolveWorkspace } from "@/components/solve/SolveWorkspace";
import { guestProblemById, isGuestProblemId } from "@/lib/guest-catalog";
import { prisma } from "@/lib/prisma";
import { getOptionalUser } from "@/lib/xp";

type Props = { params: Promise<{ problemId: string }> };

export default async function ProblemPage({ params }: Props) {
  const { problemId } = await params;
  const user = await getOptionalUser();

  if (!user || isGuestProblemId(problemId)) {
    const guest = guestProblemById(problemId);
    if (!guest) notFound();
    return (
      <div className="space-y-4 w-full max-w-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/district/${guest.district}`}
            className="text-xs font-display text-[var(--ink-muted)] hover:text-[var(--ember)]"
          >
            ← Back to district
          </Link>
        </div>
        <SolveWorkspace problemId={guest.id}>
          <SolveWizard
            isGuest
            problem={{
              id: guest.id,
              title: guest.title,
              statement: guest.statement,
              leetcodeUrl: guest.leetcodeUrl,
              patternPrimary: guest.patternPrimary,
              difficulty: guest.difficulty,
              state: "unattempted",
            }}
          />
        </SolveWorkspace>
      </div>
    );
  }

  // Review sync runs once in app layout (request-cached) — skip here.
  const problem = await prisma.problem.findFirst({
    where: { id: problemId, userId: user.id },
    include: { reviewState: true },
  });
  if (!problem) notFound();

  const state = problem.reviewState?.state ?? "unattempted";

  return (
    <div className="space-y-4 w-full max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/district/${problem.district}`}
          className="text-xs font-display text-[var(--ink-muted)] hover:text-[var(--ember)]"
        >
          ← Back to district
        </Link>
        <ResetProblemButton
          problemId={problem.id}
          problemTitle={problem.title}
          currentState={state}
        />
      </div>
      <SolveWorkspace problemId={problem.id}>
        <SolveWizard
          isGuest={false}
          problem={{
            id: problem.id,
            title: problem.title,
            statement: problem.statement,
            leetcodeUrl: problem.leetcodeUrl,
            patternPrimary: problem.patternPrimary,
            difficulty: problem.difficulty,
            state,
          }}
        />
      </SolveWorkspace>
    </div>
  );
}
