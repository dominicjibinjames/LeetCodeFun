import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

/** Signed-in app user, or null for guests. */
export async function getSessionUser(): Promise<User | null> {
  const session = await auth();
  const appUserId = session?.appUserId;
  // #region agent log
  fetch("http://127.0.0.1:7792/ingest/48f6c65e-228d-42ba-b906-d4f53717a7c3", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "9e8e6e",
    },
    body: JSON.stringify({
      sessionId: "9e8e6e",
      runId: "pre-fix",
      hypothesisId: "B",
      location: "session-user.ts:getSessionUser",
      message: "RSC/auth() session lookup",
      data: {
        hasSession: Boolean(session),
        hasAppUserId: Boolean(appUserId),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  if (!appUserId) return null;
  return prisma.user.findUnique({ where: { id: appUserId } });
}

/** Require a signed-in user or throw. */
export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function isSignedIn(): Promise<boolean> {
  const session = await auth();
  return Boolean(session?.appUserId);
}
