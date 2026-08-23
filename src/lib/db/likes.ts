import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Post } from "@/lib/db/posts";

export async function likePost(
  supabase: SupabaseClient<Database>,
  userId: string,
  postId: string,
): Promise<void> {
  const { error } = await supabase
    .from("likes")
    .insert({ user_id: userId, post_id: postId });
  if (error) throw error;
}

export async function unlikePost(
  supabase: SupabaseClient<Database>,
  userId: string,
  postId: string,
): Promise<void> {
  const { error } = await supabase
    .from("likes")
    .delete()
    .eq("user_id", userId)
    .eq("post_id", postId);
  if (error) throw error;
}

export async function getLikeCount(
  supabase: SupabaseClient<Database>,
  postId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("likes")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId);
  if (error) throw error;
  return count ?? 0;
}

/** post_id -> like count, for a batch of posts (avoids N+1 count queries). */
export async function getLikeCountsForPosts(
  supabase: SupabaseClient<Database>,
  postIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (postIds.length === 0) return counts;

  const { data, error } = await supabase
    .from("likes")
    .select("post_id")
    .in("post_id", postIds);
  if (error) throw error;

  for (const row of data) {
    counts.set(row.post_id, (counts.get(row.post_id) ?? 0) + 1);
  }
  return counts;
}

export async function listLikedPosts(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Post[]> {
  const { data: likeRows, error: likeError } = await supabase
    .from("likes")
    .select("post_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (likeError) throw likeError;
  if (likeRows.length === 0) return [];

  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("*")
    .in(
      "id",
      likeRows.map((row) => row.post_id),
    );
  if (postsError) throw postsError;

  const postById = new Map(posts.map((post) => [post.id, post]));
  return likeRows
    .map((row) => postById.get(row.post_id))
    .filter((post): post is Post => Boolean(post));
}

/** post_ids liked by this user, out of the given set. */
export async function getLikedPostIds(
  supabase: SupabaseClient<Database>,
  userId: string,
  postIds: string[],
): Promise<Set<string>> {
  if (postIds.length === 0) return new Set();

  const { data, error } = await supabase
    .from("likes")
    .select("post_id")
    .eq("user_id", userId)
    .in("post_id", postIds);
  if (error) throw error;

  return new Set(data.map((row) => row.post_id));
}
