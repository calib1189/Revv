/** Skipping the line for a Build Battle: an owner pays points so their
 * car leads the next battle. It buys the slot, never the result. */
export const SKIP_LINE = {
  price: 500,
  /** A car can pay its way in at most this often. */
  cooldownDays: 7,
  /** An unused spot is refunded after this long. */
  expiresDays: 3,
};

const DAY_MS = 86_400_000;

export type SkipLineState =
  | { kind: "ineligible" }
  | { kind: "queued"; refundsAt: string }
  | { kind: "cooldown"; availableAt: string }
  | { kind: "available"; balance: number; canAfford: boolean };

/** What the car page offers. `openRequestAt` is a paid spot still
 * waiting; `lastRequestAt` the newest one not refunded (used or open). */
export function skipLineState({
  eligible,
  openRequestAt,
  lastRequestAt,
  balance,
  now,
}: {
  eligible: boolean;
  openRequestAt: string | null;
  lastRequestAt: string | null;
  balance: number;
  now: Date;
}): SkipLineState {
  if (!eligible) return { kind: "ineligible" };
  if (openRequestAt) {
    return { kind: "queued", refundsAt: new Date(Date.parse(openRequestAt) + SKIP_LINE.expiresDays * DAY_MS).toISOString() };
  }
  if (lastRequestAt) {
    const availableAt = Date.parse(lastRequestAt) + SKIP_LINE.cooldownDays * DAY_MS;
    if (now.getTime() < availableAt) return { kind: "cooldown", availableAt: new Date(availableAt).toISOString() };
  }
  return { kind: "available", balance, canAfford: balance >= SKIP_LINE.price };
}

/** Whether a car can be in a battle at all: approved for the
 * leaderboard, scored, and with a cover photo (the battle shows it). */
export function canBattle(
  vehicle: { ownership_verification_status: string | null; hero_media_id: string | null },
  score: number | null,
): boolean {
  return vehicle.ownership_verification_status === "approved" && vehicle.hero_media_id !== null && score !== null;
}
