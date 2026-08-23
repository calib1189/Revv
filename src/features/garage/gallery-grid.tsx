"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { removeVehicleMedia } from "@/lib/db/vehicle-media";

export interface GalleryPhoto {
  vehicleMediaId: string;
  url: string;
}

export function GalleryGrid({
  photos,
  isOwner,
}: {
  photos: GalleryPhoto[];
  isOwner: boolean;
}) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const router = useRouter();

  if (photos.length === 0) return null;

  async function handleRemove(vehicleMediaId: string) {
    setRemovingId(vehicleMediaId);
    try {
      const supabase = createClient();
      await removeVehicleMedia(supabase, vehicleMediaId);
      router.refresh();
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {photos.map((photo) => (
        <div
          key={photo.vehicleMediaId}
          className="group relative aspect-square overflow-hidden rounded-xl bg-surface"
        >
          <Image
            src={photo.url}
            alt=""
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover"
          />
          {isOwner && (
            <button
              type="button"
              disabled={removingId === photo.vehicleMediaId}
              onClick={() => handleRemove(photo.vehicleMediaId)}
              aria-label="Remove photo"
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-50"
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
