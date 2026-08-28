import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type Comment = Database["public"]["Tables"]["comments"]["Row"];

export async function listCommentsByPost(
  supabase: SupabaseClient<Database>,
  postId: string,
): Promise<Comment[]> {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getCommentById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<Comment | null> {
  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getCommentCountsForPosts(
  supabase: SupabaseClient<Database>,
  postIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (postIds.length === 0) return counts;

  const { data, error } = await supabase
    .from("comments")
    .select("post_id")
    .in("post_id", postIds);
  if (error) throw error;

  for (const row of data) {
    counts.set(row.post_id, (counts.get(row.post_id) ?? 0) + 1);
  }
  return counts;
}

export async function createComment(
  supabase: SupabaseClient<Database>,
  postId: string,
  authorId: string,
  body: string,
  parentId: string | null = null,
): Promise<Comment> {
  const { data, error } = await supabase
    .from("comments")
    .insert({ post_id: postId, author_id: authorId, body, parent_id: parentId })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteComment(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("comments").delete().eq("id", id);
  if (error) throw error;
}
