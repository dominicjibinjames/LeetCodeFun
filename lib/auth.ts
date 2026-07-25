/**
 * Legacy passphrase helpers — retired in favor of Auth.js.
 * Kept as no-ops so any stray imports fail closed.
 */
export async function isAuthenticated(): Promise<boolean> {
  const { auth } = await import("@/auth");
  const session = await auth();
  return Boolean(session?.appUserId);
}

export async function clearSessionCookie() {
  /* use POST /api/auth/logout / signOut */
}

export async function createSessionCookie() {
  throw new Error("Passphrase sessions removed — use Auth.js");
}

export function verifyPassphrase(_input: string): boolean {
  return false;
}
