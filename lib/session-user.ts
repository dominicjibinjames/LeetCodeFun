import { cache } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

/** Signed-in app user, or null for guests. Deduped once per RSC/request. */
export const getSessionUser = cache(async (): Promise<User | null> => {
  const session = await auth();
  const appUserId = session?.appUserId;
  if (!appUserId) return null;
  return prisma.user.findUnique({ where: { id: appUserId } });
});

/** Require a signed-in user or throw. */
export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function isSignedIn(): Promise<boolean> {
  const user = await getSessionUser();
  return Boolean(user);
}
