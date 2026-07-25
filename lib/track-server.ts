import { resolveActiveJourneyFilters } from "@/lib/journey-filters";
import type { TrackMode } from "@/lib/track-mode";
import { getOptionalUser } from "@/lib/xp";

/** Prefer locked journey track when progressive mode is on. */
export async function readTrackMode(): Promise<TrackMode> {
  const user = await getOptionalUser();
  if (!user) return "all";
  const active = await resolveActiveJourneyFilters(user);
  return active.track;
}
