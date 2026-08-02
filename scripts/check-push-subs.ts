import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  const n = await prisma.pushSubscription.count();
  const rows = await prisma.pushSubscription.findMany({
    select: { userId: true, endpoint: true, createdAt: true, p256dh: true, auth: true },
  });
  console.log(
    JSON.stringify(
      {
        n,
        rows: rows.map((r) => ({
          u: r.userId.slice(0, 8),
          host: (() => {
            try {
              return new URL(r.endpoint).host;
            } catch {
              return "bad";
            }
          })(),
          keyLens: { p256dh: r.p256dh.length, auth: r.auth.length },
          created: r.createdAt,
        })),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
