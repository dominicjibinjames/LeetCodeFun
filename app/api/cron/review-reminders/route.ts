import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";
import { estDayKey } from "@/lib/activity-time";

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
    const [fire, rubble, invaders] = await Promise.all([
      prisma.reviewState.count({ where: { userId: u.id, state: "fire" } }),
      prisma.reviewState.count({ where: { userId: u.id, state: "rubble" } }),
      prisma.dailyConquest.count({
        where: { userId: u.id, estDay: estDayKey() },
      }),
    ]);

    const parts: string[] = [];
    if (fire > 0) parts.push(`${fire} on fire`);
    if (rubble > 0) parts.push(`${rubble} rubble`);
    if (invaders > 0) parts.push(`${invaders} daily battle${invaders === 1 ? "" : "s"}`);
    if (parts.length === 0) continue;

    const result = await sendPushToUser(u.id, {
      title: "Patterngard needs you",
      body: parts.join(" · "),
      url: "/queue",
    });
    if (result.sent > 0) notified += 1;
  }

  return NextResponse.json({ ok: true, usersChecked: users.length, notified });
}

export const POST = GET;
