/** The walkthrough, in order. The index is what's stored as `step`. */
export const TUTORIAL_STEPS = ["welcome", "feed", "garage", "ratings", "leaderboard", "discover", "connect"] as const;
export type TutorialStepId = (typeof TUTORIAL_STEPS)[number];
export const TUTORIAL_LAST_STEP = TUTORIAL_STEPS.length - 1;

export type TutorialOutcome = "finished" | "skipped";

/** Any stored or client-sent value, made into a valid step index. */
export function clampTutorialStep(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(TUTORIAL_LAST_STEP, Math.max(0, Math.trunc(value)));
}

/**
 * Where the tour should open on its own for this person, or null when it
 * shouldn't open at all. No row yet means they've never seen it — every
 * account, old or new, starts at the welcome screen exactly once.
 */
export function tutorialStartStep(progress: { step: number; completed_at: string | null } | null): number | null {
  if (!progress) return 0;
  if (progress.completed_at) return null;
  return clampTutorialStep(progress.step);
}

/** Screens where the tour must never cover what someone is doing:
 * signing in, recovering a password, reading the legal pages. */
const BLOCKED_PREFIXES = ["/login", "/signup", "/auth", "/forgot-password", "/reset-password", "/legal"];

export function isTutorialBlockedPath(pathname: string): boolean {
  return BLOCKED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
