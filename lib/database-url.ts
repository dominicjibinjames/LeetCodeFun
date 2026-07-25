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

/**
 * Prisma Postgres: app traffic must use the pooled hostname. Direct `db.prisma.io`
 * only allows ~10 connections and times out under Next.js RSC concurrency.
 * @see https://www.prisma.io/docs/postgres/database/connecting-to-your-database
 */
export function toPooledDatabaseUrl(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    if (url.hostname === "db.prisma.io") {
      url.hostname = "pooled.db.prisma.io";
    }
    return url.toString();
  } catch {
    return connectionString.replace("@db.prisma.io", "@pooled.db.prisma.io");
  }
}

export function toDirectDatabaseUrl(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    if (url.hostname === "pooled.db.prisma.io") {
      url.hostname = "db.prisma.io";
    }
    return url.toString();
  } catch {
    return connectionString.replace("@pooled.db.prisma.io", "@db.prisma.io");
  }
}
