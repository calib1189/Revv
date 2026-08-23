import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** Records a view — a no-op if this viewer already viewed this post
 * (unique constraint), so repeat scrolls past the same post don't inflate
 * the count. Not an error case; swallow the conflict. */
export async function recordPostView(
  supabase: SupabaseClient<Database>,
  postId: string,
  viewerId: string,
): Promise<void> {
  const { error } = await supabase
    .from("post_views")
    .insert({ post_id: postId, viewer_id: viewerId });

  // 23505 = unique_violation (already viewed) — expected, not a failure.
  if (error && error.code !== "23505") throw error;
}

export async function getViewCount(
  supabase: SupabaseClient<Database>,
  postId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("post_views")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId);
  if (error) throw error;
  return count ?? 0;
}

/** post_id -> view count, for a batch of posts (avoids N+1 count queries). */
export async function getViewCountsForPosts(
  supabase: SupabaseClient<Database>,
  postIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (postIds.length === 0) return counts;

  const { data, error } = await supabase
    .from("post_views")
    .select("post_id")
    .in("post_id", postIds);
  if (error) throw error;

  for (const row of data) {
    counts.set(row.post_id, (counts.get(row.post_id) ?? 0) + 1);
  }
  return counts;
}
