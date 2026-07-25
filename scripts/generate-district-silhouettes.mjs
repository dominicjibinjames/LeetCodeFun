/**
 * Generates building silhouette polygons + slot layouts from landmark estimates.
 * Run: node scripts/generate-district-silhouettes.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

/** @typedef {[number, number]} Point */

function round(n) {
  return Math.round(n * 10) / 10;
}

/** @returns {Point[]} */
function shapePoly(cx, cy, w, h, shape) {
  const hw = w / 2;
  const hh = h / 2;
  switch (shape) {
    case "tower":
      return [
        [cx - hw * 0.55, cy + hh * 0.85],
        [cx - hw * 0.55, cy - hh * 0.15],
        [cx - hw * 0.35, cy - hh * 0.35],
        [cx, cy - hh],
        [cx + hw * 0.35, cy - hh * 0.35],
        [cx + hw * 0.55, cy - hh * 0.15],
        [cx + hw * 0.55, cy + hh * 0.85],
      ].map(([x, y]) => [round(x), round(y)]);
    case "mill":
      return [
        [cx - hw * 0.4, cy + hh * 0.8],
        [cx - hw * 0.45, cy - hh * 0.1],
        [cx - hw * 0.2, cy - hh * 0.55],
        [cx, cy - hh],
        [cx + hw * 0.25, cy - hh * 0.5],
        [cx + hw * 0.85, cy - hh * 0.15],
        [cx + hw * 0.9, cy + hh * 0.15],
        [cx + hw * 0.55, cy + hh * 0.35],
        [cx + hw * 0.45, cy + hh * 0.85],
      ].map(([x, y]) => [round(x), round(y)]);
    case "barn":
      return [
        [cx - hw, cy + hh * 0.7],
        [cx - hw, cy - hh * 0.2],
        [cx - hw * 0.2, cy - hh],
        [cx + hw * 0.2, cy - hh],
        [cx + hw, cy - hh * 0.2],
        [cx + hw, cy + hh * 0.7],
      ].map(([x, y]) => [round(x), round(y)]);
    case "hut":
      return [
        [cx - hw * 0.7, cy + hh * 0.7],
        [cx - hw * 0.85, cy + hh * 0.1],
        [cx - hw * 0.4, cy - hh * 0.55],
        [cx, cy - hh],
        [cx + hw * 0.4, cy - hh * 0.55],
        [cx + hw * 0.85, cy + hh * 0.1],
        [cx + hw * 0.7, cy + hh * 0.7],
      ].map(([x, y]) => [round(x), round(y)]);
    case "dock":
      return [
        [cx - hw, cy - hh * 0.3],
        [cx + hw * 0.3, cy - hh * 0.5],
        [cx + hw, cy - hh * 0.1],
        [cx + hw * 0.85, cy + hh * 0.6],
        [cx - hw * 0.7, cy + hh * 0.7],
      ].map(([x, y]) => [round(x), round(y)]);
    case "treehouse":
      return [
        [cx - hw * 0.5, cy + hh * 0.8],
        [cx - hw * 0.35, cy + hh * 0.1],
        [cx - hw, cy - hh * 0.2],
        [cx - hw * 0.3, cy - hh],
        [cx + hw * 0.4, cy - hh * 0.85],
        [cx + hw, cy - hh * 0.15],
        [cx + hw * 0.45, cy + hh * 0.15],
        [cx + hw * 0.4, cy + hh * 0.8],
      ].map(([x, y]) => [round(x), round(y)]);
    case "ruin":
      return [
        [cx - hw * 0.9, cy + hh * 0.75],
        [cx - hw, cy - hh * 0.1],
        [cx - hw * 0.5, cy - hh * 0.7],
        [cx - hw * 0.1, cy - hh],
        [cx + hw * 0.35, cy - hh * 0.55],
        [cx + hw * 0.55, cy - hh * 0.9],
        [cx + hw, cy - hh * 0.2],
        [cx + hw * 0.85, cy + hh * 0.7],
      ].map(([x, y]) => [round(x), round(y)]);
    case "bridge":
      return [
        [cx - hw, cy + hh * 0.2],
        [cx - hw * 0.6, cy - hh * 0.5],
        [cx, cy - hh],
        [cx + hw * 0.6, cy - hh * 0.5],
        [cx + hw, cy + hh * 0.2],
        [cx + hw * 0.7, cy + hh * 0.6],
        [cx - hw * 0.7, cy + hh * 0.6],
      ].map(([x, y]) => [round(x), round(y)]);
    case "house":
    default:
      return [
        [cx - hw * 0.85, cy + hh * 0.75],
        [cx - hw * 0.85, cy - hh * 0.05],
        [cx - hw * 0.15, cy - hh],
        [cx + hw * 0.15, cy - hh],
        [cx + hw * 0.85, cy - hh * 0.05],
        [cx + hw * 0.85, cy + hh * 0.75],
      ].map(([x, y]) => [round(x), round(y)]);
  }
}

