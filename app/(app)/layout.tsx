import { DebugProvider } from "@/components/debug/DebugProvider";
import { DifficultyProvider } from "@/components/difficulty/DifficultyProvider";
import { TrackProvider } from "@/components/track/TrackProvider";
import { AppShell } from "@/components/ui/AppShell";
import { resolveActiveJourneyFilters } from "@/lib/journey-filters";
import { prisma } from "@/lib/prisma";
import { getUserProblemProgress } from "@/lib/user-progress";
import { computeMorale, getOptionalUser, syncReviewStates } from "@/lib/xp";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getOptionalUser();

  if (!user) {
    return (
      <DebugProvider>
        <DifficultyProvider initialMode="all" locked={false}>
          <TrackProvider initialMode="all" locked={false}>
            <AppShell
              xp={0}
              streakDays={0}
              morale={1}
              progressiveUnlock={true}
              filtersLocked={false}
              isGuest
              hasGeminiKey={false}
            >
              {children}
            </AppShell>
          </TrackProvider>
        </DifficultyProvider>
      </DebugProvider>
    );
  }

  if (user.journeyStartedAt) {
    await syncReviewStates(user.id);
  }

  // Shared with kingdom page via React cache — one progress query per request.
  const problems = await getUserProblemProgress(user.id);
  const states = problems
    .map((p) => p.reviewState)
    .filter((s): s is { state: string } => Boolean(s));

  let journeyUser = user;
  if (
    user.journeyStartedAt &&
    user.progressiveUnlock &&
    (!user.journeyDifficulty || !user.journeyTrack)
  ) {
    const active = await resolveActiveJourneyFilters(user);
    journeyUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        journeyDifficulty: user.journeyDifficulty ?? active.difficulty,
        journeyTrack: user.journeyTrack ?? active.track,
      },
    });
  }

  const filters = await resolveActiveJourneyFilters(journeyUser);
  const hasGeminiKey = Boolean(user.geminiKeyEncrypted);

  return (
    <DebugProvider>
      <DifficultyProvider initialMode={filters.difficulty} locked={filters.locked}>
        <TrackProvider initialMode={filters.track} locked={filters.locked}>
          <AppShell
            xp={journeyUser.xp}
            streakDays={journeyUser.streakDays}
            morale={computeMorale(states)}
            progressiveUnlock={journeyUser.progressiveUnlock}
            filtersLocked={filters.locked}
            isGuest={false}
            hasGeminiKey={hasGeminiKey}
          >
            {children}
          </AppShell>
        </TrackProvider>
      </DifficultyProvider>
    </DebugProvider>
  );
}
