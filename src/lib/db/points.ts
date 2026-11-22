import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** Never stored — summed from the ledger at read time, same rule every
 * other derived number in this app follows. Fetching every row and
 * summing in JS is fine at this app's scale; a materialized view is
 * the documented escape hatch if the ledger ever gets big enough for
 * this to matter (CLAUDE.md: add a view and say so, not a column). */
export async function getPointsBalance(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("points_ledger")
    .select("amount")
    .eq("user_id", userId);

  if (error) throw error;
  return data.reduce((sum, row) => sum + row.amount, 0);
}

/** Batched, upsert-ignore-duplicates insert of earned points — same
 * pattern as insertAchievementUnlocks, so calling this again for a
 * source_id that already has a row (the achievement/challenge check
 * re-running on a later page visit, say) is a safe no-op rather than a
 * double-award, backed by the ledger's own unique(user_id, source_type,
 * source_id) constraint. */
export async function insertPointsEarned(
  supabase: SupabaseClient<Database>,
  userId: string,
  sourceType: "achievement" | "challenge",
  entries: { sourceId: string; amount: number }[],
): Promise<void> {
  if (entries.length === 0) return;
  const { error } = await supabase.from("points_ledger").upsert(
    entries.map(({ sourceId, amount }) => ({
      user_id: userId,
      amount,
      source_type: sourceType,
      source_id: sourceId,
    })),
    { onConflict: "user_id,source_type,source_id", ignoreDuplicates: true },
  );
  if (error) throw error;
}

/** Referral rewards (lib/invites/rewards.ts). Service-role client only:
 * the ledger has no client insert policy (0081). Returns how many rows
 * were actually new, so a re-run that pays nothing can say so. */
export async function insertReferralPoints(
  supabase: SupabaseClient<Database>,
  grants: { userId: string; sourceId: string; amount: number }[],
): Promise<number> {
  if (grants.length === 0) return 0;
  const { data, error } = await supabase
    .from("points_ledger")
    .upsert(
      grants.map((g) => ({ user_id: g.userId, amount: g.amount, source_type: "referral" as const, source_id: g.sourceId })),
      { onConflict: "user_id,source_type,source_id", ignoreDuplicates: true },
    )
    .select("user_id");
  if (error) throw error;
  return data.length;
}

export async function listOwnedItemIds(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("store_items_owned")
    .select("item_id")
    .eq("user_id", userId);

  if (error) throw error;
  return new Set(data.map((row) => row.item_id));
}

/** One admin grant (a promo, a make-good). Service-role client only: the
 * ledger has no client insert policy (0081). True when it was new, false
 * when this person already had it. */
export async function insertAdminGrant(
  supabase: SupabaseClient<Database>,
  userId: string,
  sourceId: string,
  amount: number,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("points_ledger")
    .upsert(
      { user_id: userId, amount, source_type: "admin_grant", source_id: sourceId },
      { onConflict: "user_id,source_type,source_id", ignoreDuplicates: true },
    )
    .select("user_id");
  if (error) throw error;
  return data.length > 0;
}
