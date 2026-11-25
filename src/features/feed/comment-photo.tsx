"use client";

import { useState } from "react";
import { MediaImg } from "@/components/ui/media-img";
import { PhotoViewer } from "@/components/ui/photo-viewer";
import type { CommentPhoto as CommentPhotoData } from "@/lib/db/comment-photos";

/** A photo posted in a comment: its own shape (kept between square-ish
 * and tall, so one photo can't take over the thread), resized for its
 * small size, and full screen on a tap. */
export function CommentPhoto({ photo, alt }: { photo: CommentPhotoData; alt: string }) {
  const [open, setOpen] = useState(false);
  const ratio = photo.width && photo.height ? Math.min(1.6, Math.max(0.62, photo.width / photo.height)) : 0.8;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="View photo"
        className="pressable relative mt-1.5 block w-[min(220px,70%)] overflow-hidden rounded-2xl bg-foreground/[0.06]"
        style={{ aspectRatio: String(ratio) }}
      >
        <MediaImg src={photo.url} sizes="220px" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      </button>
      {open && <PhotoViewer photos={[{ url: photo.url, alt }]} startIndex={0} onClose={() => setOpen(false)} />}
    </>
  );
}
