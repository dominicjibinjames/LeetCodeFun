import { cache } from "react";
import { resolveActiveJourneyFilters } from "@/lib/journey-filters";
import type { DifficultyMode } from "@/lib/difficulty-mode";
import type { TrackMode } from "@/lib/track-mode";
import { getOptionalUser } from "@/lib/xp";

/** Shared filter resolution for the current request (difficulty + track). */
export const readActiveJourneyFilters = cache(async () => {
  const user = await getOptionalUser();
  if (!user) {
    return {
      difficulty: "all" as DifficultyMode,
      track: "all" as TrackMode,
      locked: false,
      freeRoam: true,
    };
  }
  return resolveActiveJourneyFilters(user);
});

/** Prefer locked journey difficulty when progressive mode is on. */
export async function readDifficultyMode(): Promise<DifficultyMode> {
  const active = await readActiveJourneyFilters();
  return active.difficulty;
}
