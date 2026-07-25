export type DifficultyMode = "easy" | "medium" | "hard" | "all";

export const DIFFICULTY_COOKIE = "patterngard-difficulty";
export const DIFFICULTY_STORAGE_KEY = "patterngard-difficulty";

export const DIFFICULTY_OPTIONS: { value: DifficultyMode; label: string }[] = [
  { value: "all", label: "All" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

export function parseDifficultyMode(raw: string | null | undefined): DifficultyMode {
  if (raw === "easy" || raw === "medium" || raw === "hard" || raw === "all") {
    return raw;
  }
  return "all";
}

export function matchesDifficulty(
  problemDifficulty: string,
  mode: DifficultyMode,
): boolean {
  if (mode === "all") return true;
  return problemDifficulty.toLowerCase() === mode;
}
