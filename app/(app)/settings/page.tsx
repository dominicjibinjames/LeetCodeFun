import { SettingsPanel } from "./SettingsPanel";
import { isJourneyComplete } from "@/lib/district-progress";
import { userHasGeminiKey } from "@/lib/gemini";
import { resolveActiveJourneyFilters } from "@/lib/journey-filters";
import { prisma } from "@/lib/prisma";
import { DEFAULT_NOTIFY_HOUR, DEFAULT_TIMEZONE, resolveNotifyHour, resolveTimeZone } from "@/lib/user-time";
import { getOptionalUser } from "@/lib/xp";

export default async function SettingsPage() {
  const user = await getOptionalUser();

  if (!user) {
    return (
      <SettingsPanel
        initialProgressiveUnlock
        journeyStarted={false}
        filtersLocked={false}
        journeyComplete={false}
        isGuest
        hasGeminiKey={false}
        pushEnabled={false}
        initialTimezone={DEFAULT_TIMEZONE}
        initialNotifyHour={DEFAULT_NOTIFY_HOUR}
      />
    );
  }

  const filters = await resolveActiveJourneyFilters(user);
  const problems = await prisma.problem.findMany({
    where: { userId: user.id },
    include: { reviewState: true },
  });
  const progress = problems.map((p) => ({
    district: p.district,
    buildingSlot: p.buildingSlot,
    difficulty: p.difficulty,
    state: p.reviewState?.state ?? "unattempted",
  }));
  const journeyComplete = isJourneyComplete(
    progress,
    filters.difficulty,
    filters.track,
    Boolean(user.journeyStartedAt),
  );
  const pushCount = await prisma.pushSubscription.count({ where: { userId: user.id } });

  return (
    <SettingsPanel
      initialProgressiveUnlock={user.progressiveUnlock}
      journeyStarted={Boolean(user.journeyStartedAt)}
      filtersLocked={filters.locked}
      journeyComplete={journeyComplete}
      isGuest={false}
      hasGeminiKey={await userHasGeminiKey(user.id)}
      pushEnabled={pushCount > 0}
      initialTimezone={resolveTimeZone(user.timezone)}
      initialNotifyHour={resolveNotifyHour(user.notifyHourLocal)}
    />
  );
}
