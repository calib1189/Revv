/** Matches the check on vehicles.ownership_rejection_reason (0108). */
export const REJECTION_REASON_MAX = 500;

/** The admin's note when rejecting a car: trimmed, empty means none. */
export function normalizeRejectionReason(raw: string | null | undefined): { reason: string | null; error?: string } {
  const reason = (raw ?? "").trim();
  if (reason.length > REJECTION_REASON_MAX) {
    return { reason: null, error: `Keep the message under ${REJECTION_REASON_MAX} characters.` };
  }
  return { reason: reason || null };
}

const PUSH_MAX = 160;

/** The rejection push. The full message is on the car page; a push only
 * has room for the start of it. */
export function rejectionPushBody(carName: string, reason: string | null): string {
  const lead = `${carName} wasn't approved for the leaderboard`;
  if (!reason) return `${lead}. Tap to see why.`;
  const full = `${lead}: ${reason}`;
  return full.length <= PUSH_MAX ? full : `${full.slice(0, PUSH_MAX - 1).trimEnd()}…`;
}
