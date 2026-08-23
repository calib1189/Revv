"use client";

import { useRef, useState } from "react";
import Image from "next/image";

export interface CarouselPhoto {
  url: string;
}

export function PhotoCarousel({ photos }: { photos: CarouselPhoto[] }) {
  const [index, setIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  function handleScroll() {
    const el = containerRef.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  if (photos.length === 0) return null;

  return (
    <div className="relative">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
      >
        {photos.map((photo, i) => (
          <div
            key={i}
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
          </div>
        ))}
      </div>

      {photos.length > 1 && (
        <div className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
          {index + 1}/{photos.length}
        </div>
      )}
    </div>
  );
}
