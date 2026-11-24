import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { ChestPrize, ChestTier } from "@/lib/streak/chest";

export type StreakChestRow = Database["public"]["Tables"]["streak_chests"]["Row"];

export interface StreakChest {
  chestDate: string;
  tier: ChestTier;
  points: number;
  itemId: string | null;
  openedAt: string | null;
}

function toChest(row: StreakChestRow): StreakChest {
  return { chestDate: row.chest_date, tier: row.tier, points: row.points, itemId: row.item_id, openedAt: row.opened_at };
}

/** Whether someone has had a chest before: the first is always a cosmetic. */
export async function hasAnyStreakChest(service: SupabaseClient<Database>, userId: string): Promise<boolean> {
  const { data, error } = await service.from("streak_chests").select("chest_date").eq("user_id", userId).limit(1);
  if (error) throw error;
  return data.length > 0;
}

/** Records a chest's draw. One per person per Sorza day (the primary
 * key): returns false if that day's chest was already drawn, in which
 * case the caller pays nothing (it already has). Server only. */
export async function insertStreakChest(
  service: SupabaseClient<Database>,
  userId: string,
  chestDate: string,
  prize: ChestPrize,
): Promise<boolean> {
  const { data, error } = await service
    .from("streak_chests")
    .upsert(
      { user_id: userId, chest_date: chestDate, tier: prize.tier, points: prize.points, item_id: prize.itemId },
      { onConflict: "user_id,chest_date", ignoreDuplicates: true },
    )
    .select("chest_date");
  if (error) throw error;
  return (data ?? []).length > 0;
}

/** Your most recent chest you haven't opened yet, if any. RLS: own only. */
export async function getUnopenedStreakChest(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<StreakChest | null> {
  const { data, error } = await supabase
    .from("streak_chests")
    .select("*")
    .eq("user_id", userId)
    .is("opened_at", null)
    .order("chest_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? toChest(data) : null;
}

/** Marks a chest opened (the first time only) and returns it. Server
 * only; the caller has checked who is asking. */
export async function openStreakChest(
  service: SupabaseClient<Database>,
  userId: string,
  chestDate: string,
): Promise<StreakChest | null> {
  await service
    .from("streak_chests")
    .update({ opened_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("chest_date", chestDate)
    .is("opened_at", null);
  const { data, error } = await service
    .from("streak_chests")
    .select("*")
    .eq("user_id", userId)
    .eq("chest_date", chestDate)
    .maybeSingle();
  if (error) throw error;
  return data ? toChest(data) : null;
}
