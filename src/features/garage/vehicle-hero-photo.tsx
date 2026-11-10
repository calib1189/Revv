"use client";

import { useState } from "react";
import Image from "next/image";
import { PhotoViewer } from "@/components/ui/photo-viewer";

/** The car page's cover photo. Tapping it opens it full screen, with the
 * rest of the car's gallery a swipe away. */
export function VehicleHeroPhoto({ url, title, galleryUrls }: { url: string; title: string; galleryUrls: string[] }) {
  const [open, setOpen] = useState(false);
  const photos = [url, ...galleryUrls.filter((g) => g !== url)].map((u) => ({ url: u, alt: title }));
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`View ${title} full screen`} className="absolute inset-0">
        <Image src={url} alt={title} fill priority sizes="100vw" className="object-cover" />
      </button>
      {open && <PhotoViewer photos={photos} startIndex={0} onClose={() => setOpen(false)} />}
    </>
  );
}
