"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { removeVehicleMedia } from "@/lib/db/vehicle-media";
import { TrashIcon } from "@/components/ui/icons";
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
}: {
  photos: GalleryPhoto[];
  isOwner: boolean;
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
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

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((photo, i) => {
          const confirming = confirmingId === photo.vehicleMediaId;
          const removing = removingId === photo.vehicleMediaId;
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
