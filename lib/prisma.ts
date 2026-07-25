import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaPostgresAdapter } from "@prisma/adapter-ppg";
import {
  normalizeDatabaseUrl,
  toDirectDatabaseUrl,
  toPooledDatabaseUrl,
} from "@/lib/database-url";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function isPrismaPostgresHost(connectionString: string): boolean {
  try {
    const host = new URL(connectionString).hostname;
    return host === "db.prisma.io" || host === "pooled.db.prisma.io";
  } catch {
    return /db\.prisma\.io/.test(connectionString);
  }
}

function createClient() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is not set");
  }
  const normalized = normalizeDatabaseUrl(raw);

  // Prisma Postgres: use HTTP/WebSocket serverless driver (no TCP pool exhaustion
  // under Next.js RSC stampede after OAuth redirect). Local Postgres keeps pg.
  if (isPrismaPostgresHost(normalized)) {
    const adapter = new PrismaPostgresAdapter({
      connectionString: toDirectDatabaseUrl(normalized),
    });
    return new PrismaClient({ adapter });
  }

  const adapter = new PrismaPg({
    connectionString: toPooledDatabaseUrl(normalized),
    max: 1,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 20_000,
    allowExitOnIdle: true,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
