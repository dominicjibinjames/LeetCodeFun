/** Spaced repetition ladder: 1 day → 7 days → 10 days (cap). */
export const BOX_INTERVALS_DAYS = [1, 7, 10] as const;
export const MAX_BOX = BOX_INTERVALS_DAYS.length;

export type BuildingState = "unattempted" | "built" | "fire" | "rubble";

export function intervalForBox(box: number): number {
  const idx = Math.min(Math.max(box, 1), MAX_BOX) - 1;
  return BOX_INTERVALS_DAYS[idx];
}

export function nextReviewDate(from: Date, box: number): Date {
  const days = intervalForBox(box);
  const next = new Date(from);
  next.setDate(next.getDate() + days);
  next.setHours(9, 0, 0, 0);
  return next;
}

export function isReviewDue(nextReviewDateValue: Date, now = new Date()): boolean {
  return nextReviewDateValue.getTime() <= now.getTime();
}

export function isPastGrace(
  nextReviewDateValue: Date,
  graceDays = Number(process.env.REVIEW_GRACE_DAYS ?? 3),
  now = new Date(),
): boolean {
  const graceEnd = new Date(nextReviewDateValue);
  graceEnd.setDate(graceEnd.getDate() + graceDays);
  return now.getTime() > graceEnd.getTime();
}

export function markFire(fireSince: Date = new Date()): {
  state: BuildingState;
  fireSince: Date;
} {
  return { state: "fire", fireSince };
}

export function resetToRubble(): {
  box: number;
  nextReviewDate: Date;
  state: BuildingState;
  fireSince: null;
} {
  return {
    box: 1,
    nextReviewDate: nextReviewDate(new Date(), 1),
    state: "rubble",
    fireSince: null,
  };
}

export function initialBuild(): {
  box: number;
  nextReviewDate: Date;
  state: BuildingState;
  fireSince: null;
} {
  return {
    box: 1,
    nextReviewDate: nextReviewDate(new Date(), 1),
    state: "built",
    fireSince: null,
  };
}

export function promoteBox(currentBox: number): {
  box: number;
  nextReviewDate: Date;
  state: BuildingState;
  fireSince: null;
} {
  const box = Math.min(currentBox + 1, MAX_BOX);
  return {
    box,
    nextReviewDate: nextReviewDate(new Date(), box),
    state: "built",
    fireSince: null,
  };
}

export const XP_CLEAN_SOLVE = 50;
export const XP_CLEAN_REVIEW = 35;
export const XP_BOSS_BONUS = 25;
export const XP_COURT_OVERTIME = 20;
export const XP_MISS = -20;
