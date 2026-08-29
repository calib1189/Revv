import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** "This viewer watched this video all the way through" — distinct from
 * post_views, which only means the post crossed 60% visible for a
 * moment. No cooldown here: the client (swipe-slide.tsx) only ever
 * fires this once per mount via its own ref guard, so a duplicate would
 * mean a genuine rewatch (scrolled away and back), which is exactly as
 * real a signal as the first one. */
export async function recordPostViewCompletion(
  supabase: SupabaseClient<Database>,
  postId: string,
  viewerId: string,
): Promise<void> {
  const { error } = await supabase
    .from("post_view_completions")
    .insert({ post_id: postId, viewer_id: viewerId });
  if (error) throw error;
}

/** post_id -> completion count, for a batch of posts (avoids N+1 count queries). */
export async function getCompletionCountsForPosts(
  supabase: SupabaseClient<Database>,
  postIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (postIds.length === 0) return counts;

  const { data, error } = await supabase
    .from("post_view_completions")
    .select("post_id")
    .in("post_id", postIds);
  if (error) throw error;

  for (const row of data) {
    counts.set(row.post_id, (counts.get(row.post_id) ?? 0) + 1);
  }
  return counts;
}
