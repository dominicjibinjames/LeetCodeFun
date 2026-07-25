import catalog from "@/data/problems/catalog.json";

export type CatalogProblem = {
  title: string;
  slug: string;
  difficulty: string;
  districtId: string;
  patternPrimary: string;
  buildingSlot: string;
  statement: string;
};

export function getCatalog(): CatalogProblem[] {
  return catalog as CatalogProblem[];
}

export function getCatalogByDistrict(districtId: string): CatalogProblem[] {
  return getCatalog().filter((p) => p.districtId === districtId);
}

export function leetcodeUrl(slug: string): string {
  return `https://leetcode.com/problems/${slug}/`;
}
