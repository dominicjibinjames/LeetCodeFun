import { DISTRICTS, DISTRICT_BY_ID, type DistrictDefinition } from "@/data/districts";

export function getDistricts(): DistrictDefinition[] {
  return DISTRICTS;
}

export function getDistrict(id: string): DistrictDefinition | undefined {
  return DISTRICT_BY_ID[id];
}

export { PATTERN_LABELS, ALL_PATTERNS } from "@/data/districts";
