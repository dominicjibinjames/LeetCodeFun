import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";
import { buildReviewReminderPayload } from "@/lib/push-reminders";
import { getUserTimeZone, resolveNotifyHour, shouldSendReviewPush } from "@/lib/user-time";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: { pushSubscriptions: { some: {} } },
    select: {
      id: true,
      timezone: true,
      notifyHourLocal: true,
      lastPushLocalDay: true,
    },
  });

  let notified = 0;
  let skippedHour = 0;
  let skippedAlready = 0;
  let skippedCalm = 0;

  for (const u of users) {
    const tz = getUserTimeZone(u);
    const gate = shouldSendReviewPush({
      timezone: tz,
      notifyHourLocal: resolveNotifyHour(u.notifyHourLocal),
      lastPushLocalDay: u.lastPushLocalDay,
    });
    if (!gate.send) {
      if (gate.localHour !== resolveNotifyHour(u.notifyHourLocal)) skippedHour += 1;
      else skippedAlready += 1;
      continue;
    }

    const snapshot = await buildReviewReminderPayload(u.id, tz);
    if (!snapshot.hasAlerts) {
      skippedCalm += 1;
      continue;
    }

    const result = await sendPushToUser(u.id, {
      title: snapshot.title,
      body: snapshot.body,
      url: snapshot.url,
    });
    if (result.sent > 0) {
      notified += 1;
      await prisma.user.update({
        where: { id: u.id },
        data: { lastPushLocalDay: gate.localDay },
      });
    }
  }

  return NextResponse.json({
    ok: true,
    usersChecked: users.length,
    notified,
    skippedHour,
    skippedAlready,
    skippedCalm,
  });
}

export const POST = GET;
