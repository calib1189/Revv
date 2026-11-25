import { trackDay, TRACK_LENGTH } from "@/lib/streak/track";

/** The evening push when a streak is about to end: how long it is, that
 * one thing today keeps it, and, when playing today would earn a chest,
 * that too. `streak` is the run so far (today not yet played). */
export function streakEndingBody(streak: number): string {
  const chestTonight = trackDay(streak + 1) === TRACK_LENGTH;
  return chestTonight
    ? `Your ${streak}-day streak ends at midnight, and one vote tonight opens your day-${streak + 1} chest.`
    : `Your ${streak}-day streak ends at midnight. One vote keeps it going.`;
}

/** The evening push for an earned chest that hasn't been opened. */
export function chestWaitingBody(): string {
  return "Your streak chest is still closed. Open it to see what you got.";
}
