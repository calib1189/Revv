/*
 * What's in a streak chest (every seventh day of a streak,
 * lib/streak/track.ts). Not everyone gets the same thing: each chest is
 * a draw, made once by the server when the day is earned and recorded
 * (streak_chests, 0132), so opening it later only reveals it.
 *
 * Mostly points, sometimes a cosmetic that can't be bought anywhere else
 * (streakOnly in the store catalog), rarely a very rare one. Your first
 * chest is always a Rare cosmetic, so the very first one feels like a
 * find. A cosmetic draw skips anything you already own, and if you own
 * every one at that rarity it pays DUPLICATE_POINTS instead.
 */

export type ChestTier = "common" | "uncommon" | "rare" | "epic" | "legendary";

/** The streak-only cosmetics, by the chest tier they turn up in. */
export const CHEST_ITEMS: Record<"rare" | "epic" | "legendary", readonly string[]> = {
  rare: ["name_afterburner", "bg_burnout", "frame_streak"],
  epic: ["bg_blue_flame", "frame_afterburner"],
  legendary: ["name_supernova"],
};

type Entry =
  | { tier: ChestTier; chance: number; points: number }
  | { tier: "rare" | "epic" | "legendary"; chance: number; item: true };

/** Every chest after the first. Chances add up to 1 (chest.test.ts). */
export const CHEST_TABLE: readonly Entry[] = [
  { tier: "common", chance: 0.5, points: 10 },
  { tier: "uncommon", chance: 0.25, points: 20 },
  { tier: "rare", chance: 0.1, points: 40 },
  { tier: "rare", chance: 0.12, item: true },
  { tier: "epic", chance: 0.025, item: true },
  { tier: "legendary", chance: 0.005, item: true },
];

/** A cosmetic draw that finds you own them all pays this instead. */
export const DUPLICATE_POINTS = 30;

/** What a chest pays while its table (0132) isn't there yet: no draw,
 * just points, the old day-seven amount. */
export const FALLBACK_CHEST_POINTS = 15;

export interface ChestPrize {
  tier: ChestTier;
  points: number;
  itemId: string | null;
}

function pickItem(tier: "rare" | "epic" | "legendary", owned: ReadonlySet<string>, pick: number): string | null {
  const open = CHEST_ITEMS[tier].filter((id) => !owned.has(id));
  if (open.length === 0) return null;
  return open[Math.min(open.length - 1, Math.floor(pick * open.length))];
}

/** One chest's prize. `roll` and `pick` are independent random numbers
 * in [0, 1): `roll` decides the tier, `pick` which cosmetic. */
export function drawChest(
  roll: number,
  pick: number,
  { firstChest, owned }: { firstChest: boolean; owned: ReadonlySet<string> },
): ChestPrize {
  if (firstChest) {
    // A cosmetic, starting at Rare; climbing a tier only if you somehow
    // own every one below.
    for (const tier of ["rare", "epic", "legendary"] as const) {
      const itemId = pickItem(tier, owned, pick);
      if (itemId) return { tier, points: 0, itemId };
    }
    return { tier: "rare", points: DUPLICATE_POINTS, itemId: null };
  }

  let edge = 0;
  for (const entry of CHEST_TABLE) {
    edge += entry.chance;
    if (roll >= edge) continue;
    if ("points" in entry) return { tier: entry.tier, points: entry.points, itemId: null };
    const itemId = pickItem(entry.tier, owned, pick);
    return itemId ? { tier: entry.tier, points: 0, itemId } : { tier: entry.tier, points: DUPLICATE_POINTS, itemId: null };
  }
  // Only reachable through float rounding at roll ≈ 1.
  return { tier: "common", points: (CHEST_TABLE[0] as { points: number }).points, itemId: null };
}

/** Average points in a chest after the first. With `allOwned`, every
 * cosmetic draw pays DUPLICATE_POINTS: the most points a chest can
 * average, which economy.test.ts budgets for. */
export function chestExpectedPoints(allOwned: boolean): number {
  return CHEST_TABLE.reduce(
    (sum, entry) => sum + entry.chance * ("points" in entry ? entry.points : allOwned ? DUPLICATE_POINTS : 0),
    0,
  );
}

/** A random number in [0, 1) from the platform's secure generator. */
export function secureRandom(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 2 ** 32;
}
