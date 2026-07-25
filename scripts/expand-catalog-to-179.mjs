/**
 * Expand catalog.json to the full 179-problem list.
 * Assigns district/slot/pattern for missing titles and grows district slot counts.
 *
 * Run: node scripts/expand-catalog-to-179.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Primary pattern + district for each missing title */
const MISSING_META = {
  "Single Number": { patternPrimary: "bit_manipulation", districtId: "tinkerers_forge" },
  "Index Pairs of a String": { patternPrimary: "tries", districtId: "scholars_quarter" },
  "Add Two Numbers": { patternPrimary: "linked_list", districtId: "stepping_stone_causeway" },
  "Letter Combinations of a Phone Number": { patternPrimary: "backtracking", districtId: "scholars_quarter" },
  "Generate Parentheses": { patternPrimary: "backtracking", districtId: "scholars_quarter" },
  "Swap Nodes in Pairs": { patternPrimary: "linked_list", districtId: "stepping_stone_causeway" },
  "Combination Sum": { patternPrimary: "backtracking", districtId: "scholars_quarter" },
  "Combination Sum II": { patternPrimary: "backtracking", districtId: "scholars_quarter" },
  "Permutations": { patternPrimary: "backtracking", districtId: "scholars_quarter" },
  "Permutations II": { patternPrimary: "backtracking", districtId: "scholars_quarter" },
  "Rotate List": { patternPrimary: "linked_list", districtId: "stepping_stone_causeway" },
  Combinations: { patternPrimary: "backtracking", districtId: "scholars_quarter" },
  Subsets: { patternPrimary: "backtracking", districtId: "scholars_quarter" },
  "Search in Rotated Sorted Array II": { patternPrimary: "binary_search", districtId: "iron_peaks_switchbacks" },
  "Subsets II": { patternPrimary: "backtracking", districtId: "scholars_quarter" },
  "Reverse Linked List II": { patternPrimary: "linked_list", districtId: "stepping_stone_causeway" },
  "Binary Tree Zigzag Level Order Traversal": { patternPrimary: "trees_dfs_bfs", districtId: "whispering_jungle" },
  "Binary Tree Level Order Traversal II": { patternPrimary: "trees_dfs_bfs", districtId: "whispering_jungle" },
  "Path Sum II": { patternPrimary: "trees_dfs_bfs", districtId: "whispering_jungle" },
  "Palindrome Partitioning": { patternPrimary: "backtracking", districtId: "scholars_quarter" },
  "Gas Station": { patternPrimary: "greedy", districtId: "market_row" },
  "Linked List Cycle II": { patternPrimary: "linked_list", districtId: "stepping_stone_causeway" },
  "Sort List": { patternPrimary: "linked_list", districtId: "stepping_stone_causeway" },
  "Binary Tree Right Side View": { patternPrimary: "trees_dfs_bfs", districtId: "whispering_jungle" },
  "Course Schedule II": { patternPrimary: "graphs", districtId: "archipelago_straits" },
  "Combination Sum III": { patternPrimary: "backtracking", districtId: "scholars_quarter" },
  "Lowest Common Ancestor of a Binary Tree": { patternPrimary: "trees_dfs_bfs", districtId: "whispering_jungle" },
  "Search a 2D Matrix II": { patternPrimary: "matrix", districtId: "terraced_fields" },
  "Factor Combinations": { patternPrimary: "backtracking", districtId: "scholars_quarter" },
  "Find the Duplicate Number": { patternPrimary: "arrays_hashing", districtId: "central_farmlands" },
  "Best Time to Buy and Sell Stock with Cooldown": { patternPrimary: "dynamic_programming", districtId: "shrouded_highlands" },
  "Minimum Height Trees": { patternPrimary: "graphs", districtId: "archipelago_straits" },
  "Generalized Abbreviation": { patternPrimary: "backtracking", districtId: "scholars_quarter" },
  "Odd Even Linked List": { patternPrimary: "linked_list", districtId: "stepping_stone_causeway" },
  "Find K Pairs with Smallest Sums": { patternPrimary: "heaps", districtId: "sentinel_heights" },
  "Partition Equal Subset Sum": { patternPrimary: "dynamic_programming", districtId: "shrouded_highlands" },
  "Path Sum III": { patternPrimary: "trees_dfs_bfs", districtId: "whispering_jungle" },
  "Sort Characters By Frequency": { patternPrimary: "heaps", districtId: "sentinel_heights" },
  "Minimum Number of Arrows to Burst Balloons": { patternPrimary: "intervals", districtId: "market_row" },
  "Target Sum": { patternPrimary: "dynamic_programming", districtId: "shrouded_highlands" },
  "Task Scheduler": { patternPrimary: "heaps", districtId: "sentinel_heights" },
  "Maximum Binary Tree": { patternPrimary: "trees_dfs_bfs", districtId: "whispering_jungle" },
  "Find K Closest Elements": { patternPrimary: "binary_search", districtId: "iron_peaks_switchbacks" },
  "Maximum Width of Binary Tree": { patternPrimary: "trees_dfs_bfs", districtId: "whispering_jungle" },
  "Number of Longest Increasing Subsequence": { patternPrimary: "dynamic_programming", districtId: "shrouded_highlands" },
  "Partition to K Equal Sum Subsets": { patternPrimary: "backtracking", districtId: "scholars_quarter" },
  "Longest Word in Dictionary": { patternPrimary: "tries", districtId: "scholars_quarter" },
  "Reorganize String": { patternPrimary: "heaps", districtId: "sentinel_heights" },
  "Letter Case Permutation": { patternPrimary: "backtracking", districtId: "scholars_quarter" },
  "All Nodes Distance K in Binary Tree": { patternPrimary: "trees_dfs_bfs", districtId: "whispering_jungle" },
  "Rotate Array": { patternPrimary: "arrays_hashing", districtId: "central_farmlands" },
  "Median of Two Sorted Arrays": { patternPrimary: "binary_search", districtId: "iron_peaks_switchbacks" },
  "Reverse Nodes in k-Group": { patternPrimary: "linked_list", districtId: "stepping_stone_causeway" },
  "Substring with Concatenation of All Words": { patternPrimary: "sliding_window", districtId: "windmill_vale" },
  "Sudoku Solver": { patternPrimary: "matrix", districtId: "terraced_fields" },
  "First Missing Positive": { patternPrimary: "arrays_hashing", districtId: "central_farmlands" },
  "Trapping Rain Water": { patternPrimary: "two_pointers", districtId: "twin_rivers" },
  "N-Queens": { patternPrimary: "backtracking", districtId: "scholars_quarter" },
  "Sliding Window Maximum": { patternPrimary: "sliding_window", districtId: "windmill_vale" },
  "Count of Range Sum": { patternPrimary: "binary_search", districtId: "iron_peaks_switchbacks" },
  "Rearrange String k Distance Apart": { patternPrimary: "heaps", districtId: "sentinel_heights" },
  "Word Squares": { patternPrimary: "tries", districtId: "scholars_quarter" },
  "Concatenated Words": { patternPrimary: "tries", districtId: "scholars_quarter" },
  "Sliding Window Median": { patternPrimary: "heaps", districtId: "sentinel_heights" },
  "Smallest Range Covering Elements from K Lists": { patternPrimary: "heaps", districtId: "sentinel_heights" },
  "Design Search Autocomplete System": { patternPrimary: "tries", districtId: "scholars_quarter" },
  "Prefix and Suffix Search": { patternPrimary: "tries", districtId: "scholars_quarter" },
  "Employee Free Time": { patternPrimary: "intervals", districtId: "market_row" },
  "Count Unique Characters of All Substrings of a Given String": {
    patternPrimary: "dynamic_programming",
    districtId: "shrouded_highlands",
  },
  "Maximum Frequency Stack": { patternPrimary: "stack", districtId: "twin_rivers" },
};

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

