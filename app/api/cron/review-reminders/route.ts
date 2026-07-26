import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";
import { buildReviewReminderPayload } from "@/lib/push-reminders";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: { pushSubscriptions: { some: {} } },
    select: { id: true },
  });

  let notified = 0;
  for (const u of users) {
    const snapshot = await buildReviewReminderPayload(u.id);
    if (!snapshot.hasAlerts) continue;

    const result = await sendPushToUser(u.id, {
      title: snapshot.title,
      body: snapshot.body,
      url: snapshot.url,
    });
    if (result.sent > 0) notified += 1;
  }

  return NextResponse.json({ ok: true, usersChecked: users.length, notified });
}

export const POST = GET;
