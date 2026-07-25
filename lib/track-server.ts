import type { TrackMode } from "@/lib/track-mode";
import { readActiveJourneyFilters } from "@/lib/difficulty-server";

/** Prefer locked journey track when progressive mode is on. */
export async function readTrackMode(): Promise<TrackMode> {
  const active = await readActiveJourneyFilters();
  return active.track;
}
