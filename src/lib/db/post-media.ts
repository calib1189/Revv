import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Media } from "@/lib/db/media";

export type PostMedia = Database["public"]["Tables"]["post_media"]["Row"];
export type PostMediaWithMedia = PostMedia & { media: Media };

export async function listPostMediaForPosts(
  supabase: SupabaseClient<Database>,
  postIds: string[],
): Promise<PostMediaWithMedia[]> {
  if (postIds.length === 0) return [];

  const { data, error } = await supabase
    .from("post_media")
    .select("*, media(*)")
    .in("post_id", postIds)
    .order("position", { ascending: true });

  if (error) throw error;
  return data as PostMediaWithMedia[];
}

export async function addPostMedia(
  supabase: SupabaseClient<Database>,
  postId: string,
  mediaId: string,
  position: number,
): Promise<PostMedia> {
  const { data, error } = await supabase
    .from("post_media")
    .insert({ post_id: postId, media_id: mediaId, position })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
