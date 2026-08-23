import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type Post = Database["public"]["Tables"]["posts"]["Row"];
export type PostInsert = Database["public"]["Tables"]["posts"]["Insert"];

export async function listFeedPosts(
  supabase: SupabaseClient<Database>,
  { before, limit = 12 }: { before?: string; limit?: number } = {},
): Promise<Post[]> {
  let query = supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) query = query.lt("created_at", before);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function listVideoPosts(
  supabase: SupabaseClient<Database>,
  { before, limit = 6 }: { before?: string; limit?: number } = {},
): Promise<Post[]> {
  let query = supabase
    .from("posts")
    .select("*")
    .eq("post_type", "video")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) query = query.lt("created_at", before);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function listPostsByAuthor(
  supabase: SupabaseClient<Database>,
  authorId: string,
): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("author_id", authorId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getPostById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<Post | null> {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createPost(
  supabase: SupabaseClient<Database>,
  input: PostInsert,
): Promise<Post> {
  const { data, error } = await supabase
    .from("posts")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deletePost(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) throw error;
}
