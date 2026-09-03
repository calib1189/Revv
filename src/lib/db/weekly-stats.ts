import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export async function countPostsSince(
  supabase: SupabaseClient<Database>,
  authorId: string,
  since: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("author_id", authorId)
    .gte("created_at", since);
  if (error) throw error;
  return count ?? 0;
}

export async function countCommentsSince(
  supabase: SupabaseClient<Database>,
  authorId: string,
  since: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("comments")
    .select("*", { count: "exact", head: true })
    .eq("author_id", authorId)
    .gte("created_at", since);
  if (error) throw error;
  return count ?? 0;
}

/** Likes landing on any of `postIds` since `since` — engagement earned
 * this week, regardless of how old the post itself is (an old post
 * getting a fresh wave of likes still counts toward "get 20 likes this
 * week"). */
export async function countLikesReceivedSince(
  supabase: SupabaseClient<Database>,
  postIds: string[],
  since: string,
): Promise<number> {
  if (postIds.length === 0) return 0;
  const { count, error } = await supabase
    .from("likes")
    .select("*", { count: "exact", head: true })
    .in("post_id", postIds)
    .gte("created_at", since);
  if (error) throw error;
  return count ?? 0;
}
