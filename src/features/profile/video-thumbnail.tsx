"use client";

import { useRef } from "react";

/** A bare <video preload="metadata"> reliably loads duration/dimensions,
 * but several browsers (mobile Safari especially) never actually decode
 * and paint a visible frame until playback starts — which is exactly why
 * "no thumbnails for any of the videos" showed up as a blank/black box
 * instead of a frame from the clip. Seeking to a tiny offset once
 * metadata is ready forces the browser to decode and paint that frame,
 * which then just sits there as a real poster image — without
 * downloading the whole file the way preload="auto" would for every
 * video in a grid. */
export function VideoThumbnail({ url, className }: { url: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <video
      ref={videoRef}
      src={url}
      muted
      playsInline
      preload="metadata"
      onLoadedMetadata={(e) => {
        const video = e.currentTarget;
        video.currentTime = Math.min(0.1, video.duration / 2 || 0.1);
      }}
      className={className}
    />
  );
}
