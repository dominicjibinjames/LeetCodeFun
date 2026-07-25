/**
 * Resize each district's building slot layouts to match catalog counts,
 * and ensure every slot has a silhouette polygon.
 *
 * Run: node scripts/sync-district-slots-to-catalog.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const slotLandmarks = JSON.parse(
  fs.readFileSync(path.join(root, "data/districts/slot-landmarks.json"), "utf8"),
);

function landmarkForSlot(slot, fallback) {
  return slotLandmarks[slot] ?? fallback;
}

const DISTRICT_PREFIX = {
  central_farmlands: "farm",
  twin_rivers: "river",
  windmill_vale: "windmill",
  stepping_stone_causeway: "isle",
  iron_peaks_switchbacks: "peak",
  whispering_jungle: "jungle",
  scholars_quarter: "scholar",
  sentinel_heights: "sentinel",
  archipelago_straits: "archipelago",
  shrouded_highlands: "highland",
  market_row: "market",
  terraced_fields: "terrace",
  tinkerers_forge: "forge",
};

const SHAPES = ["house", "tower", "mill", "barn", "hut", "generic", "ruin", "dock"];

function round(n) {
  return Math.round(n * 10) / 10;
}

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

/** Deterministic scatter grid for overflow landmarks */
function scatter(i, total) {
  const cols = Math.ceil(Math.sqrt(total * 1.2));
  const row = Math.floor(i / cols);
  const col = i % cols;
  const cx = 10 + (col / Math.max(cols - 1, 1)) * 80 + ((row % 2) * 3);
  const cy = 12 + (row / Math.max(Math.ceil(total / cols) - 1, 1)) * 76;
  return { cx: round(Math.min(90, Math.max(8, cx))), cy: round(Math.min(88, Math.max(10, cy))) };
}

const catalog = JSON.parse(fs.readFileSync(path.join(root, "data/problems/catalog.json"), "utf8"));
const byDistrict = {};
for (const p of catalog) {
  (byDistrict[p.districtId] ??= []).push(p);
}

// Load existing silhouettes by parsing the TS object keys roughly via generate script landmarks
// Prefer existing hand-traced central_farmlands from current file.
const silPath = path.join(root, "data/districts/building-silhouettes.ts");
const existingSrc = fs.readFileSync(silPath, "utf8");
const farmMatch = existingSrc.match(/central_farmlands:\s*\[[\s\S]*?\n  \],/);
if (!farmMatch) throw new Error("missing central_farmlands block");

// Try to reuse previously generated landmark centers from generate script if present
const landmarkPath = path.join(root, "scripts/generate-district-silhouettes.mjs");
const landmarkSrc = fs.readFileSync(landmarkPath, "utf8");
const landmarkCenters = {};
for (const [id, prefix] of Object.entries(DISTRICT_PREFIX)) {
  if (id === "central_farmlands") continue;
  const block = landmarkSrc.match(new RegExp(`${id}:\\s*\\[([\\s\\S]*?)\\n  \\],`));
  if (!block) continue;
  const entries = [...block[1].matchAll(/slot:\s*"([^"]+)"[\s\S]*?cx:\s*([\d.]+)[\s\S]*?cy:\s*([\d.]+)[\s\S]*?w:\s*([\d.]+)[\s\S]*?h:\s*([\d.]+)[\s\S]*?shape:\s*"([^"]+)"/g)];
  landmarkCenters[id] = Object.fromEntries(
    entries.map((m) => [
      m[1],
      { cx: Number(m[2]), cy: Number(m[3]), w: Number(m[4]), h: Number(m[5]), shape: m[6] },
    ]),
  );
}

function pts(points) {
  return points.map(([x, y]) => `        [${x}, ${y}]`).join(",\n");
}

function districtSilBlock(id, problems) {
  const prefix = DISTRICT_PREFIX[id];
  const known = landmarkCenters[id] ?? {};
  const body = problems
    .map((p, i) => {
      const slot = p.buildingSlot;
      const knownLm = known[slot];
      let cx, cy, w, h, shape, landmark;
      if (knownLm) {
        ({ cx, cy, w, h, shape } = knownLm);
        landmark = landmarkForSlot(slot, knownLm.landmark ?? `Landmark ${slot}`);
      } else if (id === "central_farmlands") {
        // keep hand-traced; this branch unused for farm
        const sc = scatter(i, problems.length);
        cx = sc.cx;
        cy = sc.cy;
        w = 9;
        h = 11;
        shape = SHAPES[i % SHAPES.length];
        landmark = landmarkForSlot(slot, `Landmark ${slot}`);
      } else {
        const sc = scatter(i, problems.length);
        cx = sc.cx;
        cy = sc.cy;
        w = 8 + (i % 3);
        h = 10 + (i % 4);
        shape = SHAPES[i % SHAPES.length];
        landmark = landmarkForSlot(slot, `Landmark ${slot}`);
      }
      const silhouette = shapePoly(cx, cy, w, h, shape);
      return `    {
      slot: "${slot}",
      landmark: ${JSON.stringify(landmark)},
      silhouette: [
${pts(silhouette)},
      ],
    }`;
    })
    .join(",\n");
  return `  ${id}: [\n${body},\n  ]`;
}

// For central farmlands: keep hand-traced silhouettes for existing farm_1..farm_12,
// and append generated shapes for farm_13+
const farmProblems = byDistrict.central_farmlands.sort((a, b) => {
  const na = Number(a.buildingSlot.split("_")[1]);
  const nb = Number(b.buildingSlot.split("_")[1]);
  return na - nb;
});

