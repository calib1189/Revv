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
import { RANK_MATERIAL_ICONS } from "@/features/garage/rank-material-icons";
import { ProgressRing } from "@/components/ui/progress-ring";
import { ProfileMoreMenu } from "@/features/profile/profile-more-menu";
import { rankForScore, RANK_LABELS, tierColorVar } from "@/lib/rating/rank";
import { ProfileTabs } from "@/features/profile/profile-tabs";
import { checkAndUnlockAchievements } from "@/lib/achievements/unlock";
import { listUnlockedAchievements } from "@/lib/db/user-achievements";
import { AchievementUnlockToast } from "@/features/achievements/achievement-unlock-toast";
import { ProfileShowcase } from "@/features/achievements/achievement-showcase";
import { FollowButton } from "@/features/profile/follow-button";
import { BlockButton } from "@/features/profile/block-button";
import { ReportButton } from "@/features/feed/report-button";
import { MessageButton } from "@/features/messages/message-button";
import { getStoreItem } from "@/lib/store/catalog";
import { getPointsBalance } from "@/lib/db/points";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SettingsIcon, VerifiedBadgeIcon, GemIcon } from "@/components/ui/icons";

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
  // Only built for the owner — a visitor never gets a claim button on a
  // stranger's unclaimed points, so there's no reason to hand them this
  // data at all (see achievements-grid.tsx's canClaim check).
  let claimedAtById: Map<string, string> | undefined;
  try {
    const [unlocked, unlockedAchievements] = await Promise.all([
      isOwnProfile ? checkAndUnlockAchievements(supabase, profile.id) : Promise.resolve([]),
      listUnlockedAchievements(supabase, profile.id),
    ]);
    newlyUnlocked = unlocked;
    unlockedAtById = new Map(unlockedAchievements.map((a) => [a.achievement_id, a.unlocked_at]));
    if (isOwnProfile) {
      claimedAtById = new Map(
        unlockedAchievements
          .filter((a) => a.claimed_at != null)
          .map((a) => [a.achievement_id, a.claimed_at as string]),
      );
    }
  } catch (err) {
    console.error("Achievements check failed:", err);
  }

  // Best-effort, same reasoning as the achievements try/catch above — a
  // not-yet-migrated points_ledger shouldn't take down the whole
  // profile. Only fetched for the owner; a visitor's Shop link doesn't
  // need to know a stranger's balance.
  let pointsBalance = 0;
  if (isOwnProfile) {
    try {
      pointsBalance = await getPointsBalance(supabase, profile.id);
    } catch (err) {
      console.error("Points balance fetch failed:", err);
    }
  }

  // Equipped store cosmetics — every one of these is optional and
  // simply renders as "nothing equipped" (the default look) if the
  // profile's equipped_* column is null or names an item no longer in
  // the catalog, same graceful-fallback spirit as the migration guards
  // above.
  const nameColorItem = profile.equipped_name_color
    ? getStoreItem(profile.equipped_name_color)
    : undefined;
  const backgroundItem = profile.equipped_profile_background
    ? getStoreItem(profile.equipped_profile_background)
    : undefined;
  const frameItem = profile.equipped_showcase_frame
    ? getStoreItem(profile.equipped_showcase_frame)
    : undefined;
  const vehicleNameColorItem = profile.equipped_vehicle_name_color
    ? getStoreItem(profile.equipped_vehicle_name_color)
    : undefined;
  const nameIsGradient = nameColorItem?.value.includes("gradient") ?? false;
  const displayName = profile.display_name || `@${profile.username}`;
  const bestTier = bestRatingScore != null ? rankForScore(bestRatingScore) : null;
  const BestTierIcon = bestTier ? RANK_MATERIAL_ICONS[bestTier] : null;

  const actionButtonClass = "h-10 w-full px-3 py-0 text-[0.9375rem] font-semibold";

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-4 sm:px-6 sm:pt-8">
      <AchievementUnlockToast achievements={newlyUnlocked} />

      {isOwnProfile && (
        <div className="relative z-10 mb-2 flex justify-end">
          <Link
            href="/settings"
            aria-label="Settings"
            className="pressable glass-raised elev-1 flex h-10 w-10 items-center justify-center rounded-full text-foreground"
          >
            <SettingsIcon className="h-5 w-5" />
          </Link>
        </div>
      )}

      {/* Equipped profile background becomes a banner the avatar sits
          on, rather than a ring around the whole header — the pattern
          gets real presence, and no text ever sits on top of it. */}
      {backgroundItem && (
        <div
          aria-hidden
          className={`h-32 rounded-[28px] elev-2 sm:h-40 ${backgroundItem.effectClassName ?? ""}`}
          style={{ backgroundImage: backgroundItem.value }}
        />
      )}

      <header
        className={`animate-section-rise flex flex-col items-center text-center ${
          backgroundItem ? "-mt-16 sm:-mt-[4.5rem]" : "mt-2"
        }`}
      >
        {/* The avatar sits inside its owner's best build score, drawn as
            a ring in that tier's colour. Unrated profiles get a plain
            hairline instead of an empty ring. */}
        <div className="rounded-full bg-background p-1">
          {bestTier && bestRatingScore != null ? (
            <ProgressRing
              value={bestRatingScore / 100}
              size={128}
              stroke={5}
              color={tierColorVar(bestTier)}
              label={`Best build ${bestRatingScore.toFixed(2)} out of 100`}
            >
              <Avatar
                username={profile.username}
                avatarUrl={avatarUrl}
                className="h-[106px] w-[106px] text-4xl"
                priority
              />
            </ProgressRing>
          ) : (
            <div className="rounded-full p-[3px] ring-1 ring-border">
              <Avatar
                username={profile.username}
                avatarUrl={avatarUrl}
                className="h-[112px] w-[112px] text-4xl"
                priority
              />
            </div>
          )}
        </div>

        <h1 className="mt-4 flex max-w-full items-center justify-center gap-1.5 text-[1.75rem] font-bold leading-tight tracking-[-0.025em]">
          {nameIsGradient ? (
            <span
              className={`truncate bg-clip-text text-transparent ${nameColorItem?.effectClassName ?? ""}`}
              style={{ backgroundImage: nameColorItem!.value }}
            >
              {displayName}
            </span>
          ) : (
            <span
              className={`truncate ${nameColorItem?.effectClassName ?? ""}`}
              style={nameColorItem ? { color: nameColorItem.value } : undefined}
            >
              {displayName}
            </span>
          )}
          {profile.is_verified && (
            <VerifiedBadgeIcon className="h-[22px] w-[22px] flex-shrink-0 text-accent" />
          )}
        </h1>
        {profile.display_name && (
          <p className="mt-0.5 max-w-full truncate text-[0.9375rem] text-muted">@{profile.username}</p>
        )}

        {(profile.is_founder || bestTier) && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {bestTier && BestTierIcon && bestRatingScore != null && (
              <span className="glass inline-flex items-center gap-1.5 rounded-full py-1 pl-1.5 pr-3">
                <BestTierIcon className="h-5 w-5" />
                <span className="micro-label" style={{ color: tierColorVar(bestTier) }}>
                  {RANK_LABELS[bestTier]}
                </span>
                <span className="numeral text-[0.8125rem] leading-none">
                  {bestRatingScore.toFixed(2)}
                </span>
              </span>
            )}
            {profile.is_founder && (
              <span className="inline-flex items-center rounded-full bg-accent/12 px-3 py-1 text-[0.75rem] font-semibold text-accent">
                Founder &amp; Owner
              </span>
            )}
          </div>
        )}

        <div className="mt-6 flex w-full max-w-sm items-stretch">
          {[
            { label: "Followers", value: formatCompactNumber(followerCount) },
            { label: "Following", value: formatCompactNumber(followingCount) },
            { label: "Likes", value: formatCompactNumber(totalLikes) },
          ].map((stat, i) => (
            <div key={stat.label} className="flex min-w-0 flex-1 items-stretch">
              {i > 0 && <div className="my-1 w-px flex-shrink-0 bg-border" />}
              <div className="min-w-0 flex-1">
                <p className="numeral text-[1.375rem] leading-none">{stat.value}</p>
                <p className="mt-1.5 text-[0.75rem] font-medium text-muted">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {profile.bio && (
          <p className="mt-5 max-w-md whitespace-pre-wrap text-[0.9375rem] leading-relaxed">
            {profile.bio}
          </p>
        )}

        <ProfileShowcase
          achievementIds={profile.showcased_achievement_ids ?? []}
          frameClassName={frameItem?.value}
          className="mt-5 flex flex-wrap justify-center gap-2"
        />

        {isOwnProfile ? (
          <div className="mt-6 flex w-full max-w-md gap-2.5">
            <Link href="/settings/profile" className="min-w-0 flex-1">
              <Button variant="secondary" className={actionButtonClass}>
                Edit Profile
              </Button>
            </Link>
            <Link href="/store" className="min-w-0 flex-1">
              <Button variant="secondary" className={`${actionButtonClass} gap-1.5`}>
                <GemIcon className="h-4 w-4 flex-shrink-0 text-accent" />
                Shop
                <span className="numeral text-[0.875rem] text-muted">{pointsBalance}</span>
              </Button>
            </Link>
          </div>
        ) : currentUser ? (
          <div className="mt-6 w-full max-w-md">
            <ProfileMoreMenu
              actions={
                amBlocking ? (
                  <p className="flex h-10 min-w-0 flex-1 items-center justify-center text-[0.875rem] text-muted">
                    You blocked this account
                  </p>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <FollowButton
                        followeeId={profile.id}
                        followeeUsername={profile.username}
                        initialIsFollowing={following}
                        className={actionButtonClass}
                      />
                    </div>
                    <MessageButton
                      userId={profile.id}
                      wrapperClassName="min-w-0 flex-1"
                      className={actionButtonClass}
                    />
                  </>
                )
              }
              menu={
                <>
                  <BlockButton
                    targetUserId={profile.id}
                    targetUsername={profile.username}
                    initialIsBlocking={amBlocking}
                  />
                  <div className="h-px w-full bg-border" />
                  <ReportButton targetType="profile" targetId={profile.id} />
                </>
              }
            />
          </div>
        ) : null}
      </header>

      <ProfileTabs
        isOwnProfile={isOwnProfile}
        unlockedAtById={unlockedAtById}
        claimedAtById={claimedAtById}
        showcasedAchievementIds={profile.showcased_achievement_ids ?? []}
        posts={postThumbnails}
        savedPosts={isOwnProfile ? savedThumbnails : undefined}
        likedPosts={isOwnProfile ? likedThumbnails : undefined}
        vehicleNameColorValue={vehicleNameColorItem?.value}
        vehicleNameColorEffectClassName={vehicleNameColorItem?.effectClassName}
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
