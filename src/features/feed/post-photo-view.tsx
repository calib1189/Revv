"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { HotspotLayer, type HotspotWithInfo } from "@/features/feed/hotspot-layer";
import type { BuildPart } from "@/lib/db/build-parts";

export interface PhotoWithHotspots {
  mediaId: string;
  url: string;
  hotspots: HotspotWithInfo[];
}

export function PostPhotoView({
  postId,
  photos,
  isOwner,
  canTag,
  availableParts,
}: {
  postId: string;
  photos: PhotoWithHotspots[];
  isOwner: boolean;
  canTag: boolean;
  availableParts: BuildPart[];
}) {
  const [isTagging, setIsTagging] = useState(false);
  const [index, setIndex] = useState(0);

  if (photos.length === 0) return null;

  return (
    <div>
      <div
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.clientWidth === 0) return;
          setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {photos.map((photo, i) => (
          <div
            key={photo.mediaId}
            className="relative aspect-square w-full flex-shrink-0 snap-center bg-surface"
          >
            <Image
              src={photo.url}
              alt=""
              fill
              sizes="(min-width: 640px) 600px, 100vw"
              priority={i === 0}
              className="object-cover"
            />
            <HotspotLayer
              postId={postId}
              mediaId={photo.mediaId}
              hotspots={photo.hotspots}
              isOwner={isOwner}
              isTagging={isTagging}
              availableParts={availableParts}
            />
          </div>
        ))}
      </div>

      {photos.length > 1 && (
        <div className="flex justify-center gap-1 py-2">
          {photos.map((photo, i) => (
            <span
              key={photo.mediaId}
              className={`h-1.5 w-1.5 rounded-full ${i === index ? "bg-foreground" : "bg-border"}`}
            />
          ))}
        </div>
      )}

      {canTag && (
        <div className="px-4 pb-2 pt-1">
          <Button
            type="button"
            variant={isTagging ? "primary" : "secondary"}
            className="px-3 py-1.5 text-sm"
            onClick={() => setIsTagging((v) => !v)}
          >
            {isTagging ? "Done tagging" : "Tag parts"}
          </Button>
          {isTagging && (
            <p className="mt-1.5 text-xs text-muted">
              Tap anywhere on the photo to tag a mod.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
