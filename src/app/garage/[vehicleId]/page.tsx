import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getVehicleById, listLeaderboardVehicleIds } from "@/lib/db/vehicles";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getStoreItem } from "@/lib/store/catalog";
import { getMediaById, getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { listVehicleMedia } from "@/lib/db/vehicle-media";
import { getActiveBuild, listAllRatingScores, pendingRatingFromBuild } from "@/lib/db/builds";
import { listBuildRatingHistory } from "@/lib/db/build-rating-history";
import { computeTopPercent } from "@/lib/rating/percentile";
import { computeRankPosition, type RankPosition } from "@/lib/rating/rank-position";
import { RatingBreakdownTrigger } from "@/features/garage/rating-breakdown-modal";
import { PeerRatingCard } from "@/features/garage/peer-rating-card";
import { getPeerRatingSummary, getMyPeerRating } from "@/lib/db/peer-ratings";
import type { BuildRatingSubscores } from "@/lib/providers/rating-provider";
import { listBuildParts } from "@/lib/db/build-parts";
import { getPartsByIds } from "@/lib/db/parts";
import { listVehiclesByOwner } from "@/lib/db/vehicles";
import { listFeedPosts } from "@/lib/db/posts";
import { composeThumbnails } from "@/lib/feed/compose-thumbnails";
import { VehicleSpecs } from "@/features/garage/vehicle-specs";
import { CoverPhotoUploader } from "@/features/garage/cover-photo-uploader";
import { DeleteVehicleButton } from "@/features/garage/delete-vehicle-button";
import { ReportButton } from "@/features/feed/report-button";
import { LeaderboardStatus } from "@/features/garage/leaderboard-status";
import { VehicleShareButton } from "@/features/garage/vehicle-share-button";
import { VehicleHeroPhoto } from "@/features/garage/vehicle-hero-photo";
import { buildShareText, formatScore } from "@/lib/rating/share-text";
import { VehicleTabs } from "@/features/garage/vehicle-tabs";
import { RateBuildPanel } from "@/features/garage/rate-build-panel";
import { ScoreHero, ScoreReasons } from "@/features/garage/score-hero";
import { GroupedList, GroupedRow, RowIcon, SectionTitle } from "@/components/ui/grouped-list";
import { EditIcon, WheelIcon } from "@/components/ui/icons";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { CopyBuildButton } from "@/features/builds/copy-build-button";
import { calculateBudgetSummary } from "@/lib/builds/budget";
import { listMaintenanceForVehicle } from "@/lib/db/maintenance";
import { recordVehicleView } from "@/lib/db/vehicle-views";
import { getPartClickCountsForBuildParts } from "@/lib/db/part-clicks";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ vehicleId: string }>;
}): Promise<Metadata> {
  const { vehicleId } = await params;
  const supabase = await createClient();
  const vehicle = await getVehicleById(supabase, vehicleId);
  if (!vehicle) return {};

  const title = vehicle.nickname || `${vehicle.make} ${vehicle.model}`;
  const carName = [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(" ");
  const score = await getActiveBuild(supabase, vehicleId)
    .then((build) => build?.ai_rating_score ?? null)
    .catch(() => null);
  // The score is the hook in a link preview, so it leads the description.
  const description =
    score != null
      ? `${carName ? `${carName} · ` : ""}SORZA score ${formatScore(score)}. Rate your own build on SORZA.`
      : carName || undefined;

  return {
    title: `${title} · SORZA`,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    // Large card on X/iMessage-style previews, so the photo and score show.
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function VehiclePage({
  params,
  searchParams,
}: {
  params: Promise<{ vehicleId: string }>;
  /** `from` is set to a post id when this vehicle was reached via a
   * post's tagged-vehicle link (see swipe-slide.tsx / post-card.tsx) —
   * lets Creator Studio attribute a garage visit back to the post that
   * drove it. Never present for a direct link or a garage-grid browse,
   * which is a real "unknown source", not an error. */
  searchParams: Promise<{ from?: string }>;
}) {
  const { vehicleId } = await params;
  const { from: sourcePostId } = await searchParams;
  const supabase = await createClient();

  const [vehicle, user] = await Promise.all([
    getVehicleById(supabase, vehicleId),
    getCurrentUser(),
  ]);
  if (!vehicle) notFound();

  const isOwner = user?.id === vehicle.owner_id;

  // Best-effort, same reasoning as the profile page's equivalent: never
  // let a failed visit record break the page, skip it for a logged-out
  // viewer, and skip it for the vehicle's own owner (not a meaningful
  // "visit" for their own stats).
  const recordVisit =
    sourcePostId && user && !isOwner
      ? recordVehicleView(supabase, user.id, vehicleId, sourcePostId).catch(() => {})
      : Promise.resolve();

  const [owner, gallery, heroMedia, activeBuild] = await Promise.all([
    getProfileByUserId(supabase, vehicle.owner_id),
    listVehicleMedia(supabase, vehicleId),
    vehicle.hero_media_id
      ? getMediaById(supabase, vehicle.hero_media_id)
      : Promise.resolve(null),
    getActiveBuild(supabase, vehicleId),
    recordVisit,
  ]);
  const buildParts = activeBuild
    ? await listBuildParts(supabase, activeBuild.id)
    : [];
  const linkedParts = await getPartsByIds(
    supabase,
    buildParts
      .map((p) => p.part_id)
      .filter((id): id is string => Boolean(id)),
  );
  const partsById = new Map(linkedParts.map((p) => [p.id, p]));
  const partMedia = await getMediaByIds(
    supabase,
    buildParts
      .map((p) => p.media_id)
      .filter((id): id is string => Boolean(id)),
  );
  const partMediaUrlById = new Map(
    partMedia.map((m) => [m.id, publicMediaUrl(supabase, m.storage_path)]),
  );
  // Only ever shown to the owner (see ModificationList), so skip the
  // query entirely for everyone else.
  const clickCountsByBuildPart = isOwner
    ? await getPartClickCountsForBuildParts(supabase, buildParts.map((p) => p.id))
    : new Map<string, number>();

  const maintenanceRecords = isOwner
    ? await listMaintenanceForVehicle(supabase, vehicleId)
    : [];
  const vehiclePosts = await listFeedPosts(supabase, { vehicleIds: [vehicleId], limit: 60 });
  const postThumbnails = await composeThumbnails(supabase, vehiclePosts);

  const currentSubscores = (activeBuild?.ai_rating_subscores ?? null) as BuildRatingSubscores | null;
  // Population is every active, rated build on SORZA — deliberately not
  // scoped to verified-only (the leaderboard's own population), since an
  // unverified vehicle can still have a rating and this modal isn't
  // claiming leaderboard rank, just "of rated builds" generally.
  const topPercent =
    activeBuild?.ai_rating_score != null
      ? computeTopPercent(activeBuild.ai_rating_score, await listAllRatingScores(supabase))
      : null;
  // Degrade gracefully if the rating-history migration hasn't been
  // applied yet — every rated vehicle's page runs this on every visit,
  // so an unhandled error here would take down the whole page, not just
  // the sparkline in the breakdown modal.
  let ratingHistory: Awaited<ReturnType<typeof listBuildRatingHistory>> = [];
  if (activeBuild) {
    try {
      ratingHistory = await listBuildRatingHistory(supabase, activeBuild.id);
    } catch (err) {
      console.error("listBuildRatingHistory failed:", err);
    }
  }
  // Unlike topPercent, this is scoped to the exact same population the
  // leaderboard itself ranks against — verified vehicles only — so the
  // rank number shown here is never a claim the real leaderboard
  // wouldn't back up. A not-yet-verified vehicle simply doesn't get one,
  // rather than a rank that would be wrong the moment they checked
  // /leaderboard themselves.
  const rankPosition: RankPosition | null =
    isOwner && activeBuild?.ai_rating_score != null && vehicle.ownership_verification_status === "approved"
      ? computeRankPosition(
          activeBuild.ai_rating_score,
          await listAllRatingScores(supabase, await listLeaderboardVehicleIds(supabase)),
        )
      : null;

  // Degrade gracefully if the peer-ratings migration hasn't been
  // applied yet — same "missing table shouldn't take down the page"
  // reasoning as ratingHistory above.
  let peerRatingSummary: Awaited<ReturnType<typeof getPeerRatingSummary>> = { average: null, count: 0 };
  let myPeerRating: number | null = null;
  try {
    peerRatingSummary = await getPeerRatingSummary(supabase, vehicle.id);
    myPeerRating = user && !isOwner ? await getMyPeerRating(supabase, vehicle.id, user.id) : null;
  } catch (err) {
    console.error("Peer rating fetch failed:", err);
  }

  const heroUrl = heroMedia
    ? publicMediaUrl(supabase, heroMedia.storage_path)
    : null;

  const title = vehicle.nickname || `${vehicle.make} ${vehicle.model}`;
  const nameColorItem = owner?.equipped_vehicle_name_color
    ? getStoreItem(owner.equipped_vehicle_name_color)
    : undefined;
  const nameIsGradient = nameColorItem?.value.includes("gradient") ?? false;

  const eyebrow = (
    vehicle.nickname ? [vehicle.year, vehicle.make, vehicle.model] : [vehicle.year, vehicle.trim]
  )
    .filter(Boolean)
    .join(" · ");
  const score = activeBuild?.ai_rating_score ?? null;

  return (
    <div className="flex-1 pb-16">
      {/* Full-bleed hero: tall on phones so the car is the screen, a
          cinematic strip on wide screens. The name sits on the photo's
          lower edge over a scrim, the way a feature story opens. */}
      <div className="relative h-[min(78svh,560px)] w-full overflow-hidden bg-neutral-950 sm:h-[min(70vh,620px)]">
        {heroUrl ? (
          <VehicleHeroPhoto
            url={heroUrl}
            title={title}
            galleryUrls={gallery.filter((g) => g.media.kind === "image").map((g) => publicMediaUrl(supabase, g.media.storage_path))}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[0.9375rem] text-white/50">
            {isOwner ? "Add a cover photo below" : "No cover photo yet"}
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/50 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        <div className="absolute right-4 top-4 sm:right-6">
          <VehicleShareButton vehicleId={vehicle.id} text={buildShareText({ title, score, isOwner })} />
        </div>

        <div className="absolute inset-x-0 bottom-0">
          <div className="animate-section-rise mx-auto w-full max-w-3xl px-5 pb-7 sm:px-6 sm:pb-10">
            {eyebrow && <p className="micro-label text-white/75">{eyebrow}</p>}
            {nameIsGradient ? (
              <h1
                className={`mt-2 bg-clip-text text-[2.5rem] font-bold leading-[1.02] tracking-[-0.035em] text-transparent sm:text-[3.5rem] ${nameColorItem?.effectClassName ?? ""}`}
                style={{ backgroundImage: nameColorItem!.value }}
              >
                {title}
              </h1>
            ) : (
              <h1
                className={`mt-2 text-[2.5rem] font-bold leading-[1.02] tracking-[-0.035em] sm:text-[3.5rem] ${nameColorItem ? "" : "text-white"} ${nameColorItem?.effectClassName ?? ""}`}
                style={nameColorItem ? { color: nameColorItem.value } : undefined}
              >
                {title}
              </h1>
            )}
            {owner && (
              <Link
                href={`/u/${owner.username}`}
                className={`mt-3 inline-flex items-center gap-1 rounded-full bg-white/15 py-1 text-[0.8125rem] font-medium text-white backdrop-blur-md transition-colors hover:bg-white/25 ${
                  owner.is_verified ? "pl-3 pr-1.5" : "px-3"
                }`}
              >
                @{owner.username}
                {owner.is_verified && <VerifiedBadge className="h-4 w-4" />}
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pt-6 sm:px-6 sm:pt-8">
        {isOwner ? (
          <RateBuildPanel
            vehicleId={vehicle.id}
            currentScore={score}
            currentStrengths={activeBuild?.ai_rating_strengths ?? null}
            currentLimitingFactors={activeBuild?.ai_rating_limiting_factors ?? null}
            currentSubscores={currentSubscores}
            topPercent={topPercent}
            ratingHistory={ratingHistory}
            rankPosition={rankPosition}
            shareText={buildShareText({ title, score, isOwner })}
            savedPending={activeBuild ? pendingRatingFromBuild(activeBuild) : null}
            hasPhotos={Boolean(heroMedia) || gallery.some((g) => g.media.kind === "image")}
          />
        ) : (
          score != null && (
            <div className="glass-raised elev-2 rounded-[28px] p-5 sm:p-6">
              <RatingBreakdownTrigger
                score={score}
                subscores={currentSubscores}
                topPercent={topPercent}
                history={ratingHistory}
                className="block w-full text-left"
              >
                <ScoreHero score={score} />
              </RatingBreakdownTrigger>
              <ScoreReasons
                strengths={activeBuild?.ai_rating_strengths ?? null}
                limitingFactors={activeBuild?.ai_rating_limiting_factors ?? null}
                fallback={activeBuild?.ai_rating_summary ?? null}
              />
            </div>
          )
        )}

        <PeerRatingCard
          vehicleId={vehicle.id}
          summary={peerRatingSummary}
          myInitialRating={myPeerRating}
          canRate={Boolean(user) && !isOwner}
        />

        {isOwner && (
          <LeaderboardStatus
            status={vehicle.ownership_verification_status}
            hasPhoto={Boolean(heroMedia) || gallery.some((g) => g.media.kind === "image")}
            rated={score != null}
            rejectionReason={vehicle.ownership_rejection_reason ?? null}
          />
        )}

        {!isOwner && user && buildParts.length > 0 && (
          <CopyBuildButton
            sourceVehicleId={vehicle.id}
            myVehicles={await listVehiclesByOwner(supabase, user.id)}
          />
        )}

        {vehicle.description && (
          <section>
            <SectionTitle>About</SectionTitle>
            <p className="whitespace-pre-wrap px-1 text-[0.9375rem] leading-relaxed text-foreground/90">
              {vehicle.description}
            </p>
          </section>
        )}

        <VehicleSpecs vehicle={vehicle} />

        {isOwner && (
          <section id="manage" className="scroll-mt-20">
            <SectionTitle>Manage</SectionTitle>
            <GroupedList>
              <CoverPhotoUploader
                vehicleId={vehicle.id}
                userId={user!.id}
                hasPhoto={Boolean(vehicle.hero_media_id)}
              />
              <GroupedRow
                href={`/garage/${vehicle.id}/edit`}
                label="Edit details"
                icon={
                  <RowIcon color="#8e8e93">
                    <EditIcon />
                  </RowIcon>
                }
              />
              <GroupedRow
                href="/tools/fitment"
                label="Fitment calculator"
                icon={
                  <RowIcon color="#30b0c7">
                    <WheelIcon />
                  </RowIcon>
                }
              />
              <DeleteVehicleButton vehicleId={vehicle.id} />
            </GroupedList>
          </section>
        )}
      </div>

      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <VehicleTabs
          vehicleId={vehicle.id}
          vehicleLabel={[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")}
          userId={user?.id ?? null}
          isOwner={isOwner}
          budgetSummary={calculateBudgetSummary(buildParts, activeBuild?.budget_cents ?? null)}
          buildParts={buildParts}
          partsById={partsById}
          partMediaUrlById={partMediaUrlById}
          clickCountsByBuildPart={clickCountsByBuildPart}
          photos={gallery.map((g) => ({
            vehicleMediaId: g.id,
            url: publicMediaUrl(supabase, g.media.storage_path),
          }))}
          posts={postThumbnails}
          maintenanceRecords={maintenanceRecords}
        />

        {!isOwner && user && (
          <div className="mt-12 flex justify-center">
            <ReportButton targetType="vehicle" targetId={vehicle.id} />
          </div>
        )}
      </div>
    </div>
  );
}
