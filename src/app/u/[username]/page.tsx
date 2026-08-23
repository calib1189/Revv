import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUsername } from "@/lib/db/profiles";
import { getFollowerCount, getFollowingCount, isFollowing } from "@/lib/db/follows";
import { isBlocking } from "@/lib/db/blocks";
import { listVehiclesByOwner } from "@/lib/db/vehicles";
import { listPostsByAuthor } from "@/lib/db/posts";
import { listSavedPosts } from "@/lib/db/saves";
import { listLikedPosts, getLikeCountsForPosts } from "@/lib/db/likes";
import { formatCompactNumber } from "@/lib/format/compact-number";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { listActiveBuildsByVehicleIds } from "@/lib/db/builds";
import { composeThumbnails } from "@/lib/feed/compose-thumbnails";
import { Avatar } from "@/features/feed/avatar";
import { RankFrame } from "@/features/garage/rank-frame";
import { rankForScore, RANK_LABELS } from "@/lib/rating/rank";
import { ProfileTabs } from "@/features/profile/profile-tabs";
import { FollowButton } from "@/features/profile/follow-button";
import { BlockButton } from "@/features/profile/block-button";
import { MessageButton } from "@/features/messages/message-button";
import { SignOutButton } from "@/features/auth/sign-out-button";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const [profile, currentUser] = await Promise.all([
    getProfileByUsername(supabase, username),
    getCurrentUser(),
  ]);
  if (!profile) notFound();

  const isOwnProfile = currentUser?.id === profile.id;

  const [followerCount, followingCount, following, amBlocking, vehicles, posts] =
    await Promise.all([
      getFollowerCount(supabase, profile.id),
      getFollowingCount(supabase, profile.id),
      currentUser && !isOwnProfile
        ? isFollowing(supabase, currentUser.id, profile.id)
        : Promise.resolve(false),
      currentUser && !isOwnProfile
        ? isBlocking(supabase, currentUser.id, profile.id)
        : Promise.resolve(false),
      listVehiclesByOwner(supabase, profile.id),
      listPostsByAuthor(supabase, profile.id),
    ]);

  const heroIds = vehicles
    .map((v) => v.hero_media_id)
    .filter((id): id is string => Boolean(id));
  const avatarIds = profile.avatar_media_id ? [profile.avatar_media_id] : [];
  const [heroMedia, activeBuildByVehicle, avatarMedia] = await Promise.all([
    getMediaByIds(supabase, heroIds),
    listActiveBuildsByVehicleIds(supabase, vehicles.map((v) => v.id)),
    getMediaByIds(supabase, avatarIds),
  ]);
  const heroUrlById = new Map(
    heroMedia.map((m) => [m.id, publicMediaUrl(supabase, m.storage_path)]),
  );
  const avatarUrl = avatarMedia[0] ? publicMediaUrl(supabase, avatarMedia[0].storage_path) : null;

  const bestRatingScore = vehicles.reduce<number | null>((best, v) => {
    const score = activeBuildByVehicle.get(v.id)?.ai_rating_score ?? null;
    if (score == null) return best;
    return best == null || score > best ? score : best;
  }, null);

  const [savedPosts, likedPosts] = isOwnProfile
    ? await Promise.all([
        listSavedPosts(supabase, profile.id),
        listLikedPosts(supabase, profile.id),
      ])
    : [[], []];

  const [postThumbnails, savedThumbnails, likedThumbnails, likeCountsByPost] = await Promise.all([
    composeThumbnails(supabase, posts),
    composeThumbnails(supabase, savedPosts),
    composeThumbnails(supabase, likedPosts),
    getLikeCountsForPosts(supabase, posts.map((p) => p.id)),
  ]);
  const totalLikes = [...likeCountsByPost.values()].reduce((sum, n) => sum + n, 0);

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold tracking-tight">
            {profile.display_name || `@${profile.username}`}
          </h1>
          {profile.display_name && (
            <p className="truncate text-sm text-muted">@{profile.username}</p>
          )}

          <div className="mt-4 flex gap-6">
            <div>
              <p className="text-lg font-bold leading-none">{followingCount}</p>
              <p className="mt-1.5 text-xs text-muted">Following</p>
            </div>
            <div>
              <p className="text-lg font-bold leading-none">{followerCount}</p>
              <p className="mt-1.5 text-xs text-muted">Followers</p>
            </div>
            <div>
              <p className="text-lg font-bold leading-none">
                {formatCompactNumber(totalLikes)}
              </p>
              <p className="mt-1.5 text-xs text-muted">Likes</p>
            </div>
          </div>
        </div>

        <div className="flex flex-shrink-0 flex-col items-center gap-1.5">
          <RankFrame score={bestRatingScore} compact hideBadge className="rounded-full">
            <Avatar username={profile.username} avatarUrl={avatarUrl} className="h-20 w-20 text-2xl" />
          </RankFrame>
          {bestRatingScore != null && (
            <p className="text-xs font-medium text-muted">
              {RANK_LABELS[rankForScore(bestRatingScore)]}
            </p>
          )}
        </div>
      </div>

      {profile.bio && (
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">
          {profile.bio}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {isOwnProfile ? (
          <Link href="/settings/profile">
            <Button variant="secondary" className="px-4 py-1.5 text-sm">
              Edit profile
            </Button>
          </Link>
        ) : currentUser ? (
          <>
            {!amBlocking && (
              <>
                <FollowButton
                  followeeId={profile.id}
                  followeeUsername={profile.username}
                  initialIsFollowing={following}
                />
                <MessageButton userId={profile.id} />
              </>
            )}
            <BlockButton
              targetUserId={profile.id}
              targetUsername={profile.username}
              initialIsBlocking={amBlocking}
            />
          </>
        ) : null}
      </div>

      {isOwnProfile && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4 text-sm">
          <Link href="/saved" className="text-muted hover:text-foreground">
            Saved
          </Link>
          <Link href="/notifications" className="text-muted hover:text-foreground">
            Activity
          </Link>
          {profile.is_admin && (
            <Link href="/admin/reports" className="text-accent hover:underline">
              Admin
            </Link>
          )}
          <SignOutButton />
        </div>
      )}

      <ProfileTabs
        isOwnProfile={isOwnProfile}
        posts={postThumbnails}
        savedPosts={isOwnProfile ? savedThumbnails : undefined}
        likedPosts={isOwnProfile ? likedThumbnails : undefined}
        vehicles={vehicles.map((vehicle) => ({
          vehicle,
          heroUrl: vehicle.hero_media_id
            ? (heroUrlById.get(vehicle.hero_media_id) ?? null)
            : null,
          ratingScore: activeBuildByVehicle.get(vehicle.id)?.ai_rating_score ?? null,
        }))}
      />
    </div>
  );
}
