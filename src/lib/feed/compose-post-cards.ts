import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Post } from "@/lib/db/posts";
import { listPostMediaForPosts } from "@/lib/db/post-media";
import { getLikeCountsForPosts, getLikedPostIds } from "@/lib/db/likes";
import { getCommentCountsForPosts } from "@/lib/db/comments";
import { getSavedPostIds, getSaveCountsForPosts } from "@/lib/db/saves";
import { getViewCountsForPosts } from "@/lib/db/post-views";
import { listFollowingIds } from "@/lib/db/follows";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { listActiveBuildsByVehicleIds } from "@/lib/db/builds";
import { listVehiclesByOwnerIds } from "@/lib/db/vehicles";
import type { Vehicle } from "@/lib/db/vehicles";
import type { Profile } from "@/lib/db/profiles";
import type { PostCardData, PostMediaItem } from "@/features/feed/post-card";

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

  const [
    postMedia,
    likeCounts,
    commentCounts,
    saveCounts,
    viewCounts,
    likedIds,
    savedIds,
    followingIds,
    authors,
    vehicles,
    authorVehicles,
  ] = await Promise.all([
    listPostMediaForPosts(supabase, postIds),
    getLikeCountsForPosts(supabase, postIds),
    getCommentCountsForPosts(supabase, postIds),
    getSaveCountsForPosts(supabase, postIds),
    getViewCountsForPosts(supabase, postIds),
    currentUserId
      ? getLikedPostIds(supabase, currentUserId, postIds)
      : Promise.resolve(new Set<string>()),
    currentUserId
      ? getSavedPostIds(supabase, currentUserId, postIds)
      : Promise.resolve(new Set<string>()),
    currentUserId
      ? listFollowingIds(supabase, currentUserId)
      : Promise.resolve<string[]>([]),
    supabase.from("profiles").select("*").in("id", authorIds),
    vehicleIds.length > 0
      ? supabase.from("vehicles").select("*").in("id", vehicleIds)
      : Promise.resolve({ data: [] as Vehicle[], error: null }),
    // The rank ring around an author's avatar reflects their single best
    // build overall (same as their profile page), not just whichever
    // vehicle happens to be tagged on this particular post — most posts
    // aren't tagged to a vehicle at all, which would otherwise mean the
    // ring almost never showed up in the feed.
    listVehiclesByOwnerIds(supabase, authorIds),
  ]);
  const followingIdSet = new Set(followingIds);

  const authorById = new Map(
    (authors.data ?? []).map((a: Profile) => [a.id, a]),
  );
  const vehicleById = new Map(
    (vehicles.data ?? []).map((v: Vehicle) => [v.id, v]),
  );

  const authorActiveBuildByVehicle = await listActiveBuildsByVehicleIds(
    supabase,
    authorVehicles.map((v) => v.id),
  );
  const bestScoreByAuthor = new Map<string, number | null>();
  for (const vehicle of authorVehicles) {
    const score = authorActiveBuildByVehicle.get(vehicle.id)?.ai_rating_score ?? null;
    if (score == null) continue;
    const current = bestScoreByAuthor.get(vehicle.owner_id);
    if (current == null || score > current) {
      bestScoreByAuthor.set(vehicle.owner_id, score);
    }
  }

  const avatarMediaIds = (authors.data ?? [])
    .map((a: Profile) => a.avatar_media_id)
    .filter((id): id is string => Boolean(id));
  const avatarMedia = await getMediaByIds(supabase, avatarMediaIds);
  const avatarUrlByMediaId = new Map(
    avatarMedia.map((m) => [m.id, publicMediaUrl(supabase, m.storage_path)]),
  );
  const mediaByPost = new Map<string, PostMediaItem[]>();
  for (const pm of postMedia) {
    const list = mediaByPost.get(pm.post_id) ?? [];
    list.push({
      url: publicMediaUrl(supabase, pm.media.storage_path),
      kind: pm.media.kind,
      width: pm.media.width,
      height: pm.media.height,
    });
    mediaByPost.set(pm.post_id, list);
  }

  return posts.map((post) => {
    const vehicle = post.vehicle_id ? vehicleById.get(post.vehicle_id) : null;
    const author = authorById.get(post.author_id);
    return {
      post,
      authorId: post.author_id,
      authorUsername: author?.username ?? "unknown",
      authorAvatarUrl: author?.avatar_media_id
        ? (avatarUrlByMediaId.get(author.avatar_media_id) ?? null)
        : null,
      vehicleTitle: vehicle
        ? vehicle.nickname || `${vehicle.make} ${vehicle.model}`
        : null,
      authorBestRatingScore: bestScoreByAuthor.get(post.author_id) ?? null,
      media: mediaByPost.get(post.id) ?? [],
      likeCount: likeCounts.get(post.id) ?? 0,
      commentCount: commentCounts.get(post.id) ?? 0,
      saveCount: saveCounts.get(post.id) ?? 0,
      viewCount: viewCounts.get(post.id) ?? 0,
      isLiked: likedIds.has(post.id),
      isSaved: savedIds.has(post.id),
      isFollowingAuthor: currentUserId ? followingIdSet.has(post.author_id) : null,
      isOwnPost: currentUserId === post.author_id,
      isAuthenticated: Boolean(currentUserId),
    };
  });
}
