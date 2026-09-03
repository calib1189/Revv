import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUsername } from "@/lib/db/profiles";
import { getFollowerCount, getFollowingCount, isFollowing } from "@/lib/db/follows";
import { isBlocking } from "@/lib/db/blocks";
import { listVehiclesByOwner } from "@/lib/db/vehicles";
import { listPostsByAuthor } from "@/lib/db/posts";
import { listSavedPosts } from "@/lib/db/saves";
import { recordProfileVisit } from "@/lib/db/profile-visits";
import { listLikedPosts, getLikeCountsForPosts } from "@/lib/db/likes";
import { formatCompactNumber } from "@/lib/format/compact-number";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { listActiveBuildsByVehicleIds } from "@/lib/db/builds";
import { composeThumbnails } from "@/lib/feed/compose-thumbnails";
import { Avatar } from "@/features/feed/avatar";
import { RankFrame } from "@/features/garage/rank-frame";
import { rankForScore, RANK_LABELS, RANK_TEXT_COLORS } from "@/lib/rating/rank";
import { ProfileTabs } from "@/features/profile/profile-tabs";
import { checkAndUnlockAchievements } from "@/lib/achievements/unlock";
import { listUnlockedAchievements } from "@/lib/db/user-achievements";
import { AchievementUnlockToast } from "@/features/achievements/achievement-unlock-toast";
import { FollowButton } from "@/features/profile/follow-button";
import { BlockButton } from "@/features/profile/block-button";
import { MessageButton } from "@/features/messages/message-button";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SettingsIcon, VerifiedBadgeIcon } from "@/components/ui/icons";

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  /** `from` is set to a post id when this profile was reached via a
   * post's author link (see swipe-slide.tsx / post-card.tsx) — lets
   * Creator Studio attribute a profile visit back to the post that
   * drove it. Never present for a direct link, search, or typing a
   * username, which is a real "unknown source", not an error. */
  searchParams: Promise<{ from?: string }>;
}) {
  const { username } = await params;
  const { from: sourcePostId } = await searchParams;
  const supabase = await createClient();

  const [profile, currentUser] = await Promise.all([
    getProfileByUsername(supabase, username),
    getCurrentUser(),
  ]);
  if (!profile) notFound();

  const isOwnProfile = currentUser?.id === profile.id;

  // Best-effort: a visit that fails to record should never break the
  // profile page itself. Skipped entirely for a logged-out viewer (no
  // visitor_id to attribute it to, matching every other engagement
  // table in this app) and for the owner viewing their own profile
  // (not a meaningful "visit" for their own stats).
  const recordVisit =
    sourcePostId && currentUser && !isOwnProfile
      ? recordProfileVisit(supabase, currentUser.id, profile.id, sourcePostId).catch(() => {})
      : Promise.resolve();

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
      recordVisit,
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

  // Only the owner's own visit triggers a check (see garage-page-content.tsx
  // for the other trigger point) — a stranger viewing this profile
  // shouldn't run the full stats-gathering query on the owner's behalf.
  // The trophy case itself (below) is still fully public regardless.
  //
  // Degrade gracefully if the achievements migration hasn't been applied
  // yet — every profile page runs this on every visit (any viewer, not
  // just the owner), so an unhandled error here would take down every
  // profile in the app, not just the trophy case tab.
  let newlyUnlocked: Awaited<ReturnType<typeof checkAndUnlockAchievements>> = [];
  let unlockedAtById = new Map<string, string>();
  try {
    const [unlocked, unlockedAchievements] = await Promise.all([
      isOwnProfile ? checkAndUnlockAchievements(supabase, profile.id) : Promise.resolve([]),
      listUnlockedAchievements(supabase, profile.id),
    ]);
    newlyUnlocked = unlocked;
    unlockedAtById = new Map(unlockedAchievements.map((a) => [a.achievement_id, a.unlocked_at]));
  } catch (err) {
    console.error("Achievements check failed:", err);
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <AchievementUnlockToast achievements={newlyUnlocked} />
      {isOwnProfile && (
        <div className="mb-2 flex justify-end">
          <Link
            href="/settings"
            aria-label="Settings"
            className="text-muted hover:text-foreground"
          >
            <SettingsIcon className="h-6 w-6" />
          </Link>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="flex min-w-0 items-center gap-1.5 truncate text-2xl font-bold tracking-tight">
            <span className="truncate">{profile.display_name || `@${profile.username}`}</span>
            {profile.is_verified && (
              <VerifiedBadgeIcon className="h-5 w-5 flex-shrink-0 text-accent" />
            )}
          </h1>
          {profile.display_name && (
            <p className="truncate text-sm text-muted">@{profile.username}</p>
          )}
          {profile.is_founder && (
            <span className="mt-1.5 inline-flex w-fit flex-shrink-0 items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">
              Founder &amp; Owner
            </span>
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

        <RankFrame score={bestRatingScore} compact hideBadge className="flex-shrink-0 rounded-full">
          <Avatar username={profile.username} avatarUrl={avatarUrl} className="h-24 w-24 text-3xl" />
        </RankFrame>
      </div>

      {bestRatingScore != null && (
        // Its own row below the header, not crammed into the stats row next
        // to the 96px avatar — four stats plus that avatar don't fit at
        // mobile width (found by visual check: the tier name rendered
        // clipped behind the avatar circle).
        <p className="mt-4 text-sm">
          <span
            className="font-bold"
            style={{ color: RANK_TEXT_COLORS[rankForScore(bestRatingScore)] }}
          >
            {RANK_LABELS[rankForScore(bestRatingScore)]}
          </span>
          <span className="text-muted"> · Best build {bestRatingScore.toFixed(2)}</span>
        </p>
      )}

      {profile.bio && (
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">
          {profile.bio}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {isOwnProfile ? (
          <>
            <Link href="/settings/profile">
              <Button variant="secondary" className="px-4 py-1.5 text-sm">
                Edit profile
              </Button>
            </Link>
            <Link href="/garage">
              <Button variant="secondary" className="px-4 py-1.5 text-sm">
                Garage
              </Button>
            </Link>
          </>
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

      <ProfileTabs
        isOwnProfile={isOwnProfile}
        unlockedAtById={unlockedAtById}
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
