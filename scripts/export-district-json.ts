import { writeFileSync } from "fs";
import { DISTRICTS } from "../data/districts";

for (const d of DISTRICTS) {
  const payload = {
    id: d.id,
    name: d.name,
    image: d.image,
    buildings: d.buildings,
  };
  writeFileSync(
    `data/districts/${d.id}.json`,
    JSON.stringify(payload, null, 2) + "\n",
  );
  console.log("wrote", d.id, d.buildings.length, "slots");
}
