/**
 * Patch DISTRICTS building slot layouts from generated-slot-layouts.json
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const layouts = JSON.parse(
  fs.readFileSync(path.join(root, "scripts/generated-slot-layouts.json"), "utf8"),
);
const indexPath = path.join(root, "data/districts/index.ts");
let src = fs.readFileSync(indexPath, "utf8");

const idToPrefix = {
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

for (const [id, coords] of Object.entries(layouts)) {
  const prefix = idToPrefix[id];
  if (!prefix) continue;
  const count = coords.length;
  const rows = [];
  for (let i = 0; i < coords.length; i += 5) {
    const chunk = coords
      .slice(i, i + 5)
      .map(([x, y]) => `[${x}, ${y}]`)
      .join(", ");
    rows.push(`      ${chunk},`);
  }
  // drop trailing comma on last line content handled below
  const layoutBody = rows.join("\n").replace(/,\s*$/, "");
  const re = new RegExp(
    `(withPolygon\\("${id}",\\s*\\{[\\s\\S]*?buildings:\\s*slots\\("${prefix}",\\s*${count},\\s*\\[)[\\s\\S]*?(\\]\\s*,\\s*\\}\\),)`,
  );
  if (!re.test(src)) {
    console.error("No match for", id);
    continue;
  }
  src = src.replace(re, `$1\n${layoutBody}\n    $2`);
  console.log("Updated", id, count);
}

fs.writeFileSync(indexPath, src);
console.log("Done");