const STATEMENT =
  "Solve this LeetCode problem. Focus on the primary pattern for this district landmark.";

const full = fs
  .readFileSync(path.join(root, "scripts/full-problem-list.txt"), "utf8")
  .trim()
  .split(/\r?\n/)
  .filter(Boolean)
  .map((l) => {
    const [title, difficulty] = l.split("|");
    return { title, difficulty };
  });

const catalogPath = path.join(root, "data/problems/catalog.json");
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const byTitle = new Map(catalog.map((p) => [p.title.toLowerCase(), p]));

// Beginner + experienced track membership from earlier tagging (preserve if present)
const BEGINNER = new Set(
  catalog.filter((p) => (p.tracks || []).includes("beginner")).map((p) => p.title.toLowerCase()),
);
const EXPERIENCED = new Set(
  catalog.filter((p) => (p.tracks || []).includes("experienced")).map((p) => p.title.toLowerCase()),
);

/** Next free slot index per district (1-based) */
const nextSlot = {};
for (const p of catalog) {
  const prefix = DISTRICT_PREFIX[p.districtId];
  const m = p.buildingSlot.match(new RegExp(`^${prefix}_(\\d+)$`));
  const n = m ? Number(m[1]) : 0;
  nextSlot[p.districtId] = Math.max(nextSlot[p.districtId] ?? 0, n);
}

const expanded = [];
const added = [];

for (const { title, difficulty } of full) {
  const existing = byTitle.get(title.toLowerCase());
  if (existing) {
    expanded.push({
      ...existing,
      difficulty,
      tracks: existing.tracks ?? ["full"],
    });
    continue;
  }

  const meta = MISSING_META[title];
  if (!meta) throw new Error(`No meta for missing title: ${title}`);

  const districtId = meta.districtId;
  const prefix = DISTRICT_PREFIX[districtId];
  nextSlot[districtId] = (nextSlot[districtId] ?? 0) + 1;
  const buildingSlot = `${prefix}_${nextSlot[districtId]}`;

  const tracks = ["full"];
  if (BEGINNER.has(title.toLowerCase())) tracks.push("beginner");
  if (EXPERIENCED.has(title.toLowerCase())) tracks.push("experienced");

  const item = {
    title,
    slug: slugify(title),
    difficulty,
    districtId,
    patternPrimary: meta.patternPrimary,
    buildingSlot,
    statement: STATEMENT,
    tracks,
  };
  expanded.push(item);
  added.push(item);
}

// Ensure every existing item also has "full" track
for (const p of expanded) {
  const tracks = new Set(p.tracks || []);
  tracks.add("full");
  p.tracks = [...tracks];
}

fs.writeFileSync(catalogPath, JSON.stringify(expanded, null, 2) + "\n");

const byDistrict = {};
for (const p of expanded) {
  byDistrict[p.districtId] = (byDistrict[p.districtId] ?? 0) + 1;
}

fs.writeFileSync(
  path.join(root, "scripts/district-slot-counts.json"),
  JSON.stringify({ total: expanded.length, added: added.length, byDistrict, nextSlot }, null, 2),
);

console.log(
  JSON.stringify(
    {
      total: expanded.length,
      added: added.length,
      byDiff: {
        easy: expanded.filter((p) => p.difficulty === "easy").length,
        medium: expanded.filter((p) => p.difficulty === "medium").length,
        hard: expanded.filter((p) => p.difficulty === "hard").length,
      },
      byDistrict,
    },
    null,
    2,
  ),
);
