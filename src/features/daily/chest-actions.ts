"use server";

import { getCurrentUser } from "@/lib/auth/get-user";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { openStreakChest } from "@/lib/db/streak-chests";
import type { ChestTier } from "@/lib/streak/chest";

export type OpenChestResult =
  | { error: string }
  | { error: null; tier: ChestTier; points: number; itemId: string | null };

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Opens one of your streak chests: marks it opened and says what was in
 * it. The prize was drawn and paid when the chest was earned
 * (lib/daily/rewards.ts); opening only reveals it, so opening twice, or
 * never, changes nothing about what you have. */
export async function openStreakChestAction(chestDate: string): Promise<OpenChestResult> {
  if (!DATE_KEY.test(chestDate)) return { error: "That garage isn't available." };
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to open your garage." };
  try {
    const chest = await openStreakChest(createServiceRoleClient(), user.id, chestDate);
    if (!chest) return { error: "That garage isn't available." };
    // No revalidation here: the page would redraw mid-animation with no
    // chest left to open. The reveal refreshes it once it's closed.
    return { error: null, tier: chest.tier, points: chest.points, itemId: chest.itemId };
  } catch (err) {
    console.error("openStreakChestAction failed:", err);
    return { error: "Couldn't open your garage. Try again." };
  }
}
