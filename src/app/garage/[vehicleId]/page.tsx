import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getVehicleById } from "@/lib/db/vehicles";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getMediaById, getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { listVehicleMedia } from "@/lib/db/vehicle-media";
import { getActiveBuild } from "@/lib/db/builds";
import { listBuildParts } from "@/lib/db/build-parts";
import { getPartsByIds } from "@/lib/db/parts";
import { listVehiclesByOwner } from "@/lib/db/vehicles";
import { VehicleSpecs } from "@/features/garage/vehicle-specs";
import { CoverPhotoUploader } from "@/features/garage/cover-photo-uploader";
import { GalleryUploader } from "@/features/garage/gallery-uploader";
import { GalleryGrid } from "@/features/garage/gallery-grid";
import { DeleteVehicleButton } from "@/features/garage/delete-vehicle-button";
import { ReportButton } from "@/features/feed/report-button";
import { OwnershipVerification } from "@/features/garage/ownership-verification";
import { VehicleShareButton } from "@/features/garage/vehicle-share-button";
import { ModificationList } from "@/features/builds/modification-list";
import { RankFrame } from "@/features/garage/rank-frame";
import { RateBuildPanel } from "@/features/garage/rate-build-panel";
import { rankForScore, RANK_LABELS, RANK_TEXT_COLORS } from "@/lib/rating/rank";
import { RANK_MATERIAL_ICONS } from "@/features/garage/rank-material-icons";
import { CopyBuildButton } from "@/features/builds/copy-build-button";
import { BudgetCard } from "@/features/builds/budget-card";
import { calculateBudgetSummary } from "@/lib/builds/budget";
import { listMaintenanceForVehicle } from "@/lib/db/maintenance";
import { recordVehicleView } from "@/lib/db/vehicle-views";
import { MaintenanceList } from "@/features/maintenance/maintenance-list";
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

  const maintenanceRecords = isOwner
    ? await listMaintenanceForVehicle(supabase, vehicleId)
    : [];
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

        <div className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Photos</h2>
            {isOwner && (
              <GalleryUploader
                vehicleId={vehicle.id}
                userId={user!.id}
                nextPosition={gallery.length}
              />
            )}
          </div>

          <GalleryGrid
            photos={gallery.map((g) => ({
              vehicleMediaId: g.id,
              url: publicMediaUrl(supabase, g.media.storage_path),
            }))}
            isOwner={isOwner}
          />

          {gallery.length === 0 && (
            <p className="text-sm text-muted">No photos in the gallery yet.</p>
          )}
        </div>

        <div className="mt-10">
          <BudgetCard
            summary={calculateBudgetSummary(
              buildParts,
              activeBuild?.budget_cents ?? null,
            )}
            vehicleId={vehicle.id}
            isOwner={isOwner}
          />
        </div>

        <div className="mt-10">
          <ModificationList
            buildParts={buildParts}
            partsById={partsById}
            partMediaUrlById={partMediaUrlById}
            vehicleId={vehicle.id}
            vehicleLabel={[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")}
            userId={user?.id ?? null}
            isOwner={isOwner}
          />
        </div>

        {isOwner && (
          <div className="mt-10">
            <MaintenanceList
              records={maintenanceRecords}
              vehicleId={vehicle.id}
              isOwner={isOwner}
            />
          </div>
        )}
      </div>
    </div>
  );
}
