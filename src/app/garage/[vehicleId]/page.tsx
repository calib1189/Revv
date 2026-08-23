import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getVehicleById } from "@/lib/db/vehicles";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getMediaById, publicMediaUrl } from "@/lib/db/media";
import { listVehicleMedia } from "@/lib/db/vehicle-media";
import { getActiveBuild } from "@/lib/db/builds";
import { listBuildParts } from "@/lib/db/build-parts";
import { getPartsByIds } from "@/lib/db/parts";
import { VehicleSpecs } from "@/features/garage/vehicle-specs";
import { CoverPhotoUploader } from "@/features/garage/cover-photo-uploader";
import { GalleryUploader } from "@/features/garage/gallery-uploader";
import { GalleryGrid } from "@/features/garage/gallery-grid";
import { DeleteVehicleButton } from "@/features/garage/delete-vehicle-button";
import { ModificationList } from "@/features/builds/modification-list";
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
}: {
  params: Promise<{ vehicleId: string }>;
}) {
  const { vehicleId } = await params;
  const supabase = await createClient();

  const [vehicle, user] = await Promise.all([
    getVehicleById(supabase, vehicleId),
    getCurrentUser(),
  ]);
  if (!vehicle) notFound();

  const [owner, gallery, heroMedia, activeBuild] = await Promise.all([
    getProfileByUserId(supabase, vehicle.owner_id),
    listVehicleMedia(supabase, vehicleId),
    vehicle.hero_media_id
      ? getMediaById(supabase, vehicle.hero_media_id)
      : Promise.resolve(null),
    getActiveBuild(supabase, vehicleId),
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

  const isOwner = user?.id === vehicle.owner_id;
  const heroUrl = heroMedia
    ? publicMediaUrl(supabase, heroMedia.storage_path)
    : null;

  const title = vehicle.nickname || `${vehicle.make} ${vehicle.model}`;

  return (
    <div className="flex-1 pb-16">
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

      <div className="mx-auto w-full max-w-5xl px-4 pt-6 sm:px-6">
        {isOwner && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <CoverPhotoUploader
              vehicleId={vehicle.id}
              userId={user!.id}
              hasPhoto={Boolean(vehicle.hero_media_id)}
            />
            <Link href={`/garage/${vehicle.id}/edit`}>
              <Button variant="secondary" className="px-3 py-1.5 text-sm">
                Edit details
              </Button>
            </Link>
            <Link href={`/garage/${vehicle.id}/visualize`}>
              <Button variant="secondary" className="px-3 py-1.5 text-sm">
                Visualize a mod
              </Button>
            </Link>
            <DeleteVehicleButton vehicleId={vehicle.id} />
          </div>
        )}

        <VehicleSpecs vehicle={vehicle} />

        {vehicle.description && (
          <p className="mt-6 max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {vehicle.description}
          </p>
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
          <ModificationList
            buildParts={buildParts}
            partsById={partsById}
            vehicleId={vehicle.id}
            isOwner={isOwner}
          />
        </div>
      </div>
    </div>
  );
}
