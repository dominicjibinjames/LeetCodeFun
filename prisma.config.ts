import "dotenv/config";
import { defineConfig, env } from "prisma/config";
import { normalizeDatabaseUrl, toDirectDatabaseUrl } from "./lib/database-url";

// Migrations need the direct Prisma Postgres host (session continuity).
const migrateUrl = normalizeDatabaseUrl(
  toDirectDatabaseUrl(process.env.DIRECT_URL || process.env.DATABASE_URL || ""),
);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: migrateUrl || env("DATABASE_URL"),
  },
});
