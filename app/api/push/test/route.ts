import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session-user";
import { initWebPush, sendPushToUser } from "@/lib/push";
import { buildReviewReminderPayload } from "@/lib/push-reminders";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  let vapidReady = false;
  let vapidInitError: string | null = null;
  try {
    vapidReady = initWebPush();
  } catch (e) {
    vapidInitError = e instanceof Error ? e.message : "VAPID init failed";
  }

  const subCount = await prisma.pushSubscription.count({ where: { userId: user.id } });
  const snapshot = await buildReviewReminderPayload(user.id);

  // #region agent log
  fetch("http://127.0.0.1:7792/ingest/48f6c65e-228d-42ba-b906-d4f53717a7c3", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9e8e6e" },
    body: JSON.stringify({
      sessionId: "9e8e6e",
      runId: "push-debug",
      hypothesisId: "B",
      location: "api/push/test:POST",
      message: "test push preflight",
      data: {
        vapidReady,
        vapidInitError,
        subCount,
        hasAlerts: snapshot.hasAlerts,
        fire: snapshot.fire,
        rubble: snapshot.rubble,
        invaders: snapshot.invaders,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  if (vapidInitError) {
    return NextResponse.json({ error: vapidInitError }, { status: 500 });
  }
  if (!vapidReady) {
    return NextResponse.json(
      { error: "VAPID not configured on server (VAPID_PRIVATE_KEY / SUBJECT / public key)" },
      { status: 503 },
    );
  }
  if (subCount === 0) {
    return NextResponse.json(
      { error: "No push subscription stored for your account. Enable notifications first." },
      { status: 400 },
    );
  }

  const result = await sendPushToUser(user.id, {
    title: snapshot.title,
    body: snapshot.body,
    url: snapshot.url,
  });

  if (result.sent === 0) {
    return NextResponse.json(
      {
        error:
          result.failed > 0
            ? "All subscriptions failed (expired endpoint?). Re-enable notifications on this device."
            : "Nothing sent",
        ...result,
        snapshot: {
          fire: snapshot.fire,
          rubble: snapshot.rubble,
          invaders: snapshot.invaders,
          body: snapshot.body,
        },
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    ...result,
    title: snapshot.title,
    body: snapshot.body,
    fire: snapshot.fire,
    rubble: snapshot.rubble,
    invaders: snapshot.invaders,
    hasAlerts: snapshot.hasAlerts,
  });
}
