import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dayKey } from "@/lib/activity-time";
import { getUserTimeZone } from "@/lib/user-time";
import { getOrCreateUser } from "@/lib/xp";

/**
 * Leave the current pathway. Clears journeyStartedAt so the user sees
 * the "Start your journey" screen again. Deletes today's conquest slots
 * but keeps all built progress, XP, streaks, and review states.
 */
export async function POST() {
  try {
    const user = await getOrCreateUser();
    if (!user.journeyStartedAt) {
      return NextResponse.json({ ok: true, alreadyLeft: true });
    }

    const tz = getUserTimeZone(user);
    const today = dayKey(new Date(), tz);

    await prisma.dailyConquest.deleteMany({
      where: { userId: user.id, estDay: today },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        journeyStartedAt: null,
        journeyDifficulty: null,
        journeyTrack: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to leave pathway" }, { status: 500 });
  }
}
