import webpush from "web-push";
import { prisma } from "@/lib/prisma";

function configured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT,
  );
}

/** web-push requires a URL subject: mailto:… or https://… */
function vapidSubjectUrl(): string {
  const raw = (process.env.VAPID_SUBJECT ?? "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw) || /^mailto:/i.test(raw)) return raw;
  if (raw.includes("@")) return `mailto:${raw}`;
  return raw;
}

export function initWebPush() {
  if (!configured()) return false;
  webpush.setVapidDetails(
    vapidSubjectUrl(),
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  return true;
}

function appOrigin(): string {
  const raw =
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string },
) {
  if (!initWebPush()) return { sent: 0, failed: 0 };

  const origin = appOrigin();
  const fullPayload = {
    ...payload,
    icon: `${origin}/icons/patterngard-192.png`,
    badge: `${origin}/icons/patterngard-badge.png`,
  };
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  let sent = 0;
  let failed = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(fullPayload),
      );
      sent += 1;
    } catch {
      failed += 1;
      await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
    }
  }
  return { sent, failed };
}
