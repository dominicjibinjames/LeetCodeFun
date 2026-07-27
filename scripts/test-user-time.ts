/**
 * Focused checks for timezone day keys + notify-window gating.
 * Run: npx tsx scripts/test-user-time.ts
 */
import assert from "node:assert/strict";
import { dayDiff, dayKey, dayNoonAnchor } from "../lib/activity-time";
import {
  resolveTimeZone,
  shouldSendReviewPush,
} from "../lib/user-time";

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
  // 2026-03-08 12:00 UTC = 07:00 EST (still standard) / morning Eastern
  const d = new Date("2026-01-15T17:00:00.000Z"); // noon-ish EST
  assert.equal(dayKey(d, "America/New_York"), "2026-01-15");
});

check("dayKey Pacific differs from Eastern near midnight", () => {
  // 2026-07-15 04:30 UTC = 00:30 EDT / 21:30 PDT previous evening
  const d = new Date("2026-07-15T04:30:00.000Z");
  assert.equal(dayKey(d, "America/New_York"), "2026-07-15");
  assert.equal(dayKey(d, "America/Los_Angeles"), "2026-07-14");
});

check("dayNoonAnchor stays on requested day", () => {
  const noon = dayNoonAnchor("2026-06-01", "America/Los_Angeles");
  assert.equal(dayKey(noon, "America/Los_Angeles"), "2026-06-01");
});

check("dayDiff calendar math", () => {
  assert.equal(dayDiff("2026-07-01", "2026-07-01"), 0);
  assert.equal(dayDiff("2026-07-01", "2026-07-04"), 3);
});

check("invalid timezone falls back to Eastern", () => {
  assert.equal(resolveTimeZone("Not/A_Zone"), "America/New_York");
  assert.equal(resolveTimeZone(""), "America/New_York");
});

check("shouldSendReviewPush matches hour once per local day", () => {
  // Pick a fixed UTC instant: 2026-07-15 12:00 UTC = 08:00 EDT
  const now = new Date("2026-07-15T12:00:00.000Z");
  const first = shouldSendReviewPush({
    timezone: "America/New_York",
    notifyHourLocal: 8,
    lastPushLocalDay: null,
    now,
  });
  assert.equal(first.send, true);
  assert.equal(first.localDay, "2026-07-15");
  assert.equal(first.localHour, 8);

  const again = shouldSendReviewPush({
    timezone: "America/New_York",
    notifyHourLocal: 8,
    lastPushLocalDay: "2026-07-15",
    now,
  });
  assert.equal(again.send, false);

  const wrongHour = shouldSendReviewPush({
    timezone: "America/New_York",
    notifyHourLocal: 8,
    lastPushLocalDay: null,
    now: new Date("2026-07-15T15:00:00.000Z"), // 11:00 EDT
  });
  assert.equal(wrongHour.send, false);
});

check("LA notify hour uses Pacific clock", () => {
  // 2026-07-15 15:00 UTC = 08:00 PDT
  const now = new Date("2026-07-15T15:00:00.000Z");
  const gate = shouldSendReviewPush({
    timezone: "America/Los_Angeles",
    notifyHourLocal: 8,
    lastPushLocalDay: null,
    now,
  });
  assert.equal(gate.send, true);
  assert.equal(gate.localHour, 8);
  assert.equal(gate.localDay, "2026-07-15");
});

console.log("\nAll timezone/notify checks passed.");
