import type { PrismaClient } from "@prisma/client";
import catalog from "../data/problems/catalog.json";

/** Ensure all catalog problems (+ unattempted review states) exist for this user. */
export async function seedUserProblems(
  db: PrismaClient,
  userId: string,
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (const item of catalog) {
    const leetcodeUrl = `https://leetcode.com/problems/${item.slug}/`;
    const existing = await db.problem.findFirst({
      where: { userId, buildingSlot: item.buildingSlot },
    });

    if (existing) {
      await db.problem.update({
        where: { id: existing.id },
        data: {
          title: item.title,
          leetcodeUrl,
          statement: item.statement,
          district: item.districtId,
          patternPrimary: item.patternPrimary,
          difficulty: item.difficulty,
        },
      });
      updated += 1;
      continue;
    }

    const problem = await db.problem.create({
      data: {
        userId,
        title: item.title,
        leetcodeUrl,
        statement: item.statement,
        district: item.districtId,
        patternPrimary: item.patternPrimary,
        difficulty: item.difficulty,
        buildingSlot: item.buildingSlot,
      },
    });

    await db.reviewState.create({
      data: {
        userId,
        problemId: problem.id,
        box: 1,
        nextReviewDate: new Date(),
        state: "unattempted",
      },
    });
    created += 1;
  }

  return { created, updated };
}
