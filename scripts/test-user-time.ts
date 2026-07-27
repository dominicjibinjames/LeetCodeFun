/**
 * Focused checks for Eastern day keys (game day = America/New_York).
 * Run: npx tsx scripts/test-user-time.ts
 */
import assert from "node:assert/strict";
import { dayDiff, dayKey, dayNoonAnchor, EST_TZ } from "../lib/activity-time";
import { getUserTimeZone, resolveTimeZone } from "../lib/user-time";

function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`ok  ${name}`);
  } catch (e) {
    console.error(`FAIL ${name}`);
    throw e;
  }
}

check("dayKey Eastern known instant", () => {
  const d = new Date("2026-01-15T17:00:00.000Z");
  assert.equal(dayKey(d, EST_TZ), "2026-01-15");
});

check("dayKey near UTC midnight still Eastern calendar day", () => {
  // 2026-07-15 04:30 UTC = 00:30 EDT
  const d = new Date("2026-07-15T04:30:00.000Z");
  assert.equal(dayKey(d, EST_TZ), "2026-07-15");
});

check("dayNoonAnchor stays on requested Eastern day", () => {
  const noon = dayNoonAnchor("2026-06-01", EST_TZ);
  assert.equal(dayKey(noon, EST_TZ), "2026-06-01");
});

check("dayDiff calendar math", () => {
  assert.equal(dayDiff("2026-07-01", "2026-07-01"), 0);
  assert.equal(dayDiff("2026-07-01", "2026-07-04"), 3);
});

check("resolveTimeZone always Eastern (prefs disabled)", () => {
  assert.equal(resolveTimeZone("America/Los_Angeles"), EST_TZ);
  assert.equal(resolveTimeZone("Not/A_Zone"), EST_TZ);
  assert.equal(resolveTimeZone(""), EST_TZ);
});

check("getUserTimeZone ignores stored timezone", () => {
  assert.equal(getUserTimeZone({ timezone: "America/Los_Angeles" }), EST_TZ);
  assert.equal(getUserTimeZone({ timezone: null }), EST_TZ);
  assert.equal(getUserTimeZone(), EST_TZ);
});

console.log("\nAll Eastern day-key checks passed.");
