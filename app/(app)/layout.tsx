import { DebugProvider } from "@/components/debug/DebugProvider";
import { DifficultyProvider } from "@/components/difficulty/DifficultyProvider";
import { TrackProvider } from "@/components/track/TrackProvider";
import { AppShell } from "@/components/ui/AppShell";
import { resolveActiveJourneyFilters } from "@/lib/journey-filters";
import { userHasGeminiKey } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";
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

  await syncReviewStates(user.id);
  const [fresh, states] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: user.id } }),
    prisma.reviewState.findMany({ where: { userId: user.id } }),
  ]);

  let journeyUser = fresh;
  if (
    fresh.journeyStartedAt &&
    fresh.progressiveUnlock &&
    (!fresh.journeyDifficulty || !fresh.journeyTrack)
  ) {
    const active = await resolveActiveJourneyFilters(fresh);
    journeyUser = await prisma.user.update({
      where: { id: fresh.id },
      data: {
        journeyDifficulty: fresh.journeyDifficulty ?? active.difficulty,
        journeyTrack: fresh.journeyTrack ?? active.track,
      },
    });
  }

  const filters = await resolveActiveJourneyFilters(journeyUser);
  const hasGeminiKey = await userHasGeminiKey(fresh.id);

  return (
    <DebugProvider>
      <DifficultyProvider initialMode={filters.difficulty} locked={filters.locked}>
        <TrackProvider initialMode={filters.track} locked={filters.locked}>
          <AppShell
            xp={fresh.xp}
            streakDays={fresh.streakDays}
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
