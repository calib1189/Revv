import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export async function recordPostShare(
  supabase: SupabaseClient<Database>,
  postId: string,
  sharerId: string,
): Promise<void> {
  const { error } = await supabase
    .from("post_shares")
    .insert({ post_id: postId, sharer_id: sharerId });
  if (error) throw error;
}

/** post_id -> share count, for a batch of posts (avoids N+1 count queries). */
export async function getShareCountsForPosts(
  supabase: SupabaseClient<Database>,
  postIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (postIds.length === 0) return counts;

  const { data, error } = await supabase
    .from("post_shares")
    .select("post_id")
    .in("post_id", postIds);
  if (error) throw error;

  for (const row of data) {
    counts.set(row.post_id, (counts.get(row.post_id) ?? 0) + 1);
  }
  return counts;
}
