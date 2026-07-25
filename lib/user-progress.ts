import { cache } from "react";
import { prisma } from "@/lib/prisma";

/** Map/shell progress rows — one query shared by layout + kingdom page per request. */
export const getUserProblemProgress = cache(async (userId: string) => {
  return prisma.problem.findMany({
    where: { userId },
    select: {
      id: true,
      district: true,
      buildingSlot: true,
      difficulty: true,
      createdAt: true,
      reviewState: { select: { state: true } },
    },
  });
});
