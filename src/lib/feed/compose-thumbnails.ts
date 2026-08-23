import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Post } from "@/lib/db/posts";
import { listPostMediaForPosts } from "@/lib/db/post-media";
import { getProfilesByIds } from "@/lib/db/profiles";
import { publicMediaUrl } from "@/lib/db/media";
import { getViewCountsForPosts } from "@/lib/db/post-views";
import type { PostThumbnail } from "@/features/profile/post-thumbnail-grid";

/** Builds grid thumbnails for a list of posts that may span multiple
 * authors (e.g. a saved/liked list), resolving each post's first media and
 * its actual author's username rather than assuming one profile owns all
 * of them. */
export async function composeThumbnails(
  supabase: SupabaseClient<Database>,
  posts: Post[],
): Promise<PostThumbnail[]> {
  if (posts.length === 0) return [];

  const [postMedia, authors, viewCounts] = await Promise.all([
    listPostMediaForPosts(supabase, posts.map((p) => p.id)),
    getProfilesByIds(supabase, [...new Set(posts.map((p) => p.author_id))]),
    getViewCountsForPosts(supabase, posts.map((p) => p.id)),
  ]);

  const firstMediaByPost = new Map<string, (typeof postMedia)[number]>();
  for (const pm of postMedia) {
    if (!firstMediaByPost.has(pm.post_id)) firstMediaByPost.set(pm.post_id, pm);
  }
  const authorUsernameById = new Map(authors.map((a) => [a.id, a.username]));

  return posts.map((post) => {
    const media = firstMediaByPost.get(post.id);
    return {
      postId: post.id,
      url: media ? publicMediaUrl(supabase, media.media.storage_path) : null,
      kind: post.post_type,
      authorUsername: authorUsernameById.get(post.author_id) ?? "unknown",
      viewCount: viewCounts.get(post.id) ?? 0,
    };
  });
}
