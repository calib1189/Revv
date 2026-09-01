import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** Every rewatch counts (like TikTok/YouTube), not just the first —
 * but only once this viewer's last recorded view of this post is older
 * than the cooldown, so scrolling past (or a looping video re-crossing
 * the visibility threshold) can't spam a view per second. */
const VIEW_COOLDOWN_SECONDS = 30;

export async function recordPostView(
  supabase: SupabaseClient<Database>,
  postId: string,
  viewerId: string,
): Promise<void> {
  const cooldownCutoff = new Date(Date.now() - VIEW_COOLDOWN_SECONDS * 1000).toISOString();
  const { data: recent, error: recentError } = await supabase
    .from("post_views")
    .select("id")
    .eq("post_id", postId)
    .eq("viewer_id", viewerId)
    .gte("created_at", cooldownCutoff)
    .limit(1);
  if (recentError) throw recentError;
  if (recent.length > 0) return;

  const { error } = await supabase
    .from("post_views")
    .insert({ post_id: postId, viewer_id: viewerId });
  if (error) throw error;
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

/** post_id -> count of *distinct* viewers, for a batch of posts — every
 * rewatch counts toward getViewCountsForPosts' total, but a creator
 * asking "how many different people saw this" needs the distinct
 * count instead. PostgREST's count option counts rows, not unique
 * column values, so this has to dedupe client-side (same reasoning as
 * getActiveUserCounts in lib/analytics/queries.ts). */
export async function getUniqueViewerCountsForPosts(
  supabase: SupabaseClient<Database>,
  postIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (postIds.length === 0) return counts;

  const { data, error } = await supabase
    .from("post_views")
    .select("post_id, viewer_id")
    .in("post_id", postIds);
  if (error) throw error;

  const viewersByPost = new Map<string, Set<string>>();
  for (const row of data) {
    const viewers = viewersByPost.get(row.post_id) ?? new Set<string>();
    viewers.add(row.viewer_id);
    viewersByPost.set(row.post_id, viewers);
  }
  for (const [postId, viewers] of viewersByPost) {
    counts.set(postId, viewers.size);
  }
  return counts;
}
