import "dotenv/config";
import { appendFileSync } from "node:fs";
import { prisma } from "../lib/prisma";
import { initWebPush, sendPushToUser } from "../lib/push";
import { buildReviewReminderPayload } from "../lib/push-reminders";

function log(payload: Record<string, unknown>) {
  const line = JSON.stringify({
    sessionId: "9e8e6e",
    runId: "push-local-repro",
    timestamp: Date.now(),
    ...payload,
  });
  appendFileSync("debug-9e8e6e.log", `${line}\n`);
  console.log(line);
}

async function main() {
  const vapidReady = (() => {
    try {
      return initWebPush();
    } catch (e) {
      log({
        hypothesisId: "A",
        location: "scripts/repro-push-send.ts",
        message: "vapid init threw",
        data: { err: e instanceof Error ? e.message : String(e) },
      });
      return false;
    }
  })();

  const subs = await prisma.pushSubscription.findMany({
    select: { id: true, userId: true, endpoint: true },
  });
  const userIds = [...new Set(subs.map((s) => s.userId))];

  log({
    hypothesisId: "A",
    location: "scripts/repro-push-send.ts",
    message: "preflight",
    data: {
      vapidReady,
      hasPub: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      hasPriv: Boolean(process.env.VAPID_PRIVATE_KEY),
      subjectKind: (() => {
        const s = (process.env.VAPID_SUBJECT ?? "").trim();
        if (!s) return "empty";
        if (/^mailto:/i.test(s)) return "mailto";
        if (s.includes("@")) return "bare-email";
        return "other";
      })(),
      subCount: subs.length,
      userCount: userIds.length,
    },
  });

  for (const userId of userIds) {
    const snapshot = await buildReviewReminderPayload(userId);
    log({
      hypothesisId: "B",
      location: "scripts/repro-push-send.ts",
      message: "user snapshot",
      data: {
        userIdPrefix: userId.slice(0, 8),
        hasAlerts: snapshot.hasAlerts,
        fire: snapshot.fire,
        rubble: snapshot.rubble,
        invaders: snapshot.invaders,
        title: snapshot.title,
      },
    });

    const result = await sendPushToUser(userId, {
      title: "[debug] " + snapshot.title,
      body: snapshot.body,
      url: snapshot.url,
    });

    log({
      hypothesisId: "C",
      location: "scripts/repro-push-send.ts",
      message: "send result",
      data: { userIdPrefix: userId.slice(0, 8), ...result },
    });
  }

  const remaining = await prisma.pushSubscription.count();
  log({
    hypothesisId: "C",
    location: "scripts/repro-push-send.ts",
    message: "subs remaining after send",
    data: { remaining },
  });
}

main()
  .catch((e) => {
    log({
      hypothesisId: "C",
      location: "scripts/repro-push-send.ts",
      message: "script failed",
      data: { err: e instanceof Error ? e.message : String(e) },
    });
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