/** Landmarks from art review (cx/cy/w/h in %). Keep central_farmlands hand-traced. */
const LANDMARKS = {
  twin_rivers: [
    { slot: "river_1", landmark: "Northwest Watchtower", cx: 18, cy: 16, w: 7, h: 14, shape: "tower" },
    { slot: "river_2", landmark: "Watermill", cx: 28, cy: 30, w: 12, h: 14, shape: "mill" },
    { slot: "river_3", landmark: "Forest Cottage", cx: 48, cy: 16, w: 9, h: 10, shape: "house" },
    { slot: "river_4", landmark: "Northeast Watchtower", cx: 74, cy: 18, w: 7, h: 14, shape: "tower" },
    { slot: "river_5", landmark: "Stone Chapel", cx: 22, cy: 48, w: 12, h: 16, shape: "house" },
    { slot: "river_6", landmark: "River Island Tower", cx: 50, cy: 44, w: 7, h: 14, shape: "tower" },
    { slot: "river_7", landmark: "Red-Roof Manor", cx: 62, cy: 48, w: 12, h: 14, shape: "house" },
    { slot: "river_8", landmark: "Cliff Watchtower", cx: 84, cy: 52, w: 7, h: 14, shape: "tower" },
    { slot: "river_9", landmark: "Thatched Dock House", cx: 16, cy: 76, w: 11, h: 12, shape: "house" },
    { slot: "river_10", landmark: "Harbor Warehouse", cx: 76, cy: 78, w: 14, h: 12, shape: "dock" },
  ],
  windmill_vale: [
    { slot: "windmill_1", landmark: "Hilltop Windmill", cx: 18, cy: 18, w: 10, h: 16, shape: "mill" },
    { slot: "windmill_2", landmark: "Garden Farmhouse", cx: 48, cy: 16, w: 11, h: 12, shape: "house" },
    { slot: "windmill_3", landmark: "Red Barn", cx: 72, cy: 22, w: 13, h: 12, shape: "barn" },
    { slot: "windmill_4", landmark: "Cliff Windmill", cx: 86, cy: 18, w: 9, h: 14, shape: "mill" },
    { slot: "windmill_5", landmark: "Flower Cottage", cx: 16, cy: 48, w: 10, h: 11, shape: "house" },
    { slot: "windmill_6", landmark: "Pond Watermill", cx: 48, cy: 48, w: 13, h: 14, shape: "mill" },
    { slot: "windmill_7", landmark: "Hay Shed", cx: 18, cy: 74, w: 11, h: 10, shape: "barn" },
    { slot: "windmill_8", landmark: "Walled Chapel", cx: 42, cy: 72, w: 12, h: 13, shape: "house" },
    { slot: "windmill_9", landmark: "Thatched Round Hut", cx: 78, cy: 76, w: 10, h: 11, shape: "hut" },
  ],
  scholars_quarter: [
    { slot: "scholar_1", landmark: "Great Domed Hall", cx: 42, cy: 28, w: 18, h: 20, shape: "house" },
    { slot: "scholar_2", landmark: "Clock Tower", cx: 78, cy: 22, w: 8, h: 20, shape: "tower" },
    { slot: "scholar_3", landmark: "Gothic Library", cx: 72, cy: 52, w: 14, h: 16, shape: "house" },
  ],
  tinkerers_forge: [
    { slot: "forge_1", landmark: "Dome Smeltery", cx: 22, cy: 28, w: 14, h: 16, shape: "ruin" },
    { slot: "forge_2", landmark: "Timber Workshop", cx: 72, cy: 26, w: 16, h: 14, shape: "barn" },
    { slot: "forge_3", landmark: "Central Furnace", cx: 42, cy: 48, w: 12, h: 18, shape: "tower" },
    { slot: "forge_4", landmark: "Lower Foundry", cx: 72, cy: 72, w: 12, h: 14, shape: "hut" },
  ],
  stepping_stone_causeway: [
    { slot: "isle_1", landmark: "Blue Watchtower", cx: 12, cy: 20, w: 8, h: 16, shape: "tower" },
    { slot: "isle_2", landmark: "Thatched Cottage", cx: 32, cy: 23, w: 10, h: 12, shape: "house" },
    { slot: "isle_3", landmark: "Lookout Scaffold", cx: 50, cy: 16, w: 8, h: 14, shape: "tower" },
    { slot: "isle_4", landmark: "Red Spire House", cx: 68, cy: 18, w: 8, h: 13, shape: "tower" },
    { slot: "isle_5", landmark: "Log Fortress", cx: 27, cy: 52, w: 12, h: 14, shape: "generic" },
    { slot: "isle_6", landmark: "Crane Depot", cx: 50, cy: 40, w: 11, h: 14, shape: "generic" },
    { slot: "isle_7", landmark: "Round Thatched Hut", cx: 84, cy: 40, w: 10, h: 12, shape: "hut" },
    { slot: "isle_8", landmark: "Dockside Workshop", cx: 15, cy: 72, w: 12, h: 14, shape: "house" },
    { slot: "isle_9", landmark: "Red Pavilion", cx: 47, cy: 70, w: 9, h: 12, shape: "generic" },
    { slot: "isle_10", landmark: "Tree-Side Blue Tower", cx: 68, cy: 60, w: 9, h: 16, shape: "tower" },
  ],
  iron_peaks_switchbacks: [
    { slot: "peak_1", landmark: "Summit Sentry", cx: 37, cy: 12, w: 6, h: 13, shape: "tower" },
    { slot: "peak_2", landmark: "High Sanctum", cx: 68, cy: 18, w: 10, h: 14, shape: "generic" },
    { slot: "peak_3", landmark: "Cliffside Cabin", cx: 31, cy: 40, w: 9, h: 10, shape: "house" },
    { slot: "peak_4", landmark: "Iron Maw Mine", cx: 50, cy: 52, w: 9, h: 10, shape: "generic" },
    { slot: "peak_5", landmark: "Mid-Pass Tower", cx: 80, cy: 50, w: 6, h: 14, shape: "tower" },
    { slot: "peak_6", landmark: "Wayfarer's Spire", cx: 52, cy: 74, w: 5, h: 13, shape: "tower" },
    { slot: "peak_7", landmark: "Trailhead Lodge", cx: 78, cy: 74, w: 12, h: 14, shape: "house" },
  ],
  whispering_jungle: [
    { slot: "jungle_1", landmark: "High Canopy Treehouse", cx: 23, cy: 16, w: 8, h: 9, shape: "treehouse" },
    { slot: "jungle_2", landmark: "Low Canopy Treehouse", cx: 19, cy: 33, w: 7, h: 9, shape: "treehouse" },
    { slot: "jungle_3", landmark: "Mid Branch Treehouse", cx: 32, cy: 24, w: 7, h: 8, shape: "treehouse" },
    { slot: "jungle_4", landmark: "Great Ancient Temple", cx: 50, cy: 20, w: 11, h: 16, shape: "ruin" },
    { slot: "jungle_5", landmark: "Mossy Stone Arch", cx: 11, cy: 38, w: 6, h: 10, shape: "ruin" },
    { slot: "jungle_6", landmark: "Guardian Head Fountain", cx: 35, cy: 46, w: 10, h: 13, shape: "ruin" },
    { slot: "jungle_7", landmark: "Central Tree Observatory", cx: 52, cy: 56, w: 11, h: 12, shape: "treehouse" },
    { slot: "jungle_8", landmark: "Cliffside Green Villa", cx: 16, cy: 62, w: 12, h: 13, shape: "treehouse" },
    { slot: "jungle_9", landmark: "Pillar Lookout Hut", cx: 33, cy: 69, w: 6, h: 10, shape: "hut" },
    { slot: "jungle_10", landmark: "Basecamp Hut", cx: 53, cy: 84, w: 8, h: 8, shape: "hut" },
    { slot: "jungle_11", landmark: "Broken Watchtower", cx: 69, cy: 44, w: 7, h: 12, shape: "ruin" },
    { slot: "jungle_12", landmark: "Northeast Treehouse", cx: 71, cy: 17, w: 7, h: 9, shape: "treehouse" },
    { slot: "jungle_13", landmark: "East Branch Treehouse", cx: 82, cy: 28, w: 7, h: 9, shape: "treehouse" },
    { slot: "jungle_14", landmark: "Hidden Canopy Hut", cx: 41, cy: 26, w: 5, h: 6, shape: "treehouse" },
    { slot: "jungle_15", landmark: "Domed Stone Ruins", cx: 80, cy: 59, w: 11, h: 15, shape: "ruin" },
    { slot: "jungle_16", landmark: "Sunken Gateway", cx: 73, cy: 78, w: 8, h: 10, shape: "ruin" },
  ],
  sentinel_heights: [
    { slot: "sentinel_1", landmark: "High Sentinel Citadel", cx: 50, cy: 20, w: 14, h: 22, shape: "tower" },
    { slot: "sentinel_2", landmark: "Western Watchtower", cx: 15, cy: 30, w: 7, h: 18, shape: "tower" },
    { slot: "sentinel_3", landmark: "East Peak Keep", cx: 72, cy: 32, w: 10, h: 16, shape: "tower" },
    { slot: "sentinel_4", landmark: "Seaside Watchtower", cx: 89, cy: 48, w: 8, h: 16, shape: "tower" },
    { slot: "sentinel_5", landmark: "River Guard Bastion", cx: 14, cy: 64, w: 10, h: 14, shape: "tower" },
    { slot: "sentinel_6", landmark: "Spire of the Heights", cx: 33, cy: 66, w: 6, h: 18, shape: "tower" },
  ],
  archipelago_straits: [
    { slot: "archipelago_1", landmark: "High Citadel", cx: 22, cy: 18, w: 14, h: 18, shape: "tower" },
    { slot: "archipelago_2", landmark: "Great Lighthouse", cx: 52, cy: 12, w: 6, h: 16, shape: "tower" },
    { slot: "archipelago_3", landmark: "Domed Harbor Hall", cx: 74, cy: 18, w: 10, h: 12, shape: "house" },
    { slot: "archipelago_4", landmark: "Coastal Windmill", cx: 14, cy: 45, w: 8, h: 14, shape: "mill" },
    { slot: "archipelago_5", landmark: "Sunken Arena", cx: 50, cy: 50, w: 14, h: 14, shape: "ruin" },
    { slot: "archipelago_6", landmark: "Crystal Spire", cx: 84, cy: 54, w: 10, h: 18, shape: "tower" },
    { slot: "archipelago_7", landmark: "Cliff Temple Ruins", cx: 28, cy: 74, w: 10, h: 12, shape: "ruin" },
  ],
  shrouded_highlands: [
    { slot: "highland_1", landmark: "Grand Cloud Palace", cx: 75, cy: 22, w: 16, h: 16, shape: "tower" },
    { slot: "highland_2", landmark: "Falls Pagoda", cx: 23, cy: 30, w: 10, h: 11, shape: "house" },
    { slot: "highland_3", landmark: "Summit Shrine", cx: 37, cy: 14, w: 8, h: 9, shape: "house" },
    { slot: "highland_4", landmark: "Mid-Stair Pavilion", cx: 46, cy: 36, w: 7, h: 8, shape: "hut" },
    { slot: "highland_5", landmark: "Stone Watchtower", cx: 12, cy: 53, w: 6, h: 11, shape: "tower" },
    { slot: "highland_6", landmark: "Moon-Viewing Platform", cx: 30, cy: 58, w: 9, h: 9, shape: "house" },
    { slot: "highland_7", landmark: "Lotus Pond Shrine", cx: 17, cy: 79, w: 7, h: 8, shape: "hut" },
    { slot: "highland_8", landmark: "Highland Hamlet", cx: 55, cy: 71, w: 12, h: 9, shape: "house" },
    { slot: "highland_9", landmark: "Mountain Watermill", cx: 66, cy: 85, w: 9, h: 10, shape: "mill" },
    { slot: "highland_10", landmark: "Southern Peak Temple", cx: 81, cy: 69, w: 9, h: 10, shape: "house" },
    { slot: "highland_11", landmark: "Cliffside Torii Gate", cx: 90, cy: 69, w: 5, h: 6, shape: "generic" },
    { slot: "highland_12", landmark: "Hermit's Hut", cx: 61, cy: 44, w: 5, h: 6, shape: "hut" },
    { slot: "highland_13", landmark: "Whispering Grotto", cx: 71, cy: 59, w: 5, h: 6, shape: "ruin" },
  ],
  market_row: [
    { slot: "market_1", landmark: "Blue-Roof Manor", cx: 22, cy: 28, w: 14, h: 16, shape: "house" },
    { slot: "market_2", landmark: "Arched Grand Bazaar", cx: 45, cy: 20, w: 18, h: 16, shape: "generic" },
    { slot: "market_3", landmark: "Crimson Domed Tower", cx: 70, cy: 20, w: 12, h: 16, shape: "tower" },
    { slot: "market_4", landmark: "Purple-Tiered Shop", cx: 82, cy: 42, w: 12, h: 16, shape: "house" },
    { slot: "market_5", landmark: "Azure Corner Shop", cx: 74, cy: 70, w: 12, h: 14, shape: "house" },
    { slot: "market_6", landmark: "Red-Stripe Stall", cx: 52, cy: 76, w: 12, h: 14, shape: "house" },
    { slot: "market_7", landmark: "Golden-Thatch House", cx: 34, cy: 62, w: 12, h: 14, shape: "house" },
  ],
  terraced_fields: [
    { slot: "terrace_1", landmark: "Manor House", cx: 31, cy: 22, w: 13, h: 13, shape: "house" },
    { slot: "terrace_2", landmark: "Granary Tower", cx: 72, cy: 22, w: 11, h: 14, shape: "tower" },
    { slot: "terrace_3", landmark: "Field Windmill", cx: 26, cy: 52, w: 10, h: 16, shape: "mill" },
    { slot: "terrace_4", landmark: "Tiered Farmhouse", cx: 66, cy: 65, w: 13, h: 13, shape: "house" },
    { slot: "terrace_5", landmark: "Main Gatehouse", cx: 43, cy: 78, w: 10, h: 12, shape: "generic" },
  ],
};

