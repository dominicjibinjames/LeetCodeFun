import { KINGDOM_POLYGONS, polygonBounds } from "./kingdom-polygons";

export type BuildingSlot = {
  slot: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type DistrictDefinition = {
  id: string;
  name: string;
  biome: string;
  patterns: string[];
  image: string;
  /** Percentage-based AABB (derived from polygon; useful for labels/tooling) */
  kingdomRegion: { x: number; y: number; w: number; h: number };
  /** Irregular outline on the kingdom map (%, viewBox 0–100) */
  kingdomPolygon: [number, number][];
  buildings: BuildingSlot[];
};

function slots(
  prefix: string,
  count: number,
  layout: Array<[number, number]> = [],
): BuildingSlot[] {
  const defaults: Array<[number, number]> = [
    [12, 28],
    [28, 42],
    [44, 22],
    [58, 48],
    [72, 30],
    [18, 62],
    [38, 68],
    [55, 70],
    [70, 58],
    [82, 72],
    [8, 48],
    [48, 52],
    [65, 18],
    [85, 40],
    [30, 18],
    [50, 38],
  ];
  const positions = layout.length >= count ? layout : defaults;
  return Array.from({ length: count }, (_, i) => {
    const [x, y] = positions[i] ?? [10 + (i % 5) * 16, 20 + Math.floor(i / 5) * 22];
    return { slot: `${prefix}_${i + 1}`, x, y, w: 10, h: 14 };
  });
}

function withPolygon(
  id: string,
  rest: Omit<DistrictDefinition, "id" | "kingdomPolygon" | "kingdomRegion">,
): DistrictDefinition {
  const kingdomPolygon = KINGDOM_POLYGONS[id];
  if (!kingdomPolygon) {
    throw new Error(`Missing kingdom polygon for district: ${id}`);
  }
  return {
    id,
    ...rest,
    kingdomPolygon,
    kingdomRegion: polygonBounds(kingdomPolygon),
  };
}

export const DISTRICTS: DistrictDefinition[] = [
  withPolygon("central_farmlands", {
    name: "Central Farmlands",
    biome: "Farmland village near castle",
    patterns: ["arrays_hashing", "prefix_sum"],
    image: "/art/districts/central-farmlands.png",
    buildings: slots("farm", 15, [
      [15, 35], [30, 45], [48, 30], [62, 50], [78, 35],
      [20, 65], [40, 70], [55, 62], [70, 72], [85, 58],
      [10, 50], [50, 48],
    ]),
  }),
  withPolygon("twin_rivers", {
    name: "Twin Rivers",
    biome: "Converging rivers",
    patterns: ["two_pointers", "stack"],
    image: "/art/districts/twin-rivers.png",
    buildings: slots("river", 12, [
      [12, 40], [28, 55], [42, 35], [55, 60], [70, 40],
      [18, 70], [35, 25], [60, 28], [78, 55], [85, 70],
    ]),
  }),
  withPolygon("windmill_vale", {
    name: "Windmill Vale",
    biome: "Rolling hills with windmills",
    patterns: ["sliding_window"],
    image: "/art/districts/windmill-vale.png",
    buildings: slots("windmill", 11, [
      [14, 38], [32, 52], [48, 28], [62, 48], [78, 32],
      [22, 68], [45, 70], [68, 65], [82, 55],
    ]),
  }),
  withPolygon("stepping_stone_causeway", {
    name: "Stepping Stone Causeway",
    biome: "Chained islets",
    patterns: ["linked_list"],
    image: "/art/districts/stepping-stone-causeway.png",
    buildings: slots("isle", 18, [
      [8, 45], [20, 55], [32, 40], [44, 58], [56, 42],
      [68, 55], [80, 40], [18, 70], [50, 72], [75, 68],
    ]),
  }),
  withPolygon("iron_peaks_switchbacks", {
    name: "Iron Peaks Switchbacks",
    biome: "Mountain foothill switchbacks",
    patterns: ["binary_search"],
    image: "/art/districts/iron-peaks-switchbacks.png",
    buildings: slots("peak", 11, [
      [20, 55], [35, 40], [50, 28], [65, 42], [78, 30],
      [40, 65], [70, 60],
    ]),
  }),
  withPolygon("whispering_jungle", {
    name: "Whispering Jungle",
    biome: "Jungle isle",
    patterns: ["trees_dfs_bfs"],
    image: "/art/districts/whispering-jungle.png",
    buildings: slots("jungle", 25, [
      [10, 30], [25, 45], [40, 25], [55, 40], [70, 28],
      [15, 60], [30, 70], [48, 58], [62, 68], [78, 55],
      [85, 35], [8, 48], [38, 48], [58, 22], [72, 72], [88, 65],
    ]),
  }),
  withPolygon("scholars_quarter", {
    name: "Scholar's Quarter",
    biome: "Market-adjacent library",
    patterns: ["tries", "backtracking"],
    image: "/art/districts/scholars-quarter.png",
    buildings: slots("scholar", 25, [
      [25, 40], [50, 55], [72, 38],
    ]),
  }),
  withPolygon("sentinel_heights", {
    name: "Sentinel Heights",
    biome: "Hilltop watchtowers",
    patterns: ["heaps"],
    image: "/art/districts/sentinel-heights.png",
    buildings: slots("sentinel", 13, [
      [18, 45], [38, 30], [55, 50], [72, 28], [85, 48], [45, 68],
    ]),
  }),
  withPolygon("archipelago_straits", {
    name: "Archipelago Straits",
    biome: "Coastal islands",
    patterns: ["graphs"],
    image: "/art/districts/archipelago-straits.png",
    buildings: slots("archipelago", 9, [
      [12, 40], [30, 55], [48, 35], [62, 58], [78, 42],
      [22, 70], [70, 70],
    ]),
  }),
  withPolygon("shrouded_highlands", {
    name: "Shrouded Highlands",
    biome: "Misty terraced mountains",
    patterns: ["dynamic_programming"],
    image: "/art/districts/shrouded-highlands.png",
    buildings: slots("highland", 18, [
      [12, 55], [28, 40], [42, 30], [55, 48], [68, 28],
      [80, 42], [18, 70], [35, 65], [52, 72], [70, 62],
      [88, 55], [8, 35], [60, 18],
    ]),
  }),
  withPolygon("market_row", {
    name: "Market Row",
    biome: "Merchant street",
    patterns: ["greedy", "intervals"],
    image: "/art/districts/market-row.png",
    buildings: slots("market", 10, [
      [10, 45], [28, 55], [45, 40], [60, 58], [75, 42],
      [35, 70], [70, 68],
    ]),
  }),
  withPolygon("terraced_fields", {
    name: "Terraced Fields",
    biome: "Walled grid farmland",
    patterns: ["matrix"],
    image: "/art/districts/terraced-fields.png",
    buildings: slots("terrace", 7, [
      [18, 40], [38, 55], [55, 35], [72, 50], [45, 70],
    ]),
  }),
  withPolygon("tinkerers_forge", {
    name: "Tinkerer's Forge",
    biome: "Mining workshop",
    patterns: ["bit_manipulation"],
    image: "/art/districts/tinkerers-forge.png",
    buildings: slots("forge", 5, [
      [22, 45], [45, 35], [65, 50], [78, 40],
    ]),
  }),
];

export const DISTRICT_BY_ID = Object.fromEntries(
  DISTRICTS.map((d) => [d.id, d]),
) as Record<string, DistrictDefinition>;

export const PATTERN_LABELS: Record<string, string> = {
  arrays_hashing: "Arrays & Hashing",
  prefix_sum: "Prefix Sum",
  two_pointers: "Two Pointers",
  stack: "Stack",
  sliding_window: "Sliding Window",
  linked_list: "Linked List",
  binary_search: "Binary Search",
  trees_dfs_bfs: "Trees — DFS/BFS",
  tries: "Tries",
  heaps: "Heaps / Priority Queue",
  graphs: "Graphs",
  dynamic_programming: "Dynamic Programming",
  greedy: "Greedy",
  intervals: "Intervals",
  matrix: "Matrix",
  bit_manipulation: "Bit Manipulation",
  backtracking: "Backtracking",
};

export const ALL_PATTERNS = Object.keys(PATTERN_LABELS);
