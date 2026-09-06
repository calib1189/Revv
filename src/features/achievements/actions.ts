"use server";

import { revalidatePath } from "next/cache";
import { requireConfirmedUser } from "@/lib/auth/require-confirmed-user";
import { updateShowcasedAchievements } from "@/lib/db/profiles";
import { listUnlockedAchievements } from "@/lib/db/user-achievements";
import { getAchievement } from "@/lib/achievements/catalog";

const MAX_SHOWCASED = 3;

export interface ShowcaseState {
  error: string | null;
}

/** Pins up to 3 of the caller's own unlocked achievements to their
 * profile header. Every id gets checked against both the real catalog
 * (a stale/removed id) and the caller's own unlock log (never someone
 * else's, never one they haven't actually earned) — the DB's own check
 * constraint on array length is a backstop, not the only guard. */
export async function updateShowcaseAction(achievementIds: string[]): Promise<ShowcaseState> {
  if (achievementIds.length > MAX_SHOWCASED) {
    return { error: `You can showcase up to ${MAX_SHOWCASED} achievements.` };
  }
  if (new Set(achievementIds).size !== achievementIds.length) {
    return { error: "Duplicate achievement." };
  }
  if (!achievementIds.every((id) => getAchievement(id) != null)) {
    return { error: "Invalid achievement." };
  }

  const { supabase, user } = await requireConfirmedUser();

  const unlocked = await listUnlockedAchievements(supabase, user.id);
  const unlockedIds = new Set(unlocked.map((a) => a.achievement_id));
  if (!achievementIds.every((id) => unlockedIds.has(id))) {
    return { error: "You can only showcase achievements you've unlocked." };
  }

  try {
    const profile = await updateShowcasedAchievements(supabase, user.id, achievementIds);
    revalidatePath(`/u/${profile.username}`);
  } catch (err) {
    console.error("updateShowcaseAction failed:", err);
    return { error: "Couldn't update your showcase. Try again." };
  }

  return { error: null };
}
