import catalog from "@/data/problems/catalog.json";

export const GUEST_ID_PREFIX = "guest_";

export type GuestProblemView = {
  id: string;
  userId: string;
  title: string;
  leetcodeUrl: string;
  statement: string;
  district: string;
  patternPrimary: string;
  difficulty: string;
  buildingSlot: string;
  businessUseCases: null;
  createdAt: Date;
  reviewState: {
    id: string;
    state: string;
    box: number;
    nextReviewDate: Date;
    consecutiveMisses: number;
    fireSince: Date | null;
  };
};

export function isGuestProblemId(id: string): boolean {
  return id.startsWith(GUEST_ID_PREFIX);
}

export function guestProblemId(buildingSlot: string): string {
  return `${GUEST_ID_PREFIX}${buildingSlot}`;
}

export function guestProblems(): GuestProblemView[] {
  return catalog.map((item) => ({
    id: guestProblemId(item.buildingSlot),
    userId: "guest",
    title: item.title,
    leetcodeUrl: `https://leetcode.com/problems/${item.slug}/`,
    statement: item.statement,
    district: item.districtId,
    patternPrimary: item.patternPrimary,
    difficulty: item.difficulty,
    buildingSlot: item.buildingSlot,
    businessUseCases: null,
    createdAt: new Date(0),
    reviewState: {
      id: `guest-rs-${item.buildingSlot}`,
      state: "unattempted",
      box: 1,
      nextReviewDate: new Date(),
      consecutiveMisses: 0,
      fireSince: null,
    },
  }));
}

export function guestProblemById(id: string): GuestProblemView | null {
  if (!isGuestProblemId(id)) return null;
  const slot = id.slice(GUEST_ID_PREFIX.length);
  return guestProblems().find((p) => p.buildingSlot === slot) ?? null;
}

export function guestProblemBySlot(buildingSlot: string): GuestProblemView | null {
  return guestProblems().find((p) => p.buildingSlot === buildingSlot) ?? null;
}
