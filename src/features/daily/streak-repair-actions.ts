"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getPointsBalance } from "@/lib/db/points";
import { insertStreakRepairs } from "@/lib/db/streak-repairs";
import { listStreakDays } from "@/lib/daily/streak-days";
import { dailyDateKey } from "@/lib/daily/day";
import { streakRepairOffer } from "@/lib/streak/repair";

export interface RestoreStreakResult {
  error: string | null;
  /** The streak once restored. */
  restoredTo?: number;
}

/** Restores your lost streak for points. Everything is checked again
 * here, from the server's own copy of your days: that there's a streak
 * to restore, what it costs, and that you have the points. The charge
 * is keyed to the day, so a double tap can't charge twice; if filling
 * the days then fails, the charge is taken back. */
export async function restoreStreakAction(): Promise<RestoreStreakResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to restore your streak." };
  const supabase = await createClient();
  const today = dailyDateKey();

  const days = await listStreakDays(supabase, user.id);
  const offer = streakRepairOffer(days, today, days.lastRepairKey);
  if (!offer) return { error: "There's no streak to restore right now." };

  const balance = await getPointsBalance(supabase, user.id);
  if (balance < offer.cost) return { error: `Restoring takes ${offer.cost} points. You have ${balance}.` };

  const service = createServiceRoleClient();
  const { error: chargeError } = await service.from("points_ledger").upsert(
    { user_id: user.id, amount: -offer.cost, source_type: "streak_repair", source_id: today },
    { onConflict: "user_id,source_type,source_id", ignoreDuplicates: true },
  );
  if (chargeError) {
    // Most likely 0133 isn't applied yet, so the ledger refuses the type.
    console.error("streak repair charge failed:", chargeError);
    return { error: "Restoring streaks isn't available right now. Try again later." };
  }

  try {
    await insertStreakRepairs(service, user.id, offer.missingDays);
  } catch (err) {
    console.error("streak repair failed, refunding:", err);
    const { error: refundError } = await service
      .from("points_ledger")
      .delete()
      .eq("user_id", user.id)
      .eq("source_type", "streak_repair")
      .eq("source_id", today);
    if (refundError) console.error("streak repair refund failed:", user.id, today, refundError);
    return { error: "Couldn't restore your streak. You haven't been charged." };
  }

  revalidatePath("/daily");
  revalidatePath("/store");
  return { error: null, restoredTo: offer.restoredTo };
}
