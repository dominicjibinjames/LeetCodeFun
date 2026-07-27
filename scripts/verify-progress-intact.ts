/**
 * Read-only progress snapshot — never mutates the database.
 * Run: npx tsx scripts/verify-progress-intact.ts
 */
import "dotenv/config";
import { prisma } from "../lib/prisma";
import { EST_TZ } from "../lib/activity-time";
import { getUserTimeZone } from "../lib/user-time";

async function main() {
  const [users, problems, reviews, attempts, conquests, pushSubs] = await Promise.all([
    prisma.user.count(),
    prisma.problem.count(),
    prisma.reviewState.count(),
    prisma.attempt.count(),
    prisma.dailyConquest.count(),
    prisma.pushSubscription.count(),
  ]);

  const xpAgg = await prisma.user.aggregate({ _sum: { xp: true }, _avg: { xp: true } });
  const sample = await prisma.user.findMany({
    take: 5,
    orderBy: { xp: "desc" },
    select: {
      id: true,
      xp: true,
      streakDays: true,
      journeyStartedAt: true,
      timezone: true,
      notifyHourLocal: true,
      _count: { select: { problems: true, attempts: true, reviewStates: true } },
    },
  });

  const payload = {
    sessionId: "9e8e6e",
    runId: "est-revert",
    hypothesisId: "C",
    location: "scripts/verify-progress-intact.ts",
    message: "read-only progress snapshot (no writes)",
    data: {
      tzForced: getUserTimeZone({ timezone: "America/Los_Angeles" }),
      estTz: EST_TZ,
      counts: { users, problems, reviews, attempts, conquests, pushSubs },
      xpSum: xpAgg._sum.xp,
      xpAvg: xpAgg._avg.xp,
      topUsers: sample.map((u) => ({
        xp: u.xp,
        streak: u.streakDays,
        journey: Boolean(u.journeyStartedAt),
        storedTz: u.timezone,
        problems: u._count.problems,
        attempts: u._count.attempts,
        reviews: u._count.reviewStates,
      })),
    },
    timestamp: Date.now(),
  };

  console.log(JSON.stringify(payload.data, null, 2));

  const { appendFileSync } = await import("node:fs");
  appendFileSync("debug-9e8e6e.log", `${JSON.stringify(payload)}\n`);

  await fetch("http://127.0.0.1:7792/ingest/48f6c65e-228d-42ba-b906-d4f53717a7c3", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "9e8e6e",
    },
    body: JSON.stringify(payload),
  }).catch(() => {});

  if (getUserTimeZone({ timezone: "Pacific/Auckland" }) !== EST_TZ) {
    throw new Error("getUserTimeZone did not force EST");
  }
  console.log("\nok  progress snapshot (read-only) + EST force check");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
