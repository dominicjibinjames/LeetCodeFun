import { DebugProvider } from "@/components/debug/DebugProvider";
import { DifficultyProvider } from "@/components/difficulty/DifficultyProvider";
import { TrackProvider } from "@/components/track/TrackProvider";
import { AppShell } from "@/components/ui/AppShell";
import { resolveActiveJourneyFilters } from "@/lib/journey-filters";
import { toPooledDatabaseUrl } from "@/lib/database-url";
import { prisma } from "@/lib/prisma";
import { computeMorale, getOptionalUser, syncReviewStates } from "@/lib/xp";

export const dynamic = "force-dynamic";

function runtimeDbHost(): string {
  try {
    const raw = process.env.DATABASE_URL;
    if (!raw) return "missing";
    return new URL(toPooledDatabaseUrl(raw)).hostname;
  } catch {
    return "parse-error";
  }
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // #region agent log
  const t0 = Date.now();
  // #endregion
  const user = await getOptionalUser();

  if (!user) {
    // #region agent log
    fetch("http://127.0.0.1:7792/ingest/48f6c65e-228d-42ba-b906-d4f53717a7c3", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "9e8e6e",
      },
      body: JSON.stringify({
        sessionId: "9e8e6e",
        runId: "perf",
        hypothesisId: "P",
        location: "layout.tsx:guest",
        message: "app layout guest timing",
        data: { ms: Date.now() - t0 },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
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
    prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        id: true,
        xp: true,
        streakDays: true,
        progressiveUnlock: true,
        journeyStartedAt: true,
        journeyDifficulty: true,
        journeyTrack: true,
        geminiKeyEncrypted: true,
      },
    }),
    prisma.reviewState.findMany({
      where: { userId: user.id },
      select: { state: true },
    }),
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
      select: {
        id: true,
        xp: true,
        streakDays: true,
        progressiveUnlock: true,
        journeyStartedAt: true,
        journeyDifficulty: true,
        journeyTrack: true,
        geminiKeyEncrypted: true,
      },
    });
  }

  const filters = await resolveActiveJourneyFilters(journeyUser);
  const hasGeminiKey = Boolean(fresh.geminiKeyEncrypted);

  // #region agent log
  fetch("http://127.0.0.1:7792/ingest/48f6c65e-228d-42ba-b906-d4f53717a7c3", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "9e8e6e",
    },
    body: JSON.stringify({
      sessionId: "9e8e6e",
      runId: "perf",
      hypothesisId: "P",
      location: "layout.tsx:signed-in",
      message: "app layout signed-in timing",
      data: {
        ms: Date.now() - t0,
        reviewCount: states.length,
        dbHost: runtimeDbHost(),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

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
