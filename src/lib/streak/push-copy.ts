import { trackDay, TRACK_LENGTH } from "@/lib/streak/track";

/** The evening push when a streak is about to end: how long it is, that
 * one thing today keeps it, and, when playing today would unlock a garage,
 * that too. `streak` is the run so far (today not yet played). */
export function streakEndingBody(streak: number): string {
  const chestTonight = trackDay(streak + 1) === TRACK_LENGTH;
  return chestTonight
    ? `Your ${streak}-day streak ends at midnight, and one vote tonight unlocks your day-${streak + 1} garage.`
    : `Your ${streak}-day streak ends at midnight. One vote keeps it going.`;
}

/** The evening push for an earned garage that hasn't been opened. */
export function chestWaitingBody(): string {
  return "Your streak garage is still locked. Open it to see what's inside.";
}
