import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getActiveAnnouncementPost } from "@/lib/db/posts";
import { listPostMediaForPosts } from "@/lib/db/post-media";
import { getMediaById, publicMediaUrl } from "@/lib/db/media";
import { getProfileByUserId } from "@/lib/db/profiles";
import { hasSeenAnnouncement } from "@/lib/db/announcement-views";
import { postAnnouncement } from "@/lib/announcements";

export interface AnnouncementPopupData {
  postId: string;
  caption: string | null;
  media: { url: string; kind: "image" | "video"; width: number | null; height: number | null }[];
  author: { username: string; displayName: string | null; avatarUrl: string | null; verified: boolean };
}

/** The running pop-up post this member hasn't seen yet, ready to show, or
 * null. Any read failing also means null, so a broken read never puts it
 * on every launch. */
export async function loadAnnouncementPopup(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<AnnouncementPopupData | null> {
  try {
    const post = await getActiveAnnouncementPost(supabase, new Date().toISOString());
    if (!post) return null;
    if (await hasSeenAnnouncement(supabase, userId, postAnnouncement(post.id))) return null;

    const [media, author] = await Promise.all([
      listPostMediaForPosts(supabase, [post.id]),
      getProfileByUserId(supabase, post.author_id),
    ]);
    if (media.length === 0 || !author) return null;
    const avatar = author.avatar_media_id ? await getMediaById(supabase, author.avatar_media_id).catch(() => null) : null;

    return {
      postId: post.id,
      caption: post.caption,
      media: media.map((m) => ({
        url: publicMediaUrl(supabase, m.media.storage_path),
        kind: m.media.kind,
        width: m.media.width,
        height: m.media.height,
      })),
      author: {
        username: author.username,
        displayName: author.display_name,
        avatarUrl: avatar ? publicMediaUrl(supabase, avatar.storage_path) : null,
        verified: author.is_verified,
      },
    };
  } catch {
    return null;
  }
}
