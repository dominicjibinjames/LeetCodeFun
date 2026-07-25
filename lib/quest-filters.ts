import { matchesDifficulty, type DifficultyMode } from "@/lib/difficulty-mode";
import { matchesTrack, type TrackMode } from "@/lib/track-mode";

export function isQuestLocked(
  problem: { difficulty: string; tracks?: string[] },
  difficultyMode: DifficultyMode,
  trackMode: TrackMode,
): boolean {
  return (
    !matchesDifficulty(problem.difficulty, difficultyMode) ||
    !matchesTrack(problem.tracks, trackMode)
  );
}