const silPath = path.join(root, "data/districts/building-silhouettes.ts");
const existing = fs.readFileSync(silPath, "utf8");
const farmMatch = existing.match(/central_farmlands:\s*\[[\s\S]*?\n  \],/);
if (!farmMatch) {
  throw new Error("Could not extract central_farmlands block");
}

function pts(points) {
  return points.map(([x, y]) => `        [${x}, ${y}]`).join(",\n");
}

function districtBlock(id, landmarks) {
  const body = landmarks
    .map((lm) => {
      const silhouette = shapePoly(lm.cx, lm.cy, lm.w, lm.h, lm.shape);
      return `    {
      slot: "${lm.slot}",
      landmark: "${lm.landmark.replace(/"/g, '\\"')}",
      silhouette: [
${pts(silhouette)},
      ],
    }`;
    })
    .join(",\n");
  return `  ${id}: [\n${body},\n  ]`;
}

const generated = Object.entries(LANDMARKS)
  .map(([id, lms]) => districtBlock(id, lms))
  .join(",\n");

const out = `import type { Point } from "./kingdom-polygons";

/**
 * Building silhouettes for district maps (%, viewBox 0 0 100 100).
 * central_farmlands: hand-traced. Other districts: landmark-aligned building shapes
 * (refine any district via /district-calibrate?district=<id>).
 */
export type BuildingSilhouette = {
  slot: string;
  /** Label for calibrator UI */
  landmark: string;
  /** Outline following the building silhouette */
  silhouette: Point[];
};

export const DISTRICT_BUILDING_SILHOUETTES: Record<string, BuildingSilhouette[]> = {
  ${farmMatch[0]}
${generated},
};

export function silhouettesForDistrict(districtId: string): BuildingSilhouette[] {
  return DISTRICT_BUILDING_SILHOUETTES[districtId] ?? [];
}

export function silhouetteBySlot(
  districtId: string,
  slot: string,
): BuildingSilhouette | undefined {
  return silhouettesForDistrict(districtId).find((s) => s.slot === slot);
}

/** AABB from silhouette for tooltip anchoring */
export function silhouetteBounds(points: Point[]): {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
} {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
  };
}
`;

fs.writeFileSync(silPath, out);

// Emit slot layouts for index.ts (top-left of AABB from cx,cy,w,h)
const layouts = {};
for (const [id, lms] of Object.entries(LANDMARKS)) {
  layouts[id] = lms.map((lm) => [
    round(lm.cx - lm.w / 2),
    round(lm.cy - lm.h / 2),
  ]);
}
fs.writeFileSync(
  path.join(root, "scripts/generated-slot-layouts.json"),
  JSON.stringify(layouts, null, 2),
);

const counts = Object.fromEntries(
  Object.entries(LANDMARKS).map(([k, v]) => [k, v.length]),
);
console.log("Wrote silhouettes for:", counts);
console.log("Preserved central_farmlands hand traces.");
