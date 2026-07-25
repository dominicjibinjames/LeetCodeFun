import { DISTRICTS } from "@/data/districts";
import { tracksForBuildingSlot } from "@/lib/catalog-tracks";
import { matchesDifficulty, type DifficultyMode } from "@/lib/difficulty-mode";
import { matchesTrack, type TrackMode } from "@/lib/track-mode";

export type ProgressProblem = {
  district: string;
  buildingSlot: string;
  difficulty: string;
  state: string;
};

export function districtUnlockOrder(): string[] {
  return DISTRICTS.map((d) => d.id);
}

/** District is complete when every filter-matching problem is built (or none match). */
export function isDistrictComplete(
  districtId: string,
  problems: ProgressProblem[],
  difficultyMode: DifficultyMode,
  trackMode: TrackMode,
): boolean {
  const matching = problems.filter((p) => {
    if (p.district !== districtId) return false;
    return (
      matchesDifficulty(p.difficulty, difficultyMode) &&
      matchesTrack(tracksForBuildingSlot(p.buildingSlot), trackMode)
    );
  });
  if (matching.length === 0) return true;
  return matching.every((p) => p.state === "built");
}

export function unlockedDistrictIds(
  problems: ProgressProblem[],
  difficultyMode: DifficultyMode,
  trackMode: TrackMode,
  progressiveUnlock: boolean,
  journeyStarted: boolean,
): Set<string> {
  const order = districtUnlockOrder();
  if (!journeyStarted) {
    return new Set();
  }
  if (!progressiveUnlock) {
    return new Set(order);
  }

  const unlocked = new Set<string>();
  for (const id of order) {
    const prior = order.slice(0, order.indexOf(id));
    const priorsDone = prior.every((pid) =>
      isDistrictComplete(pid, problems, difficultyMode, trackMode),
    );
    if (priorsDone) unlocked.add(id);
    else break;
  }
  return unlocked;
}

export function isDistrictUnlocked(
  districtId: string,
  unlocked: Set<string>,
): boolean {
  return unlocked.has(districtId);
}

/** All districts finished under the current journey filters. */
export function isJourneyComplete(
  problems: ProgressProblem[],
  difficultyMode: DifficultyMode,
  trackMode: TrackMode,
  journeyStarted: boolean,
): boolean {
  if (!journeyStarted) return false;
  return districtUnlockOrder().every((id) =>
    isDistrictComplete(id, problems, difficultyMode, trackMode),
  );
}
