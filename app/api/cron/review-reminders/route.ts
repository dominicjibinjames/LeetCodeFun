import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";
import { buildReviewReminderPayload } from "@/lib/push-reminders";

/**
 * Daily cron at 12:00 UTC ≈ 8:00 AM Eastern (EDT).
 * Hobby-safe (once per day). Notifies every subscribed user with alerts.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // #region agent log
  fetch("http://127.0.0.1:7792/ingest/48f6c65e-228d-42ba-b906-d4f53717a7c3", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9e8e6e" },
    body: JSON.stringify({
      sessionId: "9e8e6e",
      runId: "est-revert",
      hypothesisId: "cron",
      location: "api/cron/review-reminders:GET",
      message: "daily EST cron started",
      data: { schedule: "0 12 * * *" },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  const users = await prisma.user.findMany({
    where: { pushSubscriptions: { some: {} } },
    select: { id: true },
  });

  let notified = 0;
  let skippedCalm = 0;
  for (const u of users) {
    const snapshot = await buildReviewReminderPayload(u.id);
    if (!snapshot.hasAlerts) {
      skippedCalm += 1;
      continue;
    }
    const result = await sendPushToUser(u.id, {
      title: snapshot.title,
      body: snapshot.body,
      url: snapshot.url,
    });
    if (result.sent > 0) notified += 1;
  }

  // #region agent log
  fetch("http://127.0.0.1:7792/ingest/48f6c65e-228d-42ba-b906-d4f53717a7c3", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9e8e6e" },
    body: JSON.stringify({
      sessionId: "9e8e6e",
      runId: "est-revert",
      hypothesisId: "cron",
      location: "api/cron/review-reminders:done",
      message: "daily EST cron finished",
      data: { usersChecked: users.length, notified, skippedCalm },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  return NextResponse.json({
    ok: true,
    usersChecked: users.length,
    notified,
    skippedCalm,
  });
}

export const POST = GET;
