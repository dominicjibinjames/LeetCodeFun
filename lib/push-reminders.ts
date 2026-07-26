import { prisma } from "@/lib/prisma";
import { estDayKey } from "@/lib/activity-time";

export type ReviewReminderSnapshot = {
  fire: number;
  rubble: number;
  invaders: number;
  title: string;
  body: string;
  url: string;
  hasAlerts: boolean;
};

const TITLE = "The kingdom calls, my liege";

function urgencyBody(fire: number, rubble: number, invaders: number): string {
  const hasFire = fire > 0;
  const hasRubble = rubble > 0;
  const hasBattles = invaders > 0;

  if (hasBattles && hasFire && hasRubble) {
    return "Invaders inside, buildings aflame, rubble in the streets. The people cry for their king — save Patterngard now.";
  }
  if (hasBattles && hasFire) {
    return "Invaders breach the gates while flames tear through the realm. Your army awaits — reclaim Patterngard now.";
  }
  if (hasBattles && hasRubble) {
    return "Invaders press the walls and neglected districts cry out. Lead your army and restore the kingdom.";
  }
  if (hasFire && hasRubble) {
    return "Fire spreads through abandoned halls. The people panic and despair — tend the kingdom before it falls.";
  }
  if (hasBattles) {
    return "Invaders are inside the walls. Your army stands ready — the king must lead the charge.";
  }
  if (hasFire) {
    return "Buildings burn and the people panic. Ride out and save your kingdom now.";
  }
  if (hasRubble) {
    return "Neglected halls crumble. The people grow unhappy — manage your kingdom before all is lost.";
  }
  return "The realm is quiet tonight. No invaders, fire, or rubble — stand ready for the next call.";
}

function countSuffix(fire: number, rubble: number, invaders: number): string {
  const parts: string[] = [];
  if (fire > 0) parts.push(`${fire} fire`);
  if (rubble > 0) parts.push(`${rubble} rubble`);
  if (invaders > 0) parts.push(`${invaders} battle${invaders === 1 ? "" : "s"}`);
  return parts.length > 0 ? ` (${parts.join(" · ")})` : "";
}

/** Same copy the daily cron / debug test use — driven by current kingdom state. */
export async function buildReviewReminderPayload(
  userId: string,
): Promise<ReviewReminderSnapshot> {
  const [fire, rubble, invaders] = await Promise.all([
    prisma.reviewState.count({ where: { userId, state: "fire" } }),
    prisma.reviewState.count({ where: { userId, state: "rubble" } }),
    prisma.dailyConquest.count({
      where: { userId, estDay: estDayKey() },
    }),
  ]);

  const hasAlerts = fire > 0 || rubble > 0 || invaders > 0;
  const body = hasAlerts
    ? `${urgencyBody(fire, rubble, invaders)}${countSuffix(fire, rubble, invaders)}`
    : urgencyBody(0, 0, 0);

  return {
    fire,
    rubble,
    invaders,
    title: TITLE,
    body,
    url: "/queue",
    hasAlerts,
  };
}
