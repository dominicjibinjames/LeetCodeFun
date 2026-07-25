import catalog from "@/data/problems/catalog.json";
import { matchesTrack, type TrackMode } from "@/lib/track-mode";

type CatalogEntry = {
  buildingSlot: string;
  tracks?: string[];
};

const bySlot = new Map<string, string[]>(
  (catalog as CatalogEntry[]).map((p) => [p.buildingSlot, p.tracks ?? ["full"]]),
);

export function tracksForBuildingSlot(buildingSlot: string): string[] {
  return bySlot.get(buildingSlot) ?? ["full"];
}

export function buildingSlotsForTrack(mode: TrackMode): string[] | null {
  if (mode === "all") return null;
  return (catalog as CatalogEntry[])
    .filter((p) => matchesTrack(p.tracks, mode))
    .map((p) => p.buildingSlot);
}
