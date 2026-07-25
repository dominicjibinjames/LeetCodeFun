import { resolveActiveJourneyFilters } from "@/lib/journey-filters";
import type { DifficultyMode } from "@/lib/difficulty-mode";
import { getOptionalUser } from "@/lib/xp";

/** Prefer locked journey difficulty when progressive mode is on. */
export async function readDifficultyMode(): Promise<DifficultyMode> {
  const user = await getOptionalUser();
  if (!user) return "all";
  const active = await resolveActiveJourneyFilters(user);
  return active.difficulty;
}
