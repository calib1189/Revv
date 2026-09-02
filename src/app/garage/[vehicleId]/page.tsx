import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getVehicleById, listVerifiedVehicleIds } from "@/lib/db/vehicles";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getMediaById, getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { listVehicleMedia } from "@/lib/db/vehicle-media";
import { getActiveBuild, listAllRatingScores } from "@/lib/db/builds";
import { listBuildRatingHistory } from "@/lib/db/build-rating-history";
import { computeTopPercent } from "@/lib/rating/percentile";
import { computeRankPosition, type RankPosition } from "@/lib/rating/rank-position";
import { RatingBreakdownTrigger } from "@/features/garage/rating-breakdown-modal";
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
import { OwnershipVerification } from "@/features/garage/ownership-verification";
import { VehicleShareButton } from "@/features/garage/vehicle-share-button";
import { VehicleTabs } from "@/features/garage/vehicle-tabs";
import { RankFrame } from "@/features/garage/rank-frame";
import { RateBuildPanel } from "@/features/garage/rate-build-panel";
import { rankForScore, RANK_LABELS, RANK_TEXT_COLORS } from "@/lib/rating/rank";
import { RANK_MATERIAL_ICONS } from "@/features/garage/rank-material-icons";
import { CopyBuildButton } from "@/features/builds/copy-build-button";
import { calculateBudgetSummary } from "@/lib/builds/budget";
import { listMaintenanceForVehicle } from "@/lib/db/maintenance";
import { recordVehicleView } from "@/lib/db/vehicle-views";
import { getPartClickCountsForBuildParts } from "@/lib/db/part-clicks";
import { Button } from "@/components/ui/button";
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
  const description = [vehicle.year, vehicle.make, vehicle.model, vehicle.trim]
    .filter(Boolean)
    .join(" ");

  return {
    title: `${title} · REVV`,
    description: description || undefined,
    openGraph: {
      title,
      description: description || undefined,
      type: "website",
    },
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
  // Population is every active, rated build on REVV — deliberately not
  // scoped to verified-only (the leaderboard's own population), since an
  // unverified vehicle can still have a rating and this modal isn't
  // claiming leaderboard rank, just "of rated builds" generally.
  const topPercent =
    activeBuild?.ai_rating_score != null
      ? computeTopPercent(activeBuild.ai_rating_score, await listAllRatingScores(supabase))
      : null;
  const ratingHistory = activeBuild ? await listBuildRatingHistory(supabase, activeBuild.id) : [];
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
          await listAllRatingScores(supabase, await listVerifiedVehicleIds(supabase)),
        )
      : null;

  const heroUrl = heroMedia
    ? publicMediaUrl(supabase, heroMedia.storage_path)
    : null;

  const title = vehicle.nickname || `${vehicle.make} ${vehicle.model}`;

  return (
    <div className="flex-1 pb-16">
      <RankFrame score={activeBuild?.ai_rating_score ?? null}>
        <div className="relative aspect-[16/10] w-full bg-surface sm:aspect-[21/9]">
          {heroUrl ? (
            <Image
              src={heroUrl}
              alt={title}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              No cover photo yet
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

          <div className="absolute right-4 top-4 sm:right-6">
            <VehicleShareButton vehicleId={vehicle.id} />
          </div>

          <div className="absolute inset-x-0 bottom-0 mx-auto flex w-full max-w-5xl items-end justify-between gap-4 px-4 py-6 sm:px-6">
            <div>
              {vehicle.year && (
                <p className="text-sm font-medium text-white/70">
                  {vehicle.year}
                </p>
              )}
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {title}
              </h1>
              {owner && (
                <Link
                  href={`/u/${owner.username}`}
                  className="mt-1 inline-block text-sm text-white/70 hover:text-white"
                >
                  @{owner.username}
                </Link>
              )}
            </div>
          </div>
        </div>
      </RankFrame>

      <div className="mx-auto w-full max-w-5xl px-4 pt-6 sm:px-6">
        {!isOwner && user && (
          <div className="mb-4 flex justify-end">
            <ReportButton targetType="vehicle" targetId={vehicle.id} />
          </div>
        )}

        {isOwner && (
          <div className="mb-6 flex flex-col gap-4">
            <OwnershipVerification
              vehicleId={vehicle.id}
              userId={vehicle.owner_id}
              status={vehicle.ownership_verification_status}
            />
            <RateBuildPanel
              vehicleId={vehicle.id}
              currentScore={activeBuild?.ai_rating_score ?? null}
              currentStrengths={activeBuild?.ai_rating_strengths ?? null}
              currentLimitingFactors={activeBuild?.ai_rating_limiting_factors ?? null}
              currentSubscores={currentSubscores}
              topPercent={topPercent}
              ratingHistory={ratingHistory}
              rankPosition={rankPosition}
            />
          </div>
        )}

        {!isOwner && activeBuild?.ai_rating_score != null && (
          <div className="mb-6 glass-raised rounded-3xl p-6">
            {(() => {
              const tier = rankForScore(activeBuild.ai_rating_score!);
              const Icon = RANK_MATERIAL_ICONS[tier];
              return (
                <>
                  <RatingBreakdownTrigger
                    score={activeBuild.ai_rating_score!}
                    subscores={currentSubscores}
                    topPercent={topPercent}
                    history={ratingHistory}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
                        style={{ backgroundColor: `${RANK_TEXT_COLORS[tier]}26` }}
                      >
                        <Icon className="h-9 w-9" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted">
                          Build rating
                        </p>
                        <p
                          className="truncate text-xl font-bold tracking-tight"
                          style={{ color: RANK_TEXT_COLORS[tier] }}
                        >
                          {RANK_LABELS[tier]} · {activeBuild.ai_rating_score!.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </RatingBreakdownTrigger>
                  {(activeBuild.ai_rating_strengths || activeBuild.ai_rating_summary) && (
                    <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
                      {activeBuild.ai_rating_strengths ? (
                        <>
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-muted">
                              Why this score
                            </p>
                            <p className="mt-1 text-sm text-muted">{activeBuild.ai_rating_strengths}</p>
                          </div>
                          {activeBuild.ai_rating_limiting_factors && (
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                                What&apos;s holding it back
                              </p>
                              <p className="mt-1 text-sm text-muted">
                                {activeBuild.ai_rating_limiting_factors}
                              </p>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-muted">{activeBuild.ai_rating_summary}</p>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {!isOwner && user && buildParts.length > 0 && (
          <div className="mb-6">
            <CopyBuildButton
              sourceVehicleId={vehicle.id}
              myVehicles={await listVehiclesByOwner(supabase, user.id)}
            />
          </div>
        )}

        <VehicleSpecs vehicle={vehicle} />

        {vehicle.description && (
          <p className="mt-6 max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {vehicle.description}
          </p>
        )}

        {isOwner && (
          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-6">
            <CoverPhotoUploader
              vehicleId={vehicle.id}
              userId={user!.id}
              hasPhoto={Boolean(vehicle.hero_media_id)}
            />
            <Link href={`/garage/${vehicle.id}/edit`}>
              <Button variant="ghost" className="px-3 py-1.5 text-sm">
                Edit details
              </Button>
            </Link>
            <Link href="/tools/fitment">
              <Button variant="ghost" className="px-3 py-1.5 text-sm">
                Fitment calculator
              </Button>
            </Link>
            <DeleteVehicleButton vehicleId={vehicle.id} />
          </div>
        )}

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
      </div>
    </div>
  );
}
