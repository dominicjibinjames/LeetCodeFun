import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      xp: true,
      _count: { select: { pushSubscriptions: true } },
    },
    orderBy: { xp: "desc" },
  });
  console.log(
    JSON.stringify(
      users.map((u) => ({
        idPrefix: u.id.slice(0, 8),
        emailDomain: u.email?.includes("@") ? u.email.split("@")[1] : null,
        name: u.name,
        xp: u.xp,
        pushSubs: u._count.pushSubscriptions,
      })),
      null,
      2,
    ),
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
