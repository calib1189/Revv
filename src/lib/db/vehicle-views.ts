import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** Records a vehicle/garage page visit — `sourcePostId` is set only when
 * the viewer reached this vehicle via a `?from=<postId>` link from a
 * post (see swipe-slide.tsx / post-card.tsx), null for everything else.
 * Never called for a logged-out viewer or the vehicle's own owner —
 * see the call site in app/garage/[vehicleId]/page.tsx for why. */
export async function recordVehicleView(
  supabase: SupabaseClient<Database>,
  viewerId: string,
  vehicleId: string,
  sourcePostId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("vehicle_views")
    .insert({ viewer_id: viewerId, vehicle_id: vehicleId, source_post_id: sourcePostId });
  if (error) throw error;
}

/** post_id -> count of vehicle/garage visits attributed to it, for a
 * batch of posts — backs Creator Studio's per-post "garage visits"
 * stat. */
export async function getVehicleViewCountsBySourcePost(
  supabase: SupabaseClient<Database>,
  postIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (postIds.length === 0) return counts;

  const { data, error } = await supabase
    .from("vehicle_views")
    .select("source_post_id")
    .in("source_post_id", postIds);
  if (error) throw error;

  for (const row of data) {
    if (!row.source_post_id) continue;
    counts.set(row.source_post_id, (counts.get(row.source_post_id) ?? 0) + 1);
  }
  return counts;
}
