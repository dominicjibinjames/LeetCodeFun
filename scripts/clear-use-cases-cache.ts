import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { normalizeDatabaseUrl } from "../lib/database-url";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: normalizeDatabaseUrl(process.env.DATABASE_URL!),
  }),
});

async function main() {
  const result = await prisma.problem.updateMany({
    data: { businessUseCases: Prisma.DbNull },
  });
  console.log("cleared cached use cases:", result.count);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
