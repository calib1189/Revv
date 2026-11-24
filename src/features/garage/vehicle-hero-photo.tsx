"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { PhotoViewer } from "@/components/ui/photo-viewer";

/** The car page's cover photo, and every other photo of the car a swipe
 * away: swipe sideways through them right there, with a bar per photo
 * along the top, and tap one to open it full screen. The cover loads
 * first; the rest load as you swipe toward them. On the cover, a swipe
 * right still goes back a page (lib/native/swipe-back: a strip already
 * at its start has nowhere to scroll). */
export function VehicleHeroPhoto({ url, title, galleryUrls }: { url: string; title: string; galleryUrls: string[] }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const stripRef = useRef<HTMLDivElement>(null);
  const photos = [url, ...galleryUrls.filter((g) => g !== url)].map((u) => ({ url: u, alt: title }));
  const many = photos.length > 1;

  function onScroll() {
    const strip = stripRef.current;
    if (!strip || strip.clientWidth === 0) return;
    const next = Math.round(strip.scrollLeft / strip.clientWidth);
    if (next !== index) setIndex(Math.max(0, Math.min(photos.length - 1, next)));
  }

  return (
    <>
      <div
        ref={stripRef}
        onScroll={many ? onScroll : undefined}
        className={`absolute inset-0 flex ${many ? "no-scrollbar snap-x snap-mandatory overflow-x-auto overscroll-x-contain" : ""}`}
      >
        {photos.map((photo, i) => (
          <button
            key={`${photo.url}-${i}`}
            type="button"
            onClick={() => setOpen(true)}
            aria-label={many ? `View photo ${i + 1} of ${photos.length} full screen` : `View ${title} full screen`}
            className="relative h-full w-full flex-shrink-0 snap-center snap-always"
          >
            <Image
              src={photo.url}
              alt={i === 0 ? title : `${title}, photo ${i + 1}`}
              fill
              priority={i === 0}
              sizes="100vw"
              className="object-cover"
            />
          </button>
        ))}
      </div>
      {many && (
        <div
          className="pointer-events-none absolute inset-x-4 top-2.5 z-[1] flex gap-1 sm:inset-x-6"
          aria-label={`Photo ${index + 1} of ${photos.length}`}
          role="img"
        >
          {photos.map((photo, i) => (
            <span
              key={`${photo.url}-${i}`}
              className={`h-[3px] flex-1 rounded-full transition-colors duration-200 ${
                i === index ? "bg-white" : "bg-white/35"
              }`}
            />
          ))}
        </div>
      )}
      {open && <PhotoViewer photos={photos} startIndex={index} onClose={() => setOpen(false)} />}
    </>
  );
}
