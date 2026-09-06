"use server";

import { revalidatePath } from "next/cache";
import { requireConfirmedUser } from "@/lib/auth/require-confirmed-user";
import { updateShowcasedAchievements } from "@/lib/db/profiles";
import {
  listUnlockedAchievements,
  getUserAchievement,
  markAchievementClaimed,
} from "@/lib/db/user-achievements";
import { getAchievement } from "@/lib/achievements/catalog";
import { pointsForAchievement } from "@/lib/points/values";

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

export interface ClaimState {
  error: string | null;
  amount: number | null;
}

/** Claims the points for one already-unlocked achievement. Unlike
 * updateShowcaseAction, this needs a real row lookup rather than
 * listUnlockedAchievements' full list — it also has to know
 * claimed_at, which the showcase check never needed. */
export async function claimAchievementPointsAction(achievementId: string): Promise<ClaimState> {
  const achievement = getAchievement(achievementId);
  if (!achievement) return { error: "Invalid achievement.", amount: null };

  const { supabase, user } = await requireConfirmedUser();

  const row = await getUserAchievement(supabase, user.id, achievementId);
  if (!row) return { error: "You haven't unlocked this yet.", amount: null };
  if (row.claimed_at) return { error: "Already claimed.", amount: null };

  const amount = pointsForAchievement(achievementId);
  try {
    const { error: ledgerError } = await supabase.from("points_ledger").insert({
      user_id: user.id,
      amount,
      source_type: "achievement",
      source_id: achievementId,
    });
    // A unique-constraint conflict here means someone else's concurrent
    // claim already inserted this exact row — not a real failure, just
    // a race this user lost to their own other tab/device.
    if (ledgerError && ledgerError.code !== "23505") throw ledgerError;

    await markAchievementClaimed(supabase, user.id, achievementId);
  } catch (err) {
    console.error("claimAchievementPointsAction failed:", err);
    return { error: "Couldn't claim points. Try again.", amount: null };
  }

  return { error: null, amount };
}
