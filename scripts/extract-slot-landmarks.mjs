import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(
  path.join(root, "data/districts/building-silhouettes.ts"),
  "utf8",
);
const map = {};
for (const m of src.matchAll(/slot: "([^"]+)",\s*\n\s*landmark: "([^"]*)",/g)) {
  map[m[1]] = m[2];
}
fs.writeFileSync(
  path.join(root, "data/districts/slot-landmarks.json"),
  JSON.stringify(map, null, 2),
);
console.log(Object.keys(map).length);
