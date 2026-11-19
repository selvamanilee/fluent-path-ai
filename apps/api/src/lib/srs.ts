// Spaced repetition: same day → next day → 3 days → 7 days → 14 days → mastered.
export const STAGE_OFFSETS_HOURS = [4, 24, 72, 168, 336] as const;
export const MASTERED = 5;

export function nextReview(stage: number, correct: boolean, now = new Date()): { stage: number; dueAt: Date } {
  if (!correct) return { stage: 0, dueAt: new Date(now.getTime() + STAGE_OFFSETS_HOURS[0] * 3600_000) };
  const next = Math.min(stage + 1, MASTERED);
  if (next >= MASTERED) return { stage: MASTERED, dueAt: new Date(now.getTime() + 3650 * 86400_000) };
  return { stage: next, dueAt: new Date(now.getTime() + STAGE_OFFSETS_HOURS[next] * 3600_000) };
}

export function firstReview(now = new Date()) {
  return { stage: 0, dueAt: new Date(now.getTime() + STAGE_OFFSETS_HOURS[0] * 3600_000) };
}
