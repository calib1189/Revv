import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Post } from "@/lib/db/posts";

export async function savePost(
  supabase: SupabaseClient<Database>,
  userId: string,
  postId: string,
): Promise<void> {
  const { error } = await supabase
    .from("saves")
    .insert({ user_id: userId, post_id: postId });
  if (error) throw error;
}

export async function unsavePost(
  supabase: SupabaseClient<Database>,
  userId: string,
  postId: string,
): Promise<void> {
  const { error } = await supabase
    .from("saves")
    .delete()
    .eq("user_id", userId)
    .eq("post_id", postId);
  if (error) throw error;
}

export async function getSavedPostIds(
  supabase: SupabaseClient<Database>,
  userId: string,
  postIds: string[],
): Promise<Set<string>> {
  if (postIds.length === 0) return new Set();

  const { data, error } = await supabase
    .from("saves")
    .select("post_id")
    .eq("user_id", userId)
    .in("post_id", postIds);
  if (error) throw error;

  return new Set(data.map((row) => row.post_id));
}

export async function listSavedPosts(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Post[]> {
  const { data: saveRows, error: saveError } = await supabase
    .from("saves")
    .select("post_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (saveError) throw saveError;
  if (saveRows.length === 0) return [];

  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("*")
    .in(
      "id",
      saveRows.map((row) => row.post_id),
    );
  if (postsError) throw postsError;

  const postById = new Map(posts.map((post) => [post.id, post]));
  return saveRows
    .map((row) => postById.get(row.post_id))
    .filter((post): post is Post => Boolean(post));
}
