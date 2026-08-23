import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Post } from "@/lib/db/posts";
import { listPostMediaForPosts } from "@/lib/db/post-media";
import { getLikeCountsForPosts, getLikedPostIds } from "@/lib/db/likes";
import { getCommentCountsForPosts } from "@/lib/db/comments";
import { getSavedPostIds } from "@/lib/db/saves";
import { publicMediaUrl } from "@/lib/db/media";
import type { Vehicle } from "@/lib/db/vehicles";
import type { Profile } from "@/lib/db/profiles";
import type { PostCardData } from "@/features/feed/post-card";

export async function composePostCards(
  supabase: SupabaseClient<Database>,
  posts: Post[],
  currentUserId: string | null,
): Promise<PostCardData[]> {
  if (posts.length === 0) return [];

  const postIds = posts.map((p) => p.id);
  const authorIds = [...new Set(posts.map((p) => p.author_id))];
  const vehicleIds = [
    ...new Set(
      posts.map((p) => p.vehicle_id).filter((id): id is string => Boolean(id)),
    ),
  ];

  const [postMedia, likeCounts, commentCounts, likedIds, savedIds, authors, vehicles] =
    await Promise.all([
      listPostMediaForPosts(supabase, postIds),
      getLikeCountsForPosts(supabase, postIds),
      getCommentCountsForPosts(supabase, postIds),
      currentUserId
        ? getLikedPostIds(supabase, currentUserId, postIds)
        : Promise.resolve(new Set<string>()),
      currentUserId
        ? getSavedPostIds(supabase, currentUserId, postIds)
        : Promise.resolve(new Set<string>()),
      supabase.from("profiles").select("*").in("id", authorIds),
      vehicleIds.length > 0
        ? supabase.from("vehicles").select("*").in("id", vehicleIds)
        : Promise.resolve({ data: [] as Vehicle[], error: null }),
    ]);

  const authorById = new Map(
    (authors.data ?? []).map((a: Profile) => [a.id, a]),
  );
  const vehicleById = new Map(
    (vehicles.data ?? []).map((v: Vehicle) => [v.id, v]),
  );
  const mediaByPost = new Map<string, string[]>();
  for (const pm of postMedia) {
    const list = mediaByPost.get(pm.post_id) ?? [];
    list.push(publicMediaUrl(supabase, pm.media.storage_path));
    mediaByPost.set(pm.post_id, list);
  }

  return posts.map((post) => {
    const vehicle = post.vehicle_id ? vehicleById.get(post.vehicle_id) : null;
    return {
      post,
      authorUsername: authorById.get(post.author_id)?.username ?? "unknown",
      vehicleTitle: vehicle
        ? vehicle.nickname || `${vehicle.make} ${vehicle.model}`
        : null,
      photoUrls: mediaByPost.get(post.id) ?? [],
      likeCount: likeCounts.get(post.id) ?? 0,
      commentCount: commentCounts.get(post.id) ?? 0,
      isLiked: likedIds.has(post.id),
      isSaved: savedIds.has(post.id),
      isAuthenticated: Boolean(currentUserId),
    };
  });
}
