import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";

export interface CommentPhoto {
  url: string;
  width: number | null;
  height: number | null;
}

/** The photos on a set of comments (0134), by comment id. Comments
 * without one, or whose photo is gone, aren't in the map. */
export async function getCommentPhotos(
  supabase: SupabaseClient<Database>,
  comments: readonly { id: string; media_id?: string | null }[],
): Promise<Map<string, CommentPhoto>> {
  const withPhoto = comments.filter((c): c is { id: string; media_id: string } => Boolean(c.media_id));
  if (withPhoto.length === 0) return new Map();
  const media = await getMediaByIds(supabase, [...new Set(withPhoto.map((c) => c.media_id))]);
  const byId = new Map(media.map((m) => [m.id, m]));
  const photos = new Map<string, CommentPhoto>();
  for (const c of withPhoto) {
    const m = byId.get(c.media_id);
    if (m) photos.set(c.id, { url: publicMediaUrl(supabase, m.storage_path), width: m.width, height: m.height });
  }
  return photos;
}