// Parse existing farm silhouettes into a map
const farmBody = farmMatch[0];
const farmSils = {};
for (const m of farmBody.matchAll(/\{\s*slot:\s*"([^"]+)",\s*landmark:\s*"([^"]*)",\s*silhouette:\s*\[([\s\S]*?)\],\s*\}/g)) {
  const points = [...m[3].matchAll(/\[([\d.]+),\s*([\d.]+)\]/g)].map((p) => [Number(p[1]), Number(p[2])]);
  farmSils[m[1]] = { landmark: m[2], silhouette: points };
}

const farmBlockParts = farmProblems.map((p, i) => {
  const existing = farmSils[p.buildingSlot];
  if (existing && existing.silhouette.length >= 3) {
    return `    {
      slot: "${p.buildingSlot}",
      landmark: ${JSON.stringify(existing.landmark)},
      silhouette: [
${pts(existing.silhouette)},
      ],
    }`;
  }
  const sc = scatter(i, farmProblems.length);
  const silhouette = shapePoly(sc.cx, sc.cy, 9, 11, SHAPES[i % SHAPES.length]);
  return `    {
      slot: "${p.buildingSlot}",
      landmark: ${JSON.stringify(landmarkForSlot(p.buildingSlot, `Landmark ${p.buildingSlot}`))},
      silhouette: [
${pts(silhouette)},
      ],
    }`;
});

const otherBlocks = Object.entries(byDistrict)
  .filter(([id]) => id !== "central_farmlands")
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([id, problems]) => {
    problems.sort((a, b) => {
      const na = Number(a.buildingSlot.split("_")[1]);
      const nb = Number(b.buildingSlot.split("_")[1]);
      return na - nb;
    });
    return districtSilBlock(id, problems);
  });

const out = `import type { Point } from "./kingdom-polygons";

/**
 * Building silhouettes for district maps (%, viewBox 0 0 100 100).
 * central_farmlands keeps hand-traced landmarks where available.
 * Expanded to cover all catalog slots (179 problems). Refine via /district-calibrate.
 */
export type BuildingSilhouette = {
  slot: string;
  /** Label for calibrator UI */
  landmark: string;
  /** Outline following the building silhouette */
  silhouette: Point[];
};

export const DISTRICT_BUILDING_SILHOUETTES: Record<string, BuildingSilhouette[]> = {
  central_farmlands: [
${farmBlockParts.join(",\n")},
  ],
${otherBlocks.join(",\n")},
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

// Rewrite index.ts building slot arrays to match catalog counts/order
const indexPath = path.join(root, "data/districts/index.ts");
let indexSrc = fs.readFileSync(indexPath, "utf8");

for (const [id, problems] of Object.entries(byDistrict)) {
  const prefix = DISTRICT_PREFIX[id];
  const count = problems.length;
  problems.sort((a, b) => {
    const na = Number(a.buildingSlot.split("_")[1]);
    const nb = Number(b.buildingSlot.split("_")[1]);
    return na - nb;
  });

  // Derive layout from silhouettes we just wrote by re-computing scatter/known centers
  const layouts = problems.map((p, i) => {
    const known = landmarkCenters[id]?.[p.buildingSlot];
    if (known) return [round(known.cx - known.w / 2), round(known.cy - known.h / 2)];
    if (id === "central_farmlands" && farmSils[p.buildingSlot]) {
      const pts2 = farmSils[p.buildingSlot].silhouette;
      const xs = pts2.map((q) => q[0]);
      const ys = pts2.map((q) => q[1]);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      return [round(cx - 5), round(cy - 7)];
    }
    const sc = scatter(i, problems.length);
    return [round(sc.cx - 5), round(sc.cy - 7)];
  });

  const rows = [];
  for (let i = 0; i < layouts.length; i += 5) {
    rows.push(
      "      " +
        layouts
          .slice(i, i + 5)
          .map(([x, y]) => `[${x}, ${y}]`)
          .join(", ") +
        (i + 5 < layouts.length ? "," : ""),
    );
  }
  const layoutBody = rows.join("\n");

  const re = new RegExp(
    `(withPolygon\\("${id}",\\s*\\{[\\s\\S]*?buildings:\\s*slots\\("${prefix}",\\s*)\\d+(,\\s*\\[)[\\s\\S]*?(\\]\\s*,\\s*\\}\\),)`,
  );
  if (!re.test(indexSrc)) {
    console.error("Failed to patch index for", id);
    continue;
  }
  indexSrc = indexSrc.replace(re, `$1${count}$2\n${layoutBody}\n    $3`);
  console.log("Patched", id, "→", count);
}

// Add backtracking to PATTERN_LABELS if missing
if (!indexSrc.includes("backtracking:")) {
  indexSrc = indexSrc.replace(
    "bit_manipulation: \"Bit Manipulation\",\n};",
    "bit_manipulation: \"Bit Manipulation\",\n  backtracking: \"Backtracking\",\n};",
  );
}

fs.writeFileSync(indexPath, indexSrc);

// Coverage check
let silCount = 0;
for (const id of Object.keys(byDistrict)) {
  const re = new RegExp(`${id}:\\s*\\[([\\s\\S]*?)\\n  \\],`);
  const m = out.match(re);
  const n = m ? (m[1].match(/slot:/g) || []).length : 0;
  silCount += n;
  console.log("silhouettes", id, n, "catalog", byDistrict[id].length);
}
console.log("TOTAL catalog", catalog.length, "silhouette slots", silCount);
