import { cookies } from "next/headers";
import {
  DIFFICULTY_COOKIE,
  parseDifficultyMode,
  type DifficultyMode,
} from "@/lib/difficulty-mode";
import {
  TRACK_COOKIE,
  parseTrackMode,
  type TrackMode,
} from "@/lib/track-mode";

export type JourneyFilterUser = {
  progressiveUnlock: boolean;
  journeyStartedAt: Date | null | undefined;
  journeyDifficulty: string | null | undefined;
  journeyTrack: string | null | undefined;
};

export type ActiveJourneyFilters = {
  difficulty: DifficultyMode;
  track: TrackMode;
  /** Header/settings cannot change filters (progressive journey in progress). */
  locked: boolean;
  freeRoam: boolean;
};

/** Cookie values — free-roam / pre-journey preference. */
export async function readCookieFilters(): Promise<{
  difficulty: DifficultyMode;
  track: TrackMode;
}> {
  const jar = await cookies();
  return {
    difficulty: parseDifficultyMode(jar.get(DIFFICULTY_COOKIE)?.value),
    track: parseTrackMode(jar.get(TRACK_COOKIE)?.value),
  };
}

/**
 * Progressive + journey started → locked to saved journey filters.
 * Free roam (!progressiveUnlock) → cookies, freely choosable from the header.
 * Pre-journey with progressive on → display-only until the start popup.
 */
export async function resolveActiveJourneyFilters(
  user: JourneyFilterUser,
): Promise<ActiveJourneyFilters> {
  const cookiesFilters = await readCookieFilters();
  const freeRoam = !user.progressiveUnlock;
  const journeyStarted = Boolean(user.journeyStartedAt);

  // Free roam is the only mode that unlocks header filter switching.
  if (freeRoam) {
    return {
      difficulty: cookiesFilters.difficulty,
      track: cookiesFilters.track,
      locked: false,
      freeRoam: true,
    };
  }

  // Progressive mode: always lock the chooser (show journey badges once started).
  return {
    difficulty: journeyStarted
      ? parseDifficultyMode(user.journeyDifficulty ?? cookiesFilters.difficulty)
      : cookiesFilters.difficulty,
    track: journeyStarted
      ? parseTrackMode(user.journeyTrack ?? cookiesFilters.track)
      : cookiesFilters.track,
    locked: true,
    freeRoam: false,
  };
}
