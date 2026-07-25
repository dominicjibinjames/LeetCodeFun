export type TrackMode = "beginner" | "experienced" | "all";

export const TRACK_COOKIE = "patterngard-track";
export const TRACK_STORAGE_KEY = "patterngard-track";

export const TRACK_OPTIONS: { value: TrackMode; label: string }[] = [
  { value: "all", label: "All" },
  { value: "beginner", label: "Beginner" },
  { value: "experienced", label: "Experienced" },
];

export function parseTrackMode(raw: string | null | undefined): TrackMode {
  if (raw === "beginner" || raw === "experienced" || raw === "all") {
    return raw;
  }
  return "all";
}

/** Problem is playable when its catalog tracks include the selected roadmap. */
export function matchesTrack(tracks: string[] | undefined, mode: TrackMode): boolean {
  if (mode === "all") return true;
  return (tracks ?? []).includes(mode);
}
