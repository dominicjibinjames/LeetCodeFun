import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { normalizeDatabaseUrl } from "../lib/database-url";
import { seedUserProblems } from "../lib/seed-user";

const adapter = new PrismaPg({
  connectionString: normalizeDatabaseUrl(process.env.DATABASE_URL!),
});
const prisma = new PrismaClient({ adapter });

async function main() {
  let user = await prisma.user.findFirst({
    where: { authJsUserId: { not: null } },
    orderBy: { createdAt: "asc" },
  });
  if (!user) {
    user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  }
  if (!user) {
    user = await prisma.user.create({
      data: { xp: 0, streakDays: 0, authJsUserId: "local-seed" },
    });
    console.log("Created seed user", user.id);
  }

  const { created, updated } = await seedUserProblems(prisma, user.id);
  console.log(`Seed complete. created=${created} updated=${updated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
