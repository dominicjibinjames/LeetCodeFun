/**
 * node-postgres currently treats sslmode=require/prefer/verify-ca as verify-full
 * and emits a SECURITY WARNING. Prefer an explicit sslmode so Next.js does not
 * surface that warning as a console error overlay.
 */
export function normalizeDatabaseUrl(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    const mode = (url.searchParams.get("sslmode") ?? "").toLowerCase();
    if (mode === "require" || mode === "prefer" || mode === "verify-ca") {
      url.searchParams.set("sslmode", "verify-full");
    }
    return url.toString();
  } catch {
    // Fallback for non-URL connection strings
    return connectionString
      .replace(/([?&])sslmode=(require|prefer|verify-ca)\b/i, "$1sslmode=verify-full")
      .replace(/([?&])sslMode=(require|prefer|verify-ca)\b/i, "$1sslmode=verify-full");
  }
}
