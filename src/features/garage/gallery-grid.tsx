"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { moveVehicleMediaToFront, removeVehicleMedia } from "@/lib/db/vehicle-media";
import { CheckIcon, TrashIcon } from "@/components/ui/icons";
import { PhotoViewer } from "@/components/ui/photo-viewer";

export interface GalleryPhoto {
  vehicleMediaId: string;
  url: string;
}

// How long the "Delete?" confirmation waits for the second tap.
const CONFIRM_MS = 4000;

export function GalleryGrid({
  photos,
  isOwner,
  vehicleId,
  ratedIds = [],
  hasCover = false,
}: {
  photos: GalleryPhoto[];
  isOwner: boolean;
  vehicleId: string;
  /** Gallery rows the AI looks at when this build is rated, from
   * lib/rating/rated-photos.ts. Only marked for the owner. */
  ratedIds?: string[];
  hasCover?: boolean;
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const rated = new Set(ratedIds);
  // Hidden as soon as the delete succeeds, before the refresh lands, so the
  // photo doesn't sit there looking undeleted.
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  // Which photo is open full screen, by its place in `visible`.
  const [viewing, setViewing] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!confirmingId) return;
    const timer = setTimeout(() => setConfirmingId(null), CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [confirmingId]);

  const visible = photos.filter((p) => !removedIds.has(p.vehicleMediaId));
  if (visible.length === 0) return null;

  async function handleRemove(vehicleMediaId: string) {
    setError(null);
    setConfirmingId(null);
    setRemovingId(vehicleMediaId);
    try {
      await removeVehicleMedia(createClient(), vehicleMediaId);
      setRemovedIds((prev) => new Set(prev).add(vehicleMediaId));
      router.refresh();
    } catch {
      setError("Couldn't delete that photo. Check your connection and try again.");
    } finally {
      setRemovingId(null);
    }
  }

  async function handleUseForRating(vehicleMediaId: string) {
    setError(null);
    setMovingId(vehicleMediaId);
    try {
      await moveVehicleMediaToFront(createClient(), vehicleId, vehicleMediaId);
      router.refresh();
    } catch {
      setError("Couldn't move that photo. Check your connection and try again.");
    } finally {
      setMovingId(null);
    }
  }

  const ratedCount = visible.filter((p) => rated.has(p.vehicleMediaId)).length;
  const someLeftOut = ratedCount < visible.length;

  return (
    <div className="flex flex-col gap-3">
      {isOwner && ratedCount > 0 && (
        <p className="px-1 text-[0.8125rem] leading-relaxed text-muted">
          {hasCover ? "The AI rates your cover photo and the " : "The AI rates the "}
          {ratedCount === 1 ? "photo" : `${ratedCount} photos`} marked{" "}
          <span className="font-semibold text-foreground">Rated</span>.
          {someLeftOut && " Tap Use for rating to swap one in, then re-rate."}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((photo, i) => {
          const confirming = confirmingId === photo.vehicleMediaId;
          const removing = removingId === photo.vehicleMediaId;
          const moving = movingId === photo.vehicleMediaId;
          const isRated = rated.has(photo.vehicleMediaId);
          return (
            <div
              key={photo.vehicleMediaId}
              className="relative aspect-square overflow-hidden rounded-xl bg-surface"
            >
              <button
                type="button"
                onClick={() => setViewing(i)}
                aria-label={`View photo ${i + 1} full screen`}
                className="absolute inset-0"
              >
                <Image
                  src={photo.url}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                  className={`object-cover transition-opacity ${removing ? "opacity-40" : ""}`}
                />
              </button>
              {isOwner && (
                // Always visible: phones have no hover, which is what hid
                // this button before. Two taps, so a stray one can't
                // delete a photo.
                <button
                  type="button"
                  disabled={removing}
                  onClick={() =>
                    confirming ? void handleRemove(photo.vehicleMediaId) : setConfirmingId(photo.vehicleMediaId)
                  }
                  aria-label={confirming ? "Tap again to delete this photo" : "Delete photo"}
                  className={`absolute right-2 top-2 flex h-9 items-center justify-center gap-1.5 rounded-full text-white backdrop-blur-md transition-all disabled:opacity-60 ${
                    confirming ? "bg-danger px-3.5 text-sm font-semibold" : "w-9 bg-black/60"
                  }`}
                >
                  <TrashIcon className="h-4 w-4" />
                  {removing ? "Deleting…" : confirming ? "Delete?" : null}
                </button>
              )}
              {isOwner && isRated && (
                <span className="pointer-events-none absolute left-2 top-2 flex h-7 items-center gap-1 rounded-full bg-black/60 pl-2 pr-2.5 text-[0.75rem] font-semibold text-white backdrop-blur-md">
                  <CheckIcon className="h-3.5 w-3.5" />
                  Rated
                </span>
              )}
              {isOwner && !isRated && ratedCount > 0 && (
                <button
                  type="button"
                  disabled={moving || movingId !== null}
                  onClick={() => void handleUseForRating(photo.vehicleMediaId)}
                  className="absolute bottom-2 left-2 flex h-8 items-center rounded-full bg-black/60 px-3 text-[0.75rem] font-semibold text-white backdrop-blur-md transition-opacity active:scale-95 disabled:opacity-60"
                >
                  {moving ? "Moving…" : "Use for rating"}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {viewing !== null && (
        <PhotoViewer photos={visible.map((p) => ({ url: p.url }))} startIndex={viewing} onClose={() => setViewing(null)} />
      )}
    </div>
  );
}
