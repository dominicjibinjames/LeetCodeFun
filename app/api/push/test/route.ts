import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session-user";
import { initWebPush, sendPushToUser } from "@/lib/push";
import { buildReviewReminderPayload } from "@/lib/push-reminders";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const clientEndpoint =
    typeof body.clientEndpoint === "string" ? body.clientEndpoint : null;

  let vapidReady = false;
  let vapidInitError: string | null = null;
  try {
    vapidReady = initWebPush();
  } catch (e) {
    vapidInitError = e instanceof Error ? e.message : "VAPID init failed";
  }

  const subs = await prisma.pushSubscription.findMany({
    where: { userId: user.id },
    select: { endpoint: true },
  });
  const subCount = subs.length;
  const endpointMatched = clientEndpoint
    ? subs.some((s) => s.endpoint === clientEndpoint)
    : null;
  const snapshot = await buildReviewReminderPayload(user.id);

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
  if (clientEndpoint && endpointMatched === false) {
    return NextResponse.json(
      {
        error:
          "This browser’s push endpoint is not saved. Click Enable/Re-subscribe notifications, then test again.",
        endpointMatched: false,
        subCount,
      },
      { status: 409 },
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
        endpointMatched,
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
    endpointMatched,
    title: snapshot.title,
    body: snapshot.body,
    fire: snapshot.fire,
    rubble: snapshot.rubble,
    invaders: snapshot.invaders,
    hasAlerts: snapshot.hasAlerts,
  });
}
