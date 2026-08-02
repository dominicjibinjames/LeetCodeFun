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
  if (!initWebPush()) {
    // #region agent log
    fetch("http://127.0.0.1:7792/ingest/48f6c65e-228d-42ba-b906-d4f53717a7c3", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9e8e6e" },
      body: JSON.stringify({
        sessionId: "9e8e6e",
        runId: "push-debug",
        hypothesisId: "A",
        location: "lib/push.ts:sendPushToUser",
        message: "VAPID not configured — abort send",
        data: {
          hasPub: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
          hasPriv: Boolean(process.env.VAPID_PRIVATE_KEY),
          hasSubject: Boolean(process.env.VAPID_SUBJECT),
          subjectKind: (() => {
            const s = (process.env.VAPID_SUBJECT ?? "").trim();
            if (!s) return "empty";
            if (/^mailto:/i.test(s)) return "mailto";
            if (/^https?:\/\//i.test(s)) return "https";
            if (s.includes("@")) return "bare-email";
            return "other";
          })(),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return { sent: 0, failed: 0 };
  }

  const origin = appOrigin();
  const fullPayload = {
    ...payload,
    icon: `${origin}/icons/patterngard-192.png`,
    badge: `${origin}/icons/patterngard-badge.png`,
  };
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  let sent = 0;
  let failed = 0;
  // #region agent log
  fetch("http://127.0.0.1:7792/ingest/48f6c65e-228d-42ba-b906-d4f53717a7c3", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9e8e6e" },
    body: JSON.stringify({
      sessionId: "9e8e6e",
      runId: "push-debug",
      hypothesisId: "B",
      location: "lib/push.ts:sendPushToUser",
      message: "sending to subscriptions",
      data: {
        userIdPrefix: userId.slice(0, 8),
        subCount: subs.length,
        origin,
        titleLen: payload.title?.length ?? 0,
        endpoints: subs.map((s) => {
          try {
            return new URL(s.endpoint).host;
          } catch {
            return "bad-endpoint";
          }
        }),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
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
    } catch (err) {
      failed += 1;
      const statusCode =
        err && typeof err === "object" && "statusCode" in err
          ? Number((err as { statusCode?: number }).statusCode)
          : null;
      const body =
        err && typeof err === "object" && "body" in err
          ? String((err as { body?: unknown }).body ?? "").slice(0, 200)
          : "";
      // #region agent log
      fetch("http://127.0.0.1:7792/ingest/48f6c65e-228d-42ba-b906-d4f53717a7c3", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9e8e6e" },
        body: JSON.stringify({
          sessionId: "9e8e6e",
          runId: "push-debug",
          hypothesisId: "C",
          location: "lib/push.ts:sendNotification-catch",
          message: "webpush send failed",
          data: {
            statusCode,
            errName: err instanceof Error ? err.name : typeof err,
            errMessage: err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200),
            body,
            endpointHost: (() => {
              try {
                return new URL(sub.endpoint).host;
              } catch {
                return "bad";
              }
            })(),
            deletedSub: true,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
    }
  }
  // #region agent log
  fetch("http://127.0.0.1:7792/ingest/48f6c65e-228d-42ba-b906-d4f53717a7c3", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9e8e6e" },
    body: JSON.stringify({
      sessionId: "9e8e6e",
      runId: "push-debug",
      hypothesisId: "C",
      location: "lib/push.ts:sendPushToUser-done",
      message: "send finished",
      data: { sent, failed, subCount: subs.length },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  return { sent, failed };
}
