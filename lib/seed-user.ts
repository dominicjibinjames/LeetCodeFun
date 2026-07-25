import type { PrismaClient } from "@prisma/client";
import catalog from "../data/problems/catalog.json";

type CatalogItem = (typeof catalog)[number];

/**
 * Ensure catalog problems (+ unattempted review states) exist for this user.
 * Batched createMany — the old per-row loop was ~350–500 round-trips and
 * routinely timed out Prisma Postgres / Vercel on first OAuth login.
 */
export async function seedUserProblems(
  db: PrismaClient,
  userId: string,
): Promise<{ created: number; updated: number }> {
  const existing = await db.problem.findMany({
    where: { userId },
    select: { id: true, buildingSlot: true },
  });
  const existingSlots = new Set(existing.map((p) => p.buildingSlot));

  const missing = (catalog as CatalogItem[]).filter(
    (item) => !existingSlots.has(item.buildingSlot),
  );

  if (missing.length === 0) {
    return { created: 0, updated: 0 };
  }

  await db.problem.createMany({
    data: missing.map((item) => ({
      userId,
      title: item.title,
      leetcodeUrl: `https://leetcode.com/problems/${item.slug}/`,
      statement: item.statement,
      district: item.districtId,
      patternPrimary: item.patternPrimary,
      difficulty: item.difficulty,
      buildingSlot: item.buildingSlot,
    })),
    skipDuplicates: true,
  });

  const createdProblems = await db.problem.findMany({
    where: {
      userId,
      buildingSlot: { in: missing.map((m) => m.buildingSlot) },
    },
    select: { id: true },
  });

  const existingReviews = await db.reviewState.findMany({
    where: { userId, problemId: { in: createdProblems.map((p) => p.id) } },
    select: { problemId: true },
  });
  const reviewed = new Set(existingReviews.map((r) => r.problemId));
  const reviewRows = createdProblems
    .filter((p) => !reviewed.has(p.id))
    .map((p) => ({
      userId,
      problemId: p.id,
      box: 1,
      nextReviewDate: new Date(),
      state: "unattempted" as const,
    }));

  if (reviewRows.length) {
    await db.reviewState.createMany({ data: reviewRows, skipDuplicates: true });
  }

  return { created: createdProblems.length, updated: 0 };
}
