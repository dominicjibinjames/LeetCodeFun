import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { normalizeDatabaseUrl, toPooledDatabaseUrl } from "@/lib/database-url";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createClient() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is not set");
  }
  // Always prefer Prisma Postgres pooled endpoint for runtime queries.
  const connectionString = toPooledDatabaseUrl(normalizeDatabaseUrl(raw));
  const adapter = new PrismaPg({
    connectionString,
    // Stay well under plan limits; longer idle keeps warm connections usable.
    max: 5,
    idleTimeoutMillis: 60_000,
    connectionTimeoutMillis: 20_000,
    allowExitOnIdle: true,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
