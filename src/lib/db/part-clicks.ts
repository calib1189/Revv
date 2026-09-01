import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** Records a Buy-button click on a build_part — every click counts, not
 * just the first (see migration 0062 for why). Never called for a
 * logged-out clicker, matching post_views' anti-inflation convention. */
export async function recordPartClick(
  supabase: SupabaseClient<Database>,
  buildPartId: string,
  clickerId: string,
): Promise<void> {
  const { error } = await supabase
    .from("part_clicks")
    .insert({ build_part_id: buildPartId, clicker_id: clickerId });
  if (error) throw error;
}

/** build_part_id -> click count, for a batch of build_parts — backs the
 * "X clicks" indicator a build owner sees next to their own listed mods. */
export async function getPartClickCountsForBuildParts(
  supabase: SupabaseClient<Database>,
  buildPartIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (buildPartIds.length === 0) return counts;

  const { data, error } = await supabase
    .from("part_clicks")
    .select("build_part_id")
    .in("build_part_id", buildPartIds);
  if (error) throw error;

  for (const row of data) {
    counts.set(row.build_part_id, (counts.get(row.build_part_id) ?? 0) + 1);
  }
  return counts;
}
